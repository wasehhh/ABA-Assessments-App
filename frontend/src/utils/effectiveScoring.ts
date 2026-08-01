import {
    ContentPackData,
    PackDefaultScoring,
    PackScoringMode,
    ScoringType,
    Target,
    TargetScoring,
} from '../types';
import {
    mergeAuthoredScoringWithCatalog,
    ResolvedTargetScoring,
    resolveTargetScoring,
} from './assessmentPackStructure';

/**
 * Phase A + B Effective Scoring — single runtime authority for how a target is scored.
 *
 * Authored scoring (storage) is input only. Runtime surfaces must consume
 * EffectiveScoringDefinition (or Score Interpretation / aggregations derived from it).
 *
 * Phase B expands how Effective Scoring is produced (pack default inheritance +
 * sparse overrides) without changing which surfaces consume it.
 *
 * Resolution always uses the provided pack context (assessment pack_snapshot for
 * historical assessments). Callers must pass the frozen snapshot, never a later
 * live pack edit, when evaluating an existing assessment (G8).
 *
 * # Corrupt / incomplete document fallbacks (deterministic)
 *
 * | Situation | Behaviour |
 * |-----------|-----------|
 * | Legacy dense pack (no mode/default) | Resolve from target.scoring (+ catalog) as Phase A |
 * | Legacy target missing scoring | Canonical numeric fallback `[0..4]` + warning |
 * | Canonical Uniform + target overrides present | Ignore overrides; use pack default; warning |
 * | Canonical Custom, Inherited target | Use pack default (+ catalog) |
 * | Canonical Custom, Override target | Use complete target override (+ catalog); no pack-default field fill |
 * | Missing / empty default_scoring on canonical pack | Canonical numeric fallback + warning |
 * | Unknown scoring_mode | Treat as `custom` + warning |
 * | Unknown named scale_id | Inline authored fields only (no invented catalog) |
 * | Empty named-scale catalog | Same as no catalog |
 */

export type EffectiveScaleType = 'numeric' | 'yes_no' | 'checkbox' | 'text' | 'unknown';

export type EffectiveScoringProvenance =
    | 'inline'
    | 'named_scale'
    | 'named_scale_with_inline_override'
    | 'canonical_fallback'
    | 'pack_default'
    | 'pack_default_named_scale'
    | 'target_override'
    | 'legacy_target';

/** Product concept: Inherited vs Override (authored). Legacy is dense target-local. */
export type TargetScoringAuthoredState = 'inherited' | 'override' | 'legacy';

export type EffectiveScoringAuthoredSource =
    | 'pack_default'
    | 'target_override'
    | 'legacy_target'
    | 'canonical_fallback';

export interface EffectiveScoringDefinition {
    /** Normalized runtime scale type. */
    type: EffectiveScaleType;
    /** Authored/resolved scoring type string before normalization. */
    scoringType: ScoringType | string;
    /** Discrete values a recorded numeric score may take (empty for text). */
    allowedValues: number[];
    /** Authoritative max for ratios, percentages, and at-maximum. */
    maxScore: number;
    scaleLabels: Record<number, string>;
    taskSteps?: string[];
    noOpportunityAllowed: boolean;
    scaleId?: string;
    resolvedFromScaleId?: string;
    provenance: EffectiveScoringProvenance;
    /** Authored inheritance state for this resolution. */
    authoredState: TargetScoringAuthoredState;
    /** Which authored blob supplied the pre-catalog merge input. */
    authoredSource: EffectiveScoringAuthoredSource;
    /** Deterministic warnings for malformed / incomplete documents. */
    warnings: string[];
}

/** Single product fallback for empty numeric scales (Phase A §6.3). */
export const CANONICAL_NUMERIC_FALLBACK_SCALE = [0, 1, 2, 3, 4] as const;

/** Single product fallback max when checkbox has neither steps nor scale. */
export const CANONICAL_CHECKBOX_FALLBACK_MAX = 4;

/** Aggregation max for text items under the single canonical rule. */
export const CANONICAL_TEXT_MAX_SCORE = 4;

const FALLBACK_AUTHORED: PackDefaultScoring = {
    type: 'numeric',
    scale: [...CANONICAL_NUMERIC_FALLBACK_SCALE],
    scale_labels: {},
    no_opportunity_allowed: false,
};

function scoringTypeKey(type: string | undefined): string {
    return type ?? 'numeric';
}

