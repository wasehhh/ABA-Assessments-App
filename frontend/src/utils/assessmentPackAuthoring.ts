import {
    ContentPackData,
    Domain,
    PackScoringMode,
    StructureLabels,
    Target,
    TargetScoring,
} from '../types';
import {
    getOversizedGroupWarning,
    OversizedGroupWarning,
    resolveTargetScoring,
} from './assessmentPackStructure';
import { isCompleteAuthoredScoring } from './assessmentPackCanonical';
import { denseTargetScoring } from './targetScoringAccess';

export {
    OVERSIZED_GROUP_EXTREME_THRESHOLD,
    OVERSIZED_GROUP_LARGE_THRESHOLD,
} from './assessmentPackStructure';

export const OVERSIZED_WARNING_ADVICE =
    'Large groupings may reduce readability in exports. Consider using secondary groups.';

export interface PackGroupWarning extends OversizedGroupWarning {
    domainId: string;
    domainTitle: string;
    tier: 'primary' | 'secondary';
    secondaryGroupId?: string;
    secondaryGroupTitle?: string;
}

/** Complete numeric token: integers, decimals, negatives. Rejects NaN/Infinity/malformed. */
const COMPLETE_NUMERIC_TOKEN =
    /^-?(?:(?:0|[1-9]\d*)(?:\.\d+)?|\.\d+)$/;

export type NumericScaleCommitResult =
    | { ok: true; values: number[] }
    | { ok: false; error: string };

/** Format canonical scale values for display / draft seeding. Preserves decimals; no rounding. */
export function formatNumericScale(values: number[]): string {
    return values.map(String).join(',');
}

/**
 * Commit a numeric-scale CSV string to canonical number[].
 * Rejects empty entries, non-numeric tokens, duplicates, NaN/Infinity, and trailing commas.
 * Does not silently drop invalid tokens.
 */
export function commitNumericScaleCsv(input: string): NumericScaleCommitResult {
    const trimmed = input.trim();
    if (!trimmed) {
        return {
            ok: false,
            error: 'Enter numeric values separated by commas.',
        };
    }

    const parts = trimmed.split(',');
    const values: number[] = [];
    const seen = new Set<number>();

    for (let index = 0; index < parts.length; index++) {
        const raw = parts[index];
        const token = raw.trim();

        if (!token) {
            if (index === parts.length - 1) {
                return {
                    ok: false,
                    error: 'Remove the trailing comma or finish the last score value.',
                };
            }
            return {
                ok: false,
                error: 'Score lists cannot include empty values. Remove extra commas.',
            };
        }

        if (!COMPLETE_NUMERIC_TOKEN.test(token)) {
            return {
                ok: false,
                error: `"${token}" is not a valid numeric score.`,
            };
        }

        const value = Number(token);
        if (!Number.isFinite(value)) {
            return {
                ok: false,
                error: `"${token}" is not a valid numeric score.`,
            };
        }

        if (seen.has(value)) {
            return {
                ok: false,
                error: 'Score values must be unique.',
            };
        }

        seen.add(value);
        values.push(value);
    }

    if (values.length === 0) {
        return {
            ok: false,
            error: 'Enter numeric values separated by commas.',
        };
    }

    return { ok: true, values };
}

/**
 * Parse CSV scale column e.g. "0,1,2,3,4".
 * Empty input returns fallback. Malformed input throws (no silent token dropping).
 */
export function parseNumericScaleCsv(
    input: string,
    fallback: number[] = [0, 1, 2, 3, 4]
): number[] {
    const trimmed = input.trim();
    if (!trimmed) {
        return [...fallback];
    }

    const result = commitNumericScaleCsv(trimmed);
    if (!result.ok) {
        throw new Error(result.error);
    }

    return result.values;
}

/**
 * Keep labels for score values that remain on the scale; drop stale mappings.
 * Does not remap labels across different score values.
 */
