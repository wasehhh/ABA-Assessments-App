import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentCycle, ContentPackData, Target } from '../types';
import {
    assessmentService,
    countPackSnapshotTargets,
    countRecordedScores,
    formatCurrentCycleProgressLabel,
    loadCurrentCycleProgressFigure,
    selectCurrentAssessmentCycle,
} from './assessments';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

vi.mock('./audit', () => ({
    auditService: {
        log: vi.fn(),
    },
}));

function target(id: string): Target {
    return {
        target_id: id,
        title: id,
        success_criteria: '',
        materials: '',
    };
}

function packWithTargetCount(n: number): Pick<ContentPackData, 'domains'> {
    return {
        domains: [
            {
                domain_id: 'D1',
                title: 'Domain',
                targets: Array.from({ length: n }, (_, i) => target(`T${i}`)),
            },
        ],
    };
}

function cycle(partial: Pick<AssessmentCycle, 'id' | 'cycle_number' | 'status'>): AssessmentCycle {
    return {
        assessment_id: 'assess-1',
        org_id: 'org-1',
        start_date: null,
        end_date: null,
        created_at: '2026-08-01T00:00:00.000Z',
        ...partial,
    };
}

describe('selectCurrentAssessmentCycle', () => {
    it('prefers the in-progress cycle, else the first row (Matrix / getCycles desc order)', () => {
        const cycles = [
            cycle({ id: 'c3', cycle_number: 3, status: 'in_progress' }),
            cycle({ id: 'c2', cycle_number: 2, status: 'locked' }),
            cycle({ id: 'c1', cycle_number: 1, status: 'locked' }),
        ];
        expect(selectCurrentAssessmentCycle(cycles)?.id).toBe('c3');

        const lockedOnly = [
            cycle({ id: 'c2', cycle_number: 2, status: 'locked' }),
            cycle({ id: 'c1', cycle_number: 1, status: 'locked' }),
        ];
        expect(selectCurrentAssessmentCycle(lockedOnly)?.id).toBe('c2');
        expect(selectCurrentAssessmentCycle([])).toBeUndefined();
    });
});

describe('A7 current-cycle progress figure', () => {
    it('counts recorded scores (including 0) and names the cycle', () => {
        expect(
            countRecordedScores([{ score: null }, { score: 0 }, { score: 2 }, { score: null }])
        ).toBe(2);
        expect(formatCurrentCycleProgressLabel(2, 4, 3)).toBe('2 of 4 scored · Cycle 3');
        expect(formatCurrentCycleProgressLabel(2, 4, 3)).toContain('Cycle 3');
    });

    it('does not let a two-cycle assessment exceed its target count', () => {
        const targetCount = 40;
        const cycle1Recorded = Array.from({ length: 40 }, () => ({ score: 2 }));
        const cycle2Scores = [
            ...Array.from({ length: 5 }, () => ({ score: 1 })),
            ...Array.from({ length: 35 }, () => ({ score: null })),
        ];
        const allCycles = [...cycle1Recorded, ...cycle2Scores];

        expect(countRecordedScores(allCycles)).toBe(45);
        expect(countRecordedScores(allCycles)).toBeGreaterThan(targetCount);

        const currentCycleRecorded = countRecordedScores(cycle2Scores);
        expect(currentCycleRecorded).toBe(5);
        expect(currentCycleRecorded).toBeLessThanOrEqual(targetCount);
        expect(countPackSnapshotTargets(packWithTargetCount(targetCount))).toBe(40);
        expect(formatCurrentCycleProgressLabel(currentCycleRecorded, targetCount, 2)).toBe(
            '5 of 40 scored · Cycle 2'
        );
    });
});

describe('loadCurrentCycleProgressFigure', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('calls getScores with the current cycle id only', async () => {
        vi.spyOn(assessmentService, 'getCycles').mockResolvedValue([
            cycle({ id: 'c2', cycle_number: 2, status: 'in_progress' }),
            cycle({ id: 'c1', cycle_number: 1, status: 'locked' }),
        ]);
        const getScores = vi.spyOn(assessmentService, 'getScores').mockResolvedValue([
            { score: 1 },
            { score: 0 },
            { score: null },
            { score: null },
        ] as never);

        const figure = await loadCurrentCycleProgressFigure('assess-1', packWithTargetCount(4));

        expect(getScores).toHaveBeenCalledWith('assess-1', 'c2');
        expect(getScores).not.toHaveBeenCalledWith('assess-1');
        expect(figure).toEqual({
            recordedCount: 2,
            targetCount: 4,
            cycleNumber: 2,
            label: '2 of 4 scored · Cycle 2',
        });
        expect(figure!.recordedCount).toBeLessThanOrEqual(figure!.targetCount);
    });
});