export function normalizeEffectiveScaleType(
    type: string | undefined
): EffectiveScaleType {
    const key = scoringTypeKey(type);
    if (key === 'yes_no' || key === 'yesno') {
        return 'yes_no';
    }
    if (key === 'checkbox') {
        return 'checkbox';
    }
    if (key === 'text') {
        return 'text';
    }
    if (key === 'numeric') {
        return 'numeric';
    }
    return 'unknown';
}

function integerRange(max: number): number[] {
    if (max < 0) {
        return [];
    }
    return Array.from({ length: max + 1 }, (_, index) => index);
}

/**
 * Derive allowed values + max from already-merged resolved scoring fields.
 * Shared by Effective Scoring and legacy ResolvedTargetScoring consumers.
 */
export function deriveScaleBoundsFromResolved(scoring: ResolvedTargetScoring): {
    type: EffectiveScaleType;
    allowedValues: number[];
    maxScore: number;
    usedCanonicalFallback: boolean;
} {
    const type = normalizeEffectiveScaleType(scoring.type as string);

    if (type === 'yes_no') {
        return {
            type,
            allowedValues: [0, 1],
            maxScore: 1,
            usedCanonicalFallback: false,
        };
    }

    if (type === 'text') {
        return {
            type,
            allowedValues: [],
            maxScore: CANONICAL_TEXT_MAX_SCORE,
            usedCanonicalFallback: false,
        };
    }

    if (type === 'checkbox') {
        if (scoring.scale && scoring.scale.length > 0) {
            const allowedValues = [...scoring.scale];
            return {
                type,
                allowedValues,
                maxScore: Math.max(...allowedValues),
                usedCanonicalFallback: false,
            };
        }

        const stepCount = scoring.task_steps?.length ?? 0;
        if (stepCount > 0) {
            return {
                type,
                allowedValues: integerRange(stepCount),
                maxScore: stepCount,
                usedCanonicalFallback: false,
            };
        }

        const fallbackMax =
            (scoring as { checkbox_count?: number }).checkbox_count ??
            CANONICAL_CHECKBOX_FALLBACK_MAX;
        return {
            type,
            allowedValues: integerRange(fallbackMax),
            maxScore: fallbackMax,
            usedCanonicalFallback: true,
        };
    }

    if (scoring.scale && scoring.scale.length > 0) {
        const allowedValues = [...scoring.scale];
        return {
            type: type === 'unknown' ? 'unknown' : 'numeric',
            allowedValues,
            maxScore: Math.max(...allowedValues),
            usedCanonicalFallback: false,
        };
    }

    const allowedValues = [...CANONICAL_NUMERIC_FALLBACK_SCALE];
    return {
        type: type === 'unknown' ? 'unknown' : 'numeric',
        allowedValues,
        maxScore: Math.max(...allowedValues),
        usedCanonicalFallback: true,
    };
}

/** True when pack has both scoring_mode and default_scoring (PR B1 canonical). */
export function isCanonicalScoringPack(pack: ContentPackData): boolean {
    return pack.scoring_mode !== undefined && pack.default_scoring !== undefined;
}

/** True when pack lacks canonical mode+default (legacy dense / Phase A snapshots). */
export function isLegacyDenseScoringPack(pack: ContentPackData): boolean {
    return !isCanonicalScoringPack(pack);
}

/** Target stores an authored scoring override blob. */
export function hasTargetScoringOverride(target: Target): boolean {
    return target.scoring !== undefined && target.scoring !== null;
}

/**
 * Normalize pack scoring mode.
 * Unknown / missing values on a canonical-shaped pack fall back to `custom`.
 */
export function normalizePackScoringMode(
    mode: string | undefined
): PackScoringMode {
    if (mode === 'uniform' || mode === 'custom') {
        return mode;
    }
    return 'custom';
}

/**
 * Product authored state for a target within a pack.
 * - canonical + no override → Inherited
 * - canonical + override → Override (even under malformed Uniform)
 * - legacy → legacy (dense target-local scoring)
 */
export function resolveTargetAuthoredScoringState(
    target: Target,
    pack: ContentPackData
): TargetScoringAuthoredState {
    if (!isCanonicalScoringPack(pack)) {
        return 'legacy';
    }
    return hasTargetScoringOverride(target) ? 'override' : 'inherited';
}

