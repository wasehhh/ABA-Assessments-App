import {
    ContentPackData,
    Domain,
    ScoringScaleDefinition,
    StructureLabels,
    Target,
    TargetScoring,
} from '../types';
import {
    getOversizedGroupWarning,
    OVERSIZED_GROUP_EXTREME_THRESHOLD,
    OVERSIZED_GROUP_LARGE_THRESHOLD,
    OversizedGroupWarning,
    resolveTargetScoring,
} from './assessmentPackStructure';

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

/** Parse CSV scale column e.g. "0,1,2,3,4". */
export function parseNumericScaleCsv(
    input: string,
    fallback: number[] = [0, 1, 2, 3, 4]
): number[] {
    const trimmed = input.trim();
    if (!trimmed) {
        return [...fallback];
    }

    const values = trimmed
        .split(',')
        .map((part) => parseFloat(part.trim()))
        .filter((value) => !Number.isNaN(value));

    return values.length > 0 ? values : [...fallback];
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
                const { scale_id: _removed, ...scoring } = target.scoring;
                return { ...target, scoring };
            }),
        })),
    };
}

/** Builder save path: inline scoring only, then Alpha-safe materialization. */
export function prepareBuilderPackForSave(pack: ContentPackData): ContentPackData {
    return materializePackForSave(stripPackScoringScaleReferences(pack));
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