export function reconcileScaleLabels(
    scale: number[],
    previousLabels: Record<number, string> | undefined
): Record<number, string> {
    const next: Record<number, string> = {};
    if (!previousLabels) {
        return next;
    }

    for (const value of scale) {
        const label = previousLabels[value];
        if (label !== undefined) {
            next[value] = label;
        }
    }

    return next;
}

export type BuilderAuthoringIssueField =
    | 'domain_id'
    | 'target_id'
    | 'scale'
    | 'default_scale'
    | 'title';

export interface BuilderAuthoringIssue {
    message: string;
    field: BuilderAuthoringIssueField;
    domainIndex?: number;
    targetIndex?: number;
}

export interface ValidateBuilderAuthoringOptions {
    /**
     * Literal pack scoring mode. When omitted, uses `pack.scoring_mode`.
     * Prefer this over `useGlobalScale` for Builder saves.
     */
    scoringMode?: PackScoringMode;
    /**
     * Legacy checkbox alias: true → Uniform validation; false with no mode → dense
     * per-target checks (pre-B3 callers).
     */
    useGlobalScale?: boolean;
    defaultScaleCsv?: string;
}

function validateNumericScaleField(
    scale: number[] | undefined
): string | null {
    if (!scale || scale.length === 0) {
        return 'Enter numeric values separated by commas.';
    }
    const scaleResult = commitNumericScaleCsv(formatNumericScale(scale));
    return scaleResult.ok ? null : scaleResult.error;
}

/**
 * Identifier contract (Builder + CSV import):
 * - domain_id: required, non-whitespace, unique within the pack (after trim).
 * - target_id: required, non-whitespace, unique across the entire pack (not merely per domain).
 *   CSV import enforces the same pack-global target_id uniqueness.
 * Autogenerated Builder IDs use `${domain_id}${n}` and must avoid colliding with existing IDs.
 *
 * Scoring (PR B3):
 * - Uniform: complete `default_scoring` only; no per-target scales.
 * - Custom Inherited (no `target.scoring`): no per-target scale required.
 * - Custom Override: complete override required.
 * - Legacy dense (no mode): per-target numeric scales when not useGlobalScale.
 */
