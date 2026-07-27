import { describe, it, expect } from 'vitest';
import { AssessmentScore, Target } from '../types';
import {
    clampRawScore,
    coerceScoreFromDb,
    coerceStoredScore,
    getCompetencyState,
    getDisplayScore,
    getNormalizedRatio,
    getTargetMaxScore,
    getTargetScaleValues,
    interpretTargetScore,
    isScoreInResolvedScale,
    resolveScaleType,
} from './scoreInterpretation';

function makeTarget(overrides: Partial<Target> & Pick<Target, 'target_id'>): Target {
    return {
        title: 'Test Target',
        success_criteria: 'Criteria',
        materials: 'Materials',
        scoring: {
            type: 'numeric',
            scale_labels: {},
            no_opportunity_allowed: false,
        },
        ...overrides,
    };
}

function makeScoreRow(
    targetId: string,
    score: number | null
): AssessmentScore {
    return {
        id: 'score-1',
        assessment_id: 'assess-1',
        assessment_cycle_id: 'cycle-1',
        client_id: 'client-1',
        pack_snapshot_id: 'pack-1',
        target_id: targetId,
        domain_id: 'DOM1',
        score,
        note: null,
        evidence_files: [],
        assessor_user_id: 'user-1',
        scored_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

describe('getTargetMaxScore', () => {
    it('returns 4 for default numeric scale', () => {
        const target = makeTarget({ target_id: 'T1' });
        expect(getTargetMaxScore(target)).toBe(4);
    });

    it('returns max for custom numeric 0-2 scale', () => {
        const target = makeTarget({
            target_id: 'T2',
            scoring: {
                type: 'numeric',
                scale: [0, 1, 2],
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        });
        expect(getTargetMaxScore(target)).toBe(2);
    });

    it('returns 1 for yes_no and yesno', () => {
        const yesNo = makeTarget({
            target_id: 'YN1',
            scoring: {
                type: 'yesno' as Target['scoring']['type'],
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        });
        expect(getTargetMaxScore(yesNo)).toBe(1);

        const legacy = makeTarget({
            target_id: 'YN2',
            scoring: {
                type: 'yes_no' as Target['scoring']['type'],
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        });
        expect(getTargetMaxScore(legacy)).toBe(1);
    });

    it('derives max from checkbox task_steps length', () => {
        const target = makeTarget({
            target_id: 'CB1',
            scoring: {
                type: 'checkbox',
                scale_labels: {},
                no_opportunity_allowed: false,
                task_steps: ['Step A', 'Step B', 'Step C', 'Step D', 'Step E'],
            },
        });
        expect(getTargetMaxScore(target)).toBe(5);
    });

    it('falls back to 4 when checkbox has no task_steps', () => {
        const target = makeTarget({
            target_id: 'CB2',
            scoring: {
                type: 'checkbox',
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        });
        expect(getTargetMaxScore(target)).toBe(4);
    });

    it('falls back to 4 when numeric scale is missing', () => {
        const target = makeTarget({
            target_id: 'NUM1',
            scoring: {
                type: 'numeric',
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        });
        expect(getTargetMaxScore(target)).toBe(4);
    });
});

describe('resolveScaleType', () => {
    it('normalizes yesno and yes_no to yes_no', () => {
        expect(
            resolveScaleType(
                makeTarget({
                    target_id: 'Y1',
                    scoring: { type: 'yesno', scale_labels: {}, no_opportunity_allowed: false },
                })
            )
        ).toBe('yes_no');
    });
});

describe('interpretTargetScore', () => {
    const numeric04 = makeTarget({
        target_id: 'N04',
        scoring: {
            type: 'numeric',
            scale: [0, 1, 2, 3, 4],
            scale_labels: {},
            no_opportunity_allowed: false,
        },
    });

    it('treats missing score row as unscored', () => {
        const result = interpretTargetScore(numeric04, null);
        expect(result.isUnscored).toBe(true);
        expect(result.hasScoreRow).toBe(false);
        expect(result.rawScore).toBeNull();
        expect(result.competencyState).toBe('unscored');
        expect(result.normalizedRatio).toBeNull();
        expect(result.displayScore).toBe('—');
    });

    it('treats row with null score as unscored', () => {
        const result = interpretTargetScore(numeric04, makeScoreRow('N04', null));
        expect(result.isUnscored).toBe(true);
        expect(result.hasScoreRow).toBe(true);
        expect(result.competencyState).toBe('unscored');
    });

    it('maps 0-4 scale competency states', () => {
        expect(interpretTargetScore(numeric04, makeScoreRow('N04', 0)).competencyState).toBe('not_yet');
        expect(interpretTargetScore(numeric04, makeScoreRow('N04', 1)).competencyState).toBe('in_progress');
        expect(interpretTargetScore(numeric04, makeScoreRow('N04', 2)).competencyState).toBe('in_progress');
        expect(interpretTargetScore(numeric04, makeScoreRow('N04', 3)).competencyState).toBe('in_progress');
        expect(interpretTargetScore(numeric04, makeScoreRow('N04', 4)).competencyState).toBe('at_maximum');
    });

    it('maps 0-2 scale full path', () => {
        const numeric02 = makeTarget({
            target_id: 'N02',
            scoring: {
                type: 'numeric',
                scale: [0, 1, 2],
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        });
        expect(interpretTargetScore(numeric02, makeScoreRow('N02', 0)).competencyState).toBe('not_yet');
        expect(interpretTargetScore(numeric02, makeScoreRow('N02', 1)).competencyState).toBe('in_progress');
        expect(interpretTargetScore(numeric02, makeScoreRow('N02', 2)).competencyState).toBe('at_maximum');
    });

    it('maps yes/no 0 to not_yet and 1 to at_maximum', () => {
        const yesNo = makeTarget({
            target_id: 'YN',
            scoring: { type: 'yesno', scale_labels: {}, no_opportunity_allowed: false },
        });
        expect(interpretTargetScore(yesNo, makeScoreRow('YN', 0)).competencyState).toBe('not_yet');
        expect(interpretTargetScore(yesNo, makeScoreRow('YN', 1)).competencyState).toBe('at_maximum');
    });

    it('never supports in_progress for yes/no', () => {
        const yesNo = makeTarget({
            target_id: 'YN2',
            scoring: { type: 'yesno', scale_labels: {}, no_opportunity_allowed: false },
        });
        expect(interpretTargetScore(yesNo, makeScoreRow('YN2', 0)).supportsInProgress).toBe(false);
        expect(interpretTargetScore(yesNo, makeScoreRow('YN2', 1)).supportsInProgress).toBe(false);
    });

    it('preserves out-of-scale stored scores without clamping to max', () => {
        const result = interpretTargetScore(numeric04, makeScoreRow('N04', 99));
        expect(result.rawScore).toBe(99);
        expect(result.competencyState).toBe('in_progress');
    });

    it('preserves decimal and negative scores on decimal/negative scales', () => {
        const decimal = makeTarget({
            target_id: 'DEC',
            scoring: {
                type: 'numeric',
                scale: [0, 0.5, 1],
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        });
        expect(interpretTargetScore(decimal, makeScoreRow('DEC', 0.5)).rawScore).toBe(0.5);
        expect(interpretTargetScore(decimal, makeScoreRow('DEC', 0.5)).displayScore).toBe('0.5');
        expect(interpretTargetScore(decimal, makeScoreRow('DEC', 1)).competencyState).toBe(
            'at_maximum'
        );

        const signed = makeTarget({
            target_id: 'NEG',
            scoring: {
                type: 'numeric',
                scale: [-1, 0, 1],
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        });
        expect(interpretTargetScore(signed, makeScoreRow('NEG', -1)).rawScore).toBe(-1);
        expect(interpretTargetScore(signed, makeScoreRow('NEG', -1)).competencyState).toBe(
            'not_yet'
        );
    });

    it('interprets non-contiguous scale [0, 2, 4] with generic logic', () => {
        const nonContiguous = makeTarget({
            target_id: 'NC',
            scoring: {
                type: 'numeric',
                scale: [0, 2, 4],
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        });
        expect(interpretTargetScore(nonContiguous, makeScoreRow('NC', 0)).competencyState).toBe('not_yet');
        expect(interpretTargetScore(nonContiguous, makeScoreRow('NC', 2)).competencyState).toBe('in_progress');
        expect(interpretTargetScore(nonContiguous, makeScoreRow('NC', 4)).competencyState).toBe('at_maximum');
        expect(getTargetScaleValues(nonContiguous)).toEqual([0, 2, 4]);
    });
});

describe('getDisplayScore', () => {
    const numeric04 = makeTarget({
        target_id: 'DISP',
        scoring: {
            type: 'numeric',
            scale: [0, 1, 2, 3, 4],
            scale_labels: {},
            no_opportunity_allowed: false,
        },
    });

    it('displays — when unscored', () => {
        expect(getDisplayScore(numeric04, null)).toBe('—');
    });

    it('displays score with max when includeMax is true', () => {
        expect(getDisplayScore(numeric04, 2, { includeMax: true })).toBe('2/4');
    });

    it('keeps yes/no display stable as numeric strings', () => {
        const yesNo = makeTarget({
            target_id: 'YDISP',
            scoring: { type: 'yesno', scale_labels: {}, no_opportunity_allowed: false },
        });
        expect(getDisplayScore(yesNo, 0)).toBe('0');
        expect(getDisplayScore(yesNo, 1)).toBe('1');
        expect(getDisplayScore(yesNo, 1, { includeMax: true })).toBe('1/1');
    });

    it('treats 0 as scored zero, not unscored', () => {
        expect(getDisplayScore(numeric04, 0)).toBe('0');
        expect(getCompetencyState(numeric04, 0)).toBe('not_yet');
    });
});

describe('getNormalizedRatio', () => {
    it('returns null for unscored', () => {
        expect(getNormalizedRatio(null, 4)).toBeNull();
    });

    it('computes ratios for numeric scales', () => {
        expect(getNormalizedRatio(0, 4)).toBe(0);
        expect(getNormalizedRatio(2, 4)).toBe(0.5);
        expect(getNormalizedRatio(1, 1)).toBe(1);
    });
});

describe('isScoreInResolvedScale', () => {
    it('accepts membership including decimals and rejects non-members', () => {
        expect(isScoreInResolvedScale(0.5, [0, 0.5, 1])).toBe(true);
        expect(isScoreInResolvedScale(0.25, [0, 0.5, 1])).toBe(false);
        expect(isScoreInResolvedScale(4, [0, 2, 4])).toBe(true);
        expect(isScoreInResolvedScale(3, [0, 2, 4])).toBe(false);
        expect(isScoreInResolvedScale(null, [0, 0.5, 1])).toBe(true);
    });
});

describe('coerceStoredScore / coerceScoreFromDb', () => {
    it('returns null for nullish or non-finite input', () => {
        expect(coerceStoredScore(null)).toBeNull();
        expect(coerceStoredScore(undefined)).toBeNull();
        expect(coerceScoreFromDb('')).toBeNull();
        expect(coerceScoreFromDb('NaN')).toBeNull();
    });

    it('does not clamp high or negative values', () => {
        expect(clampRawScore(10, 4)).toBe(10);
        expect(clampRawScore(-1, 4)).toBe(-1);
        expect(coerceStoredScore(0.25)).toBe(0.25);
    });

    it('normalizes numeric strings from Postgres numeric columns', () => {
        expect(coerceScoreFromDb('0.5')).toBe(0.5);
        expect(coerceScoreFromDb('0.25')).toBe(0.25);
        expect(coerceScoreFromDb('-1')).toBe(-1);
        expect(coerceScoreFromDb(2)).toBe(2);
    });
});
