import { AssessmentScore, ContentPackData, Target } from '../types';
import {
    EffectiveScoringDefinition,
    getEffectiveAllowedValues,
    getEffectiveMaxScore,
    normalizeEffectiveScaleType,
    resolveEffectiveScoring,
} from './effectiveScoring';

export type ScaleType = 'numeric' | 'yes_no' | 'checkbox' | 'text' | 'unknown';

export type CompetencyState =
    | 'unscored'
    | 'not_yet'
    | 'in_progress'
    | 'at_maximum';

export interface TargetScoreInterpretation {
    targetId: string;
    rawScore: number | null;
    isUnscored: boolean;
    hasScoreRow: boolean;
    targetMax: number;
    normalizedRatio: number | null;
    competencyState: CompetencyState;
    displayScore: string;
    displayScoreWithMax: string;
    scaleType: ScaleType;
    scaleValues: number[];
    supportsInProgress: boolean;
}

const UNSCORED_DISPLAY = '—';

/**
 * Max score from Effective Scoring for the given pack context.
 * Pass assessment pack_snapshot for historical assessments (G8).
 */
export function getTargetMaxScore(target: Target, pack: ContentPackData): number {
    return getEffectiveMaxScore(target, pack);
}

/** Normalize legacy yes_no / yesno and builder variants via Effective Scoring rules. */
export function resolveScaleType(target: Target, pack: ContentPackData): ScaleType {
    return resolveEffectiveScoring(target, pack).type;
}

/** Allowed scale values from Effective Scoring for the given pack context. */
export function getTargetScaleValues(target: Target, pack: ContentPackData): number[] {
    return getEffectiveAllowedValues(target, pack);
}

/**
 * Membership check against allowed scale values.
 * Null clears a score and is always allowed. Does not use min/max range.
 */
export function isScoreInResolvedScale(
    score: number | null,
    scaleValues: number[]
): boolean {
    if (score === null) {
        return true;
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) {
        return false;
    }
    return scaleValues.some((value) => value === score);
}

/**
 * Coerce a stored score for read/interpretation.
 * Does not clamp to 0–max — membership validation belongs at write time.
 */
export function coerceStoredScore(raw: number | null | undefined): number | null {
    if (raw === null || raw === undefined) {
        return null;
    }

    if (typeof raw !== 'number' || Number.isNaN(raw) || !Number.isFinite(raw)) {
        return null;
    }

    return raw;
}

/**
 * Normalize score values returned from Postgres/PostgREST.
 * `numeric` columns are often serialized as strings (e.g. "0.5").
 */
export function coerceScoreFromDb(raw: unknown): number | null {
    if (raw === null || raw === undefined) {
        return null;
    }
    if (typeof raw === 'number') {
        return coerceStoredScore(raw);
    }
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) {
            return null;
        }
        return coerceStoredScore(Number(trimmed));
    }
    return null;
}

/**
 * @deprecated Prefer coerceStoredScore. Range clamping is incorrect for
 * non-contiguous and negative scales; targetMax is ignored.
 */
export function clampRawScore(
    raw: number | null | undefined,
    targetMax?: number
): number | null {
    void targetMax;
    return coerceStoredScore(raw);
}

export function getNormalizedRatio(
    rawScore: number | null,
    targetMax: number
): number | null {
    if (rawScore === null || targetMax <= 0) {
        return null;
    }
    return rawScore / targetMax;
}

export function getCompetencyStateFromEffective(
    effective: EffectiveScoringDefinition,
    rawScore: number | null
): CompetencyState {
    if (rawScore === null) {
        return 'unscored';
    }

    const scaleType = effective.type;
    const targetMax = effective.maxScore;
    const scaleValues = effective.allowedValues;
    const minVal = scaleValues.length > 0 ? Math.min(...scaleValues) : 0;

    if (scaleType === 'yes_no') {
        if (rawScore === 0) return 'not_yet';
        return 'at_maximum';
    }

    if (targetMax === 2) {
        if (rawScore === 0) return 'not_yet';
        if (rawScore === 2) return 'at_maximum';
        return 'in_progress';
    }

    if (targetMax === 4) {
        if (rawScore === 0) return 'not_yet';
        if (rawScore === 4) return 'at_maximum';
        return 'in_progress';
    }

    if (rawScore === minVal) return 'not_yet';
    if (rawScore === targetMax) return 'at_maximum';
    return 'in_progress';
}

export function getCompetencyState(
    target: Target,
    rawScore: number | null,
    pack: ContentPackData
): CompetencyState {
    return getCompetencyStateFromEffective(resolveEffectiveScoring(target, pack), rawScore);
}

export function getDisplayScoreFromEffective(
    effective: EffectiveScoringDefinition,
    rawScore: number | null,
    opts?: {
        includeMax?: boolean;
        unscoredLabel?: string;
    }
): string {
    const unscoredLabel = opts?.unscoredLabel ?? UNSCORED_DISPLAY;
    const targetMax = effective.maxScore;

    if (rawScore === null) {
        return unscoredLabel;
    }

    const scoreText = String(rawScore);
    if (opts?.includeMax) {
        return `${scoreText}/${targetMax}`;
    }
    return scoreText;
}

export function getDisplayScore(
    target: Target,
    rawScore: number | null,
    pack: ContentPackData,
    opts?: {
        includeMax?: boolean;
        unscoredLabel?: string;
    }
): string {
    return getDisplayScoreFromEffective(
        resolveEffectiveScoring(target, pack),
        rawScore,
        opts
    );
}

/**
 * Score Interpretation layer — downstream of Effective Scoring only.
 * Pack must be the assessment pack_snapshot for historical assessments.
 */
export function interpretTargetScore(
    target: Target,
    scoreRow: AssessmentScore | null | undefined,
    pack: ContentPackData
): TargetScoreInterpretation {
    const effective = resolveEffectiveScoring(target, pack);
    const hasScoreRow = scoreRow != null;
    const targetMax = effective.maxScore;
    const scaleType = effective.type;
    const scaleValues = effective.allowedValues;
    const supportsInProgress = scaleType !== 'yes_no';

    const rawFromRow = hasScoreRow ? scoreRow!.score : null;
    const rawScore = coerceScoreFromDb(rawFromRow);
    const isUnscored = rawScore === null;
    const competencyState = getCompetencyStateFromEffective(effective, rawScore);
    const normalizedRatio = getNormalizedRatio(rawScore, targetMax);
    const displayScore = getDisplayScoreFromEffective(effective, rawScore);
    const displayScoreWithMax = getDisplayScoreFromEffective(effective, rawScore, {
        includeMax: true,
    });

    return {
        targetId: target.target_id,
        rawScore,
        isUnscored,
        hasScoreRow,
        targetMax,
        normalizedRatio,
        competencyState,
        displayScore,
        displayScoreWithMax,
        scaleType,
        scaleValues,
        supportsInProgress,
    };
}

/** Re-export for callers that only need type normalization without a pack. */
export { normalizeEffectiveScaleType };