export function validateBuilderPackAuthoring(
    pack: ContentPackData,
    options: ValidateBuilderAuthoringOptions = {}
): BuilderAuthoringIssue[] {
    const issues: BuilderAuthoringIssue[] = [];
    const domainIds = new Map<string, number>();
    const targetIds = new Map<string, { domainIndex: number; targetIndex: number }>();

    if (!pack.title.trim()) {
        issues.push({
            field: 'title',
            message: 'Enter an assessment title.',
        });
    }

    const mode: PackScoringMode | undefined =
        options.scoringMode ?? pack.scoring_mode;
    const treatAsUniform =
        mode === 'uniform' || (mode === undefined && options.useGlobalScale === true);
    const treatAsCustom = mode === 'custom';
    const treatAsLegacyDense = !treatAsUniform && !treatAsCustom;

    if (treatAsUniform) {
        if (options.defaultScaleCsv !== undefined) {
            const scaleResult = commitNumericScaleCsv(options.defaultScaleCsv);
            if (!scaleResult.ok) {
                issues.push({
                    field: 'default_scale',
                    message: scaleResult.error,
                });
            }
        }
        if (pack.default_scoring) {
            if (!isCompleteAuthoredScoring(pack.default_scoring)) {
                issues.push({
                    field: 'default_scale',
                    message: 'Enter a complete pack default scoring definition.',
                });
            }
        } else if (options.defaultScaleCsv === undefined) {
            issues.push({
                field: 'default_scale',
                message: 'Enter a complete pack default scoring definition.',
            });
        }
    }

    pack.domains.forEach((domain, domainIndex) => {
        const domainId = domain.domain_id.trim();
        if (!domainId) {
            issues.push({
                field: 'domain_id',
                domainIndex,
                message: 'Enter a domain ID.',
            });
        } else if (domainIds.has(domainId)) {
            issues.push({
                field: 'domain_id',
                domainIndex,
                message: `Domain ID "${domainId}" is already used. Domain IDs must be unique.`,
            });
        } else {
            domainIds.set(domainId, domainIndex);
        }

        domain.targets.forEach((target, targetIndex) => {
            const targetId = target.target_id.trim();
            if (!targetId) {
                issues.push({
                    field: 'target_id',
                    domainIndex,
                    targetIndex,
                    message: 'Enter a target ID.',
                });
            } else if (targetIds.has(targetId)) {
                issues.push({
                    field: 'target_id',
                    domainIndex,
                    targetIndex,
                    message: `Target ID "${targetId}" is already used. Target IDs must be unique across the assessment.`,
                });
            } else {
                targetIds.set(targetId, { domainIndex, targetIndex });
            }

            if (treatAsUniform) {
                return;
            }

            if (treatAsCustom) {
                if (!target.scoring) {
                    return;
                }
                if (!isCompleteAuthoredScoring(target.scoring)) {
                    issues.push({
                        field: 'scale',
                        domainIndex,
                        targetIndex,
                        message:
                            target.scoring.type === 'numeric'
                                ? 'Enter numeric values separated by commas.'
                                : 'Enter a complete scoring override for this target.',
                    });
                    return;
                }
                if (target.scoring.type === 'numeric' && !target.scoring.scale_id) {
                    const scaleError = validateNumericScaleField(target.scoring.scale);
                    if (scaleError) {
                        issues.push({
                            field: 'scale',
                            domainIndex,
                            targetIndex,
                            message: scaleError,
                        });
                    }
                }
                return;
            }

            if (treatAsLegacyDense) {
                const targetScoring = denseTargetScoring(target);
                if (targetScoring.type === 'numeric') {
                    const scaleError = validateNumericScaleField(targetScoring.scale);
                    if (scaleError) {
                        issues.push({
                            field: 'scale',
                            domainIndex,
                            targetIndex,
                            message: scaleError,
                        });
                    }
                }
            }
        });
    });

    return issues;
}

/** Trim domain/target IDs for save. Call only after validation succeeds. */
export function normalizePackIdentifiers(pack: ContentPackData): ContentPackData {
    return {
        ...pack,
        domains: pack.domains.map((domain) => ({
            ...domain,
            domain_id: domain.domain_id.trim(),
            targets: domain.targets.map((target) => ({
                ...target,
                target_id: target.target_id.trim(),
            })),
        })),
    };
}

/**
 * Global-scale save behaviour (documented, unchanged):
 * applies global scale_labels to every target. Does not rewrite target.scoring.scale.
 * New targets snapshot defaultScale at creation time only.
 */
export function applyGlobalScaleLabels(
    domains: Domain[],
    globalScaleLabels: Record<number, string>
): Domain[] {
    return domains.map((domain) => ({
        ...domain,
        targets: domain.targets.map((target) => ({
            ...target,
            scoring: {
                ...denseTargetScoring(target),
                scale_labels: { ...globalScaleLabels },
            },
        })),
    }));
}

/** Parse CSV scale_labels column e.g. "0:Not Yet|1:Emerging|2:Mastered". */
export function parseScaleLabelsCsv(input: string): Record<number, string> {
    const trimmed = input.trim();
    if (!trimmed) {
        return {};
    }

    const labels: Record<number, string> = {};

    for (const segment of trimmed.split('|')) {
        const colonIndex = segment.indexOf(':');
        if (colonIndex === -1) {
            continue;
        }

        const key = parseFloat(segment.slice(0, colonIndex).trim());
        const label = segment.slice(colonIndex + 1).trim();
        if (!Number.isNaN(key) && label) {
            labels[key] = label;
        }
    }

    return labels;
}

export function isSecondaryGroupingEnabled(
    structureLabels: StructureLabels | undefined
): boolean {
    return Boolean(structureLabels?.secondary_group?.trim());
}