export interface TargetAuthoredScoringSource {
    authored: PackDefaultScoring | TargetScoring | typeof FALLBACK_AUTHORED;
    authoredState: TargetScoringAuthoredState;
    authoredSource: EffectiveScoringAuthoredSource;
    warnings: string[];
}

/**
 * Choose the authored scoring blob that feeds named-scale merge + normalization.
 * Does not mutate pack or target.
 */
export function resolveTargetAuthoredScoringSource(
    target: Target,
    pack: ContentPackData
): TargetAuthoredScoringSource {
    const warnings: string[] = [];
    const hasPartialCanonicalIntent =
        (pack.scoring_mode !== undefined) !== (pack.default_scoring !== undefined);

    if (!isCanonicalScoringPack(pack)) {
        if (hasPartialCanonicalIntent) {
            warnings.push(
                'Pack has incomplete canonical scoring fields (need both scoring_mode and default_scoring); using legacy target scoring path.'
            );
        }
        if (!target.scoring) {
            warnings.push(
                'Legacy pack target is missing scoring; using canonical numeric fallback.'
            );
            return {
                authored: FALLBACK_AUTHORED,
                authoredState: 'legacy',
                authoredSource: 'canonical_fallback',
                warnings,
            };
        }
        return {
            authored: target.scoring,
            authoredState: 'legacy',
            authoredSource: 'legacy_target',
            warnings,
        };
    }

    const rawMode = pack.scoring_mode;
    const mode = normalizePackScoringMode(rawMode);
    if (rawMode !== 'uniform' && rawMode !== 'custom') {
        warnings.push(
            `Unknown scoring_mode "${String(rawMode)}"; treating as custom.`
        );
    }

    const hasOverride = hasTargetScoringOverride(target);
    const defaultScoring = pack.default_scoring!;

    if (!isAuthoredScoringCompleteEnough(defaultScoring)) {
        warnings.push(
            'Pack default_scoring is incomplete; filling gaps via canonical normalization fallbacks.'
        );
    }

    if (mode === 'uniform') {
        if (hasOverride) {
            warnings.push(
                'Uniform pack contains target scoring overrides; overrides are ignored at runtime.'
            );
        }
        return {
            authored: defaultScoring,
            authoredState: hasOverride ? 'override' : 'inherited',
            authoredSource: 'pack_default',
            warnings,
        };
    }

    // custom
    if (!hasOverride) {
        return {
            authored: defaultScoring,
            authoredState: 'inherited',
            authoredSource: 'pack_default',
            warnings,
        };
    }

    const override = target.scoring!;
    if (!isAuthoredScoringCompleteEnough(override)) {
        warnings.push(
            'Target scoring override is incomplete; filling gaps via canonical normalization fallbacks (no pack-default field fill).'
        );
    }

    return {
        authored: override,
        authoredState: 'override',
        authoredSource: 'target_override',
        warnings,
    };
}

function isAuthoredScoringCompleteEnough(
    authored: PackDefaultScoring | TargetScoring
): boolean {
    if (!authored.type) {
        return false;
    }
    const type = normalizeEffectiveScaleType(authored.type as string);
    if (type === 'yes_no' || type === 'text') {
        return true;
    }
    if (type === 'checkbox') {
        return Boolean(
            (authored.scale && authored.scale.length > 0) ||
                (authored.task_steps && authored.task_steps.length > 0) ||
                authored.scale_id
        );
    }
    return Boolean((authored.scale && authored.scale.length > 0) || authored.scale_id);
}

function hasMeaningfulInlineScaleFields(
    authored: PackDefaultScoring | TargetScoring | typeof FALLBACK_AUTHORED
): boolean {
    return (
        authored.scale !== undefined ||
        authored.task_steps !== undefined ||
        (authored.scale_labels !== undefined &&
            Object.keys(authored.scale_labels).length > 0)
    );
}

