import { ContentPackData, ScoringType, Target } from '../types';
import {
    resolveTargetScoring,
    ResolvedTargetScoring,
} from './assessmentPackStructure';

/**
 * Phase A Effective Scoring — single runtime authority for how a target is scored.
 *
 * Authored scoring (storage) is input only. Runtime surfaces must consume
 * EffectiveScoringDefinition (or Score Interpretation / aggregations derived from it).
 *
 * Resolution always uses the provided pack context (assessment pack_snapshot for
 * historical assessments). Callers must pass the frozen snapshot, never a later
 * live pack edit, when evaluating an existing assessment.
 */

export type EffectiveScaleType = 'numeric' | 'yes_no' | 'checkbox' | 'text' | 'unknown';

export type EffectiveScoringProvenance =
    | 'inline'
    | 'named_scale'
    | 'named_scale_with_inline_override'
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
}

/** Single product fallback for empty numeric scales (Phase A §6.3). */
export const CANONICAL_NUMERIC_FALLBACK_SCALE = [0, 1, 2, 3, 4] as const;

/** Single product fallback max when checkbox has neither steps nor scale. */
export const CANONICAL_CHECKBOX_FALLBACK_MAX = 4;

/** Aggregation max for text items under the single canonical rule. */
export const CANONICAL_TEXT_MAX_SCORE = 4;

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

    // numeric + unknown → numeric-like treatment
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

function resolveProvenance(
    target: Target,
    resolved: ResolvedTargetScoring,
    usedCanonicalFallback: boolean
): EffectiveScoringProvenance {
    if (!resolved.resolved_from_scale_id) {
        return usedCanonicalFallback ? 'canonical_fallback' : 'inline';
    }

    const inline = target.scoring;
    const hasMeaningfulInlineOverride =
        inline.scale !== undefined ||
        inline.task_steps !== undefined ||
        (inline.scale_labels !== undefined &&
            Object.keys(inline.scale_labels).length > 0);

    return hasMeaningfulInlineOverride
        ? 'named_scale_with_inline_override'
        : 'named_scale';
}

/**
 * Canonical Effective Scoring for a target within a pack context.
 * Pack context for assessments must be the frozen pack_snapshot (G8).
 */
export function resolveEffectiveScoring(
    target: Target,
    pack: ContentPackData
): EffectiveScoringDefinition {
    const resolved = resolveTargetScoring(target, pack);
    const bounds = deriveScaleBoundsFromResolved(resolved);

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
        provenance: resolveProvenance(target, resolved, bounds.usedCanonicalFallback),
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