export const ALPHA_DEFAULT_PRIMARY_LABEL = 'Domain';
export const ALPHA_DEFAULT_TARGET_LABEL = 'Target';
export const LEGACY_SECONDARY_SUBGROUP_LABEL = 'Subgroup';
export const NEUTRAL_DEFAULT_PRIMARY_LABEL = 'Primary Group';
export const NEUTRAL_DEFAULT_SECONDARY_LABEL = 'Secondary Group';
export const NEUTRAL_DEFAULT_TARGET_LABEL = 'Target';

export interface StructureLabelFields {
    primaryGroup: string;
    secondaryGroup: string;
    target: string;
}

function isBlankOrLegacySecondary(value: string): boolean {
    const trimmed = value.trim();
    return trimmed === '' || trimmed === LEGACY_SECONDARY_SUBGROUP_LABEL;
}

export function isAlphaFlatStructureLabelDefaults(fields: StructureLabelFields): boolean {
    return (
        fields.primaryGroup.trim() === ALPHA_DEFAULT_PRIMARY_LABEL &&
        fields.target.trim() === ALPHA_DEFAULT_TARGET_LABEL &&
        isBlankOrLegacySecondary(fields.secondaryGroup)
    );
}

export function isNeutralStructureLabelDefaults(fields: StructureLabelFields): boolean {
    const secondary = fields.secondaryGroup.trim();
    return (
        fields.primaryGroup.trim() === NEUTRAL_DEFAULT_PRIMARY_LABEL &&
        fields.target.trim() === NEUTRAL_DEFAULT_TARGET_LABEL &&
        (secondary === '' ||
            secondary === LEGACY_SECONDARY_SUBGROUP_LABEL ||
            secondary === NEUTRAL_DEFAULT_SECONDARY_LABEL)
    );
}

/** Apply neutral three-level defaults when enabling secondary grouping from Alpha defaults. */
export function applySecondaryGroupingEnabled(
    fields: StructureLabelFields
): StructureLabelFields {
    if (isAlphaFlatStructureLabelDefaults(fields)) {
        return {
            primaryGroup: NEUTRAL_DEFAULT_PRIMARY_LABEL,
            secondaryGroup: NEUTRAL_DEFAULT_SECONDARY_LABEL,
            target: NEUTRAL_DEFAULT_TARGET_LABEL,
        };
    }

    return {
        ...fields,
        secondaryGroup: fields.secondaryGroup.trim() || NEUTRAL_DEFAULT_SECONDARY_LABEL,
    };
}

/** Revert to Alpha flat defaults when disabling from neutral two-level defaults. */
export function applySecondaryGroupingDisabled(
    fields: StructureLabelFields
): StructureLabelFields {
    const next: StructureLabelFields = {
        primaryGroup: fields.primaryGroup,
        secondaryGroup: '',
        target: fields.target,
    };

    if (isNeutralStructureLabelDefaults(fields)) {
        next.primaryGroup = ALPHA_DEFAULT_PRIMARY_LABEL;
    }

    return next;
}

export function buildPackStructureLabels(
    primaryGroup: string,
    target: string,
    secondaryGroup: string,
    secondaryEnabled: boolean
): StructureLabels | undefined {
    const primary = primaryGroup.trim() || 'Domain';
    const targetLabel = target.trim() || 'Target';

    if (!secondaryEnabled) {
        if (primary === 'Domain' && targetLabel === 'Target') {
            return undefined;
        }

        return {
            primary_group: primary,
            target: targetLabel,
        };
    }

    const secondary = secondaryGroup.trim() || NEUTRAL_DEFAULT_SECONDARY_LABEL;

    return {
        primary_group: primary,
        secondary_group: secondary,
        target: targetLabel,
    };
}

function materializeTargetScoring(
    target: Target,
    pack: ContentPackData
): TargetScoring {
    const resolved = resolveTargetScoring(target, pack);

    return {
        type: resolved.type,
        ...(resolved.scale_id ? { scale_id: resolved.scale_id } : {}),
        ...(resolved.scale !== undefined ? { scale: [...resolved.scale] } : {}),
        scale_labels: { ...resolved.scale_labels },
        ...(resolved.task_steps !== undefined
            ? { task_steps: [...resolved.task_steps] }
            : {}),
        no_opportunity_allowed: resolved.no_opportunity_allowed,
    };
}

