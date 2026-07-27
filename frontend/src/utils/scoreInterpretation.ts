import { AssessmentScore, Target } from '../types';

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

const DEFAULT_NUMERIC_SCALE = [0, 1, 2, 3, 4];
const UNSCORED_DISPLAY = '—';

function scoringTypeKey(target: Target): string {
    return (target.scoring.type as string) ?? 'numeric';
}

/** Single source of truth for max score on a target definition. */
export function getTargetMaxScore(target: Target): number {
    const type = scoringTypeKey(target);

    if (type === 'yes_no' || type === 'yesno') {
        return 1;
    }

    if (type === 'checkbox') {
        return target.scoring.task_steps?.length
            || (target.scoring as { checkbox_count?: number }).checkbox_count
            || 4;
    }

    if (target.scoring.scale && target.scoring.scale.length > 0) {
        return Math.max(...target.scoring.scale);
    }

    return 4;
}

/** Normalize legacy yes_no / yesno and builder variants. */
export function resolveScaleType(target: Target): ScaleType {
    const type = scoringTypeKey(target);

    if (type === 'yes_no' || type === 'yesno') {
        return 'yes_no';
    }
    if (type === 'checkbox') {
        return 'checkbox';
    }
    if (type === 'text') {
        return 'text';
    }
    if (type === 'numeric') {
        return 'numeric';
    }
    return 'unknown';
}

/** Ordered scale values for numeric/checkbox interpretation. */
export function getTargetScaleValues(target: Target): number[] {
    const scaleType = resolveScaleType(target);

    if (scaleType === 'yes_no') {
        return [0, 1];
    }

    if (target.scoring.scale && target.scoring.scale.length > 0) {
        return [...target.scoring.scale];
    }

    if (scaleType === 'checkbox') {
        const max = getTargetMaxScore(target);
        return Array.from({ length: max + 1 }, (_, i) => i);
    }

    return [...DEFAULT_NUMERIC_SCALE];
}

/**
 * Membership check against a resolved scale.
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
    _targetMax?: number
): number | null {
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

export function getCompetencyState(
    target: Target,
    rawScore: number | null
): CompetencyState {
    if (rawScore === null) {
        return 'unscored';
    }

    const scaleType = resolveScaleType(target);
    const targetMax = getTargetMaxScore(target);
    const scaleValues = getTargetScaleValues(target);
    const minVal = Math.min(...scaleValues);

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

export function getDisplayScore(
    target: Target,
    rawScore: number | null,
    opts?: {
        includeMax?: boolean;
        unscoredLabel?: string;
    }
): string {
    const unscoredLabel = opts?.unscoredLabel ?? UNSCORED_DISPLAY;
    const targetMax = getTargetMaxScore(target);

    if (rawScore === null) {
        return unscoredLabel;
    }

    const scoreText = String(rawScore);
    if (opts?.includeMax) {
        return `${scoreText}/${targetMax}`;
    }
    return scoreText;
}

export function interpretTargetScore(
    target: Target,
    scoreRow: AssessmentScore | null | undefined
): TargetScoreInterpretation {
    const hasScoreRow = scoreRow != null;
    const targetMax = getTargetMaxScore(target);
    const scaleType = resolveScaleType(target);
    const scaleValues = getTargetScaleValues(target);
    const supportsInProgress = scaleType !== 'yes_no';

    const rawFromRow = hasScoreRow ? scoreRow!.score : null;
    const rawScore = coerceScoreFromDb(rawFromRow);
    const isUnscored = rawScore === null;
    const competencyState = getCompetencyState(target, rawScore);
    const normalizedRatio = getNormalizedRatio(rawScore, targetMax);
    const displayScore = getDisplayScore(target, rawScore);
    const displayScoreWithMax = getDisplayScore(target, rawScore, { includeMax: true });

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