function resolveProvenance(
    authored: PackDefaultScoring | TargetScoring | typeof FALLBACK_AUTHORED,
    resolved: ResolvedTargetScoring,
    usedCanonicalFallback: boolean,
    authoredSource: EffectiveScoringAuthoredSource
): EffectiveScoringProvenance {
    if (authoredSource === 'canonical_fallback') {
        return 'canonical_fallback';
    }

    if (authoredSource === 'pack_default') {
        if (!resolved.resolved_from_scale_id) {
            return usedCanonicalFallback ? 'canonical_fallback' : 'pack_default';
        }
        return hasMeaningfulInlineScaleFields(authored)
            ? 'named_scale_with_inline_override'
            : 'pack_default_named_scale';
    }

    if (authoredSource === 'target_override') {
        if (!resolved.resolved_from_scale_id) {
            return usedCanonicalFallback ? 'canonical_fallback' : 'target_override';
        }
        return hasMeaningfulInlineScaleFields(authored)
            ? 'named_scale_with_inline_override'
            : 'named_scale';
    }

    // legacy_target
    if (!resolved.resolved_from_scale_id) {
        return usedCanonicalFallback ? 'canonical_fallback' : 'inline';
    }
    return hasMeaningfulInlineScaleFields(authored)
        ? 'named_scale_with_inline_override'
        : 'named_scale';
}

/**
 * Canonical Effective Scoring for a target within a pack context.
 * Pack context for assessments must be the frozen pack_snapshot (G8).
 * Never mutates pack or target.
 */
export function resolveEffectiveScoring(
    target: Target,
    pack: ContentPackData
): EffectiveScoringDefinition {
    const source = resolveTargetAuthoredScoringSource(target, pack);
    const resolved = mergeAuthoredScoringWithCatalog(source.authored, pack);
    const bounds = deriveScaleBoundsFromResolved(resolved);
    const provenance = resolveProvenance(
        source.authored,
        resolved,
        bounds.usedCanonicalFallback,
        source.authoredSource
    );

    return {
        type: bounds.type,
        scoringType: resolved.type,
        allowedValues: bounds.allowedValues,
        maxScore: bounds.maxScore,
        scaleLabels: { ...(resolved.scale_labels ?? {}) },
        ...(resolved.task_steps !== undefined
            ? { taskSteps: [...resolved.task_steps] }
            : {}),
        noOpportunityAllowed: Boolean(resolved.no_opportunity_allowed),
        ...(resolved.scale_id ? { scaleId: resolved.scale_id } : {}),
        ...(resolved.resolved_from_scale_id
            ? { resolvedFromScaleId: resolved.resolved_from_scale_id }
            : {}),
        provenance,
        authoredState: source.authoredState,
        authoredSource: source.authoredSource,
        warnings: [...source.warnings],
    };
}

/** Convenience: Effective max for a target in a pack context. */
export function getEffectiveMaxScore(target: Target, pack: ContentPackData): number {
    return resolveEffectiveScoring(target, pack).maxScore;
}

/** Convenience: Effective allowed values for a target in a pack context. */
export function getEffectiveAllowedValues(
    target: Target,
    pack: ContentPackData
): number[] {
    return resolveEffectiveScoring(target, pack).allowedValues;
}

/**
 * Membership check against Effective Scoring allowed values.
 * Null clears a score and is always allowed.
 */
export function isScoreAllowedByEffectiveScoring(
    score: number | null,
    effective: EffectiveScoringDefinition
): boolean {
    if (score === null) {
        return true;
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) {
        return false;
    }
    if (effective.type === 'text') {
        return false;
    }
    return effective.allowedValues.some((value) => value === score);
}

/**
 * Compare two Effective Scoring definitions for clinical equality
 * (type, allowed values, max, labels, task steps, no-opportunity).
 */
export function effectiveScoringEquals(
    a: EffectiveScoringDefinition,
    b: EffectiveScoringDefinition
): boolean {
    if (a.type !== b.type || a.maxScore !== b.maxScore) {
        return false;
    }
    if (a.noOpportunityAllowed !== b.noOpportunityAllowed) {
        return false;
    }
    if (a.allowedValues.length !== b.allowedValues.length) {
        return false;
    }
    if (a.allowedValues.some((value, index) => value !== b.allowedValues[index])) {
        return false;
    }
    const aSteps = a.taskSteps ?? [];
    const bSteps = b.taskSteps ?? [];
    if (aSteps.length !== bSteps.length) {
        return false;
    }
    if (aSteps.some((step, index) => step !== bSteps[index])) {
        return false;
    }
    const aKeys = Object.keys(a.scaleLabels).sort();
    const bKeys = Object.keys(b.scaleLabels).sort();
    if (aKeys.length !== bKeys.length) {
        return false;
    }
    return aKeys.every(
        (key) =>
            bKeys.includes(key) &&
            a.scaleLabels[Number(key)] === b.scaleLabels[Number(key)]
    );
}

/** @deprecated Prefer resolveEffectiveScoring; kept for dense-path call sites. */
export { resolveTargetScoring };