function stripSecondaryGrouping(domain: Domain): Domain {
    return {
        ...domain,
        secondary_groups: undefined,
        targets: domain.targets.map((target) => {
            const { secondary_group_id: _removed, ...rest } = target;
            return rest;
        }),
    };
}

/** Removes pack-level scale library references for Builder-authored saves. */
export function stripPackScoringScaleReferences(pack: ContentPackData): ContentPackData {
    return {
        ...pack,
        scoring_scales: undefined,
        domains: pack.domains.map((domain) => ({
            ...domain,
            targets: domain.targets.map((target) => {
                const { scale_id: _removed, ...scoring } = denseTargetScoring(target);
                return { ...target, scoring };
            }),
        })),
    };
}

/** Builder save path: normalize IDs, inline scoring only, then Alpha-safe materialization. */
export function prepareBuilderPackForSave(pack: ContentPackData): ContentPackData {
    return materializePackForSave(
        stripPackScoringScaleReferences(normalizePackIdentifiers(pack))
    );
}

/**
 * Materializes resolved scoring onto every target for Alpha-safe persistence.
 * Preserves scale_id when selected. Never mutates the input pack.
 */
export function materializePackForSave(pack: ContentPackData): ContentPackData {
    const secondaryEnabled = isSecondaryGroupingEnabled(pack.structure_labels);

    const domains = (secondaryEnabled ? pack.domains : pack.domains.map(stripSecondaryGrouping)).map(
        (domain) => ({
            ...domain,
            targets: domain.targets.map((target) => ({
                ...target,
                scoring: materializeTargetScoring(target, pack),
            })),
        })
    );

    const result: ContentPackData = {
        ...pack,
        domains,
    };

    if (!secondaryEnabled) {
        result.structure_labels = pack.structure_labels
            ? {
                  primary_group: pack.structure_labels.primary_group,
                  target: pack.structure_labels.target,
              }
            : undefined;
    }

    if (!pack.scoring_scales?.length) {
        const { scoring_scales: _removed, ...withoutScales } = result;
        return withoutScales as ContentPackData;
    }

    return result;
}

/** Non-blocking oversized group warnings for Builder and import validation. */
export function collectPackOversizedWarnings(pack: ContentPackData): PackGroupWarning[] {
    const warnings: PackGroupWarning[] = [];

    for (const domain of pack.domains) {
        const primaryWarning = getOversizedGroupWarning(domain.targets.length);
        if (primaryWarning) {
            warnings.push({
                ...primaryWarning,
                message: OVERSIZED_WARNING_ADVICE,
                domainId: domain.domain_id,
                domainTitle: domain.title,
                tier: 'primary',
            });
        }

        const countsBySecondary = new Map<string, number>();
        for (const target of domain.targets) {
            if (!target.secondary_group_id) {
                continue;
            }
            countsBySecondary.set(
                target.secondary_group_id,
                (countsBySecondary.get(target.secondary_group_id) ?? 0) + 1
            );
        }

        const titleById = new Map(
            (domain.secondary_groups ?? []).map((entry) => [
                entry.secondary_group_id,
                entry.title,
            ])
        );

        for (const [secondaryGroupId, count] of countsBySecondary) {
            const secondaryWarning = getOversizedGroupWarning(count);
            if (!secondaryWarning) {
                continue;
            }

            warnings.push({
                ...secondaryWarning,
                message: OVERSIZED_WARNING_ADVICE,
                domainId: domain.domain_id,
                domainTitle: domain.title,
                tier: 'secondary',
                secondaryGroupId,
                secondaryGroupTitle: titleById.get(secondaryGroupId) ?? secondaryGroupId,
            });
        }
    }

    return warnings;
}
