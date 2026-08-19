import { describe, expect, it, vi } from 'vitest';
import { ContentPackData } from '../types';
import {
  PendingSaveTracker,
  comparisonLoadIsDistinguishableFromEmpty,
  countUnscoredTargets,
  evaluateSubmitGate,
  fetchCycleScoresBundle,
  formatSubmitConfirmMessage,
  matrixScoresEntryAllowed,
  resolveSubmitControlState,
  shouldDiscardStaleRequest,
} from './assessmentMatrixSaveHonesty';

const pack: ContentPackData = {
    pack_id: 'p1',
    org_id: 'o1',
    title: 'Pack',
    description: '',
    version: '1',
    domains: [
        {
            domain_id: 'A',
            title: 'Domain A',
            targets: [
                {
                    target_id: 'T1',
                    title: 'One',
                    success_criteria: '',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
                {
                    target_id: 'T2',
                    title: 'Two',
                    success_criteria: '',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
                {
                    target_id: 'T3',
                    title: 'Three',
                    success_criteria: '',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
            ],
        },
    ],
};

describe('PendingSaveTracker', () => {
    it('blocks submit until all concurrent saves settle — one finishing does not clear another', () => {
        const tracker = new PendingSaveTracker();
        const a = tracker.begin();
        const b = tracker.begin();
        expect(tracker.count).toBe(2);

        expect(tracker.end(a)).toBe(1);
        expect(tracker.count).toBe(1);

        expect(tracker.end(b)).toBe(0);
        expect(tracker.count).toBe(0);
    });
});

describe('evaluateSubmitGate', () => {
    const base = {
        pendingSaveCount: 0,
        failedSaveTargetIds: [] as string[],
        isSubmitting: false,
        cannotSubmitAssessment: false,
        isViewer: false,
        cycleScoresLoadState: 'loaded' as const,
    };

    it('blocks submit while any save is pending', () => {
        expect(evaluateSubmitGate({ ...base, pendingSaveCount: 1 }).allowed).toBe(false);
        expect(evaluateSubmitGate({ ...base, pendingSaveCount: 2 }).allowed).toBe(false);
    });

    it('blocks submit after a save failed and rolled back', () => {
        const result = evaluateSubmitGate({ ...base, failedSaveTargetIds: ['T2'] });
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('T2');
        expect(result.reason).toContain('did not save');
    });

    it('blocks submit while primary cycle scores are loading', () => {
        const result = evaluateSubmitGate({ ...base, cycleScoresLoadState: 'loading' });
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('still loading');
    });

    it('blocks submit when primary cycle scores failed to load', () => {
        const result = evaluateSubmitGate({ ...base, cycleScoresLoadState: 'error' });
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('could not be loaded');
        expect(result.reason).toContain('Retry loading scores');
    });

    it('allows submit when saves are idle, none failed, and scores loaded', () => {
        expect(evaluateSubmitGate(base).allowed).toBe(true);
    });
});

describe('countUnscoredTargets', () => {
    it('uses persisted rows, not optimistic-only marks', () => {
        const persisted = [{ target_id: 'T1', score: 2 }];
        const optimistic = [
            { target_id: 'T1', score: 2 },
            { target_id: 'T2', score: 1 },
            { target_id: 'T3', score: 0 },
        ];
        expect(countUnscoredTargets(pack, persisted)).toBe(2);
        expect(countUnscoredTargets(pack, optimistic)).toBe(0);
    });
});

describe('formatSubmitConfirmMessage', () => {
    it('describes submitted status without claiming the cycle is locked for all roles', () => {
        expect(formatSubmitConfirmMessage(0, 'Target')).toContain('Senior therapists and admins');
        expect(formatSubmitConfirmMessage(0, 'Target')).not.toContain('lock this cycle');
    });

    it('warns about unscored targets using saved-state counts', () => {
        const msg = formatSubmitConfirmMessage(2, 'Target');
        expect(msg).toContain('2 targets');
        expect(msg).toContain('no saved score');
    });
});

describe('cycle score load honesty', () => {
    it('does not allow score entry when load failed', () => {
        expect(matrixScoresEntryAllowed('error')).toBe(false);
        expect(matrixScoresEntryAllowed('loading')).toBe(false);
        expect(matrixScoresEntryAllowed('loaded')).toBe(true);
    });

    it('allows a loaded genuinely unscored assessment — empty persisted rows, not failure', () => {
        expect(matrixScoresEntryAllowed('loaded')).toBe(true);
        expect(countUnscoredTargets(pack, [])).toBe(3);
    });

    it('distinguishes failed comparison load from having no comparison cycle', () => {
        expect(comparisonLoadIsDistinguishableFromEmpty('error')).toBe(false);
        expect(comparisonLoadIsDistinguishableFromEmpty('none')).toBe(true);
        expect(comparisonLoadIsDistinguishableFromEmpty('loaded')).toBe(true);
    });
});

describe('shouldDiscardStaleRequest', () => {
    it('discards an older response when a newer request superseded it', () => {
        expect(shouldDiscardStaleRequest(1, 2)).toBe(true);
        expect(shouldDiscardStaleRequest(2, 2)).toBe(false);
    });
});

describe('resolveSubmitControlState', () => {
    const base = {
        pendingSaveCount: 0,
        failedSaveTargetIds: [] as string[],
        isSubmitting: false,
        cannotSubmitAssessment: false,
        isViewer: false,
        cycleScoresLoadState: 'loaded' as const,
        showSubmitAssessmentButton: true,
    };

    it('disables submit when primary cycle scores failed to load', () => {
        const result = resolveSubmitControlState({
            ...base,
            cycleScoresLoadState: 'error',
        });
        expect(result.disabled).toBe(true);
        expect(result.reason).toContain('could not be loaded');
    });
});

describe('fetchCycleScoresBundle stale-request guard', () => {
    it('discards an older in-flight response when a newer request superseded it', async () => {
        let currentRequestId = 1;
        const primaryScores = [{ target_id: 'T1', score: 1 }];
        const newerPrimaryScores = [{ target_id: 'T1', score: 2 }];

        const getScores = vi.fn(async (cycleId: string) => {
            if (cycleId === 'c1') {
                await new Promise((resolve) => setTimeout(resolve, 20));
                return primaryScores;
            }
            return [{ target_id: 'T1', score: 0 }];
        });

        const olderPromise = fetchCycleScoresBundle({
            requestId: 1,
            getCurrentRequestId: () => currentRequestId,
            cycleId: 'c1',
            compareCycleId: null,
            cycles: [{ id: 'c1', cycle_number: 1 }],
            getScores,
        });

        currentRequestId = 2;
        const newerResult = await fetchCycleScoresBundle({
            requestId: 2,
            getCurrentRequestId: () => currentRequestId,
            cycleId: 'c1',
            compareCycleId: null,
            cycles: [{ id: 'c1', cycle_number: 1 }],
            getScores: async () => newerPrimaryScores,
        });

        const olderResult = await olderPromise;

        expect(olderResult).toEqual({ kind: 'stale' });
        expect(newerResult).toEqual({
            kind: 'success',
            scores: newerPrimaryScores,
            previousScores: [],
            comparisonScoresLoadState: 'none',
            comparisonScoresLoadError: null,
        });
    });

    it('does not treat comparison load failure as a primary load failure', async () => {
        const result = await fetchCycleScoresBundle({
            requestId: 1,
            getCurrentRequestId: () => 1,
            cycleId: 'c2',
            compareCycleId: 'c1',
            cycles: [
                { id: 'c2', cycle_number: 2 },
                { id: 'c1', cycle_number: 1 },
            ],
            getScores: async (cycleId) => {
                if (cycleId === 'c2') {
                    return [{ target_id: 'T1', score: null }];
                }
                throw new Error('comparison unavailable');
            },
        });

        expect(result).toEqual({
            kind: 'success',
            scores: [{ target_id: 'T1', score: null }],
            previousScores: [],
            comparisonScoresLoadState: 'error',
            comparisonScoresLoadError:
                'Comparison cycle scores could not be loaded. Trend arrows may be unavailable until you retry.',
        });
    });
});
