import { ContentPackData } from '../types';
import { pluralizeStructureLabel } from '../utils/assessmentPackStructure';

/** Tracks concurrent in-flight score saves — not a lone boolean. */
export class PendingSaveTracker {
    private readonly pending = new Set<number>();
    private nextId = 0;

    begin(): number {
        const id = ++this.nextId;
        this.pending.add(id);
        return id;
    }

    end(id: number): number {
        this.pending.delete(id);
        return this.pending.size;
    }

    get count(): number {
        return this.pending.size;
    }
}

export function shouldDiscardStaleRequest(
    requestId: number,
    currentRequestId: number
): boolean {
    return requestId !== currentRequestId;
}

export type CycleScoresLoadState = 'loading' | 'loaded' | 'error';
export type ComparisonScoresLoadState = 'loading' | 'loaded' | 'error' | 'none';

export interface ScoreRowLike {
    target_id: string;
    score: number | null;
}

export function countUnscoredTargets(
    pack: ContentPackData,
    scoreRows: readonly ScoreRowLike[]
): number {
    let total = 0;
    let scored = 0;
    for (const domain of pack.domains) {
        for (const target of domain.targets) {
            total++;
            const row = scoreRows.find((s) => s.target_id === target.target_id);
            if (row && row.score !== null) {
                scored++;
            }
        }
    }
    return total - scored;
}

export interface SubmitGateInput {
    pendingSaveCount: number;
    failedSaveTargetIds: readonly string[];
    isSubmitting: boolean;
    cannotSubmitAssessment: boolean;
    isViewer: boolean;
    cycleScoresLoadState: CycleScoresLoadState;
}

export function evaluateSubmitGate(input: SubmitGateInput): {
    allowed: boolean;
    reason: string | null;
} {
    if (input.cannotSubmitAssessment || input.isViewer || input.isSubmitting) {
        return { allowed: false, reason: null };
    }
    if (input.cycleScoresLoadState === 'loading') {
        return {
            allowed: false,
            reason: 'Cycle scores are still loading. Wait before submitting.',
        };
    }
    if (input.cycleScoresLoadState === 'error') {
        return {
            allowed: false,
            reason:
                'Cycle scores could not be loaded. Retry loading scores before submitting.',
        };
    }
    if (input.pendingSaveCount > 0) {
        return {
            allowed: false,
            reason: 'Scores are still saving. Wait for saves to finish before submitting.',
        };
    }
    if (input.failedSaveTargetIds.length > 0) {
        return {
            allowed: false,
            reason: formatFailedSavesMessage(input.failedSaveTargetIds),
        };
    }
    return { allowed: true, reason: null };
}

export function resolveSubmitControlState(
    input: SubmitGateInput & { showSubmitAssessmentButton: boolean }
): { disabled: boolean; reason: string | null } {
    if (!input.showSubmitAssessmentButton) {
        return { disabled: true, reason: null };
    }
    const gate = evaluateSubmitGate(input);
    if (!gate.allowed && gate.reason) {
        return { disabled: true, reason: gate.reason };
    }
    if (input.isSubmitting) {
        return { disabled: true, reason: null };
    }
    return { disabled: false, reason: null };
}

export function formatFailedSavesMessage(failedTargetIds: readonly string[]): string {
    if (failedTargetIds.length === 0) {
        return '';
    }
    const listed = failedTargetIds.join(', ');
    if (failedTargetIds.length === 1) {
        return `A score did not save (${listed}). Fix or re-enter it before submitting.`;
    }
    return `${failedTargetIds.length} scores did not save (${listed}). Fix or re-enter them before submitting.`;
}

export function formatSubmitConfirmMessage(
    unscoredCount: number,
    targetLabel: string
): string {
    const noun =
        unscoredCount === 1
            ? targetLabel.trim().toLowerCase()
            : pluralizeStructureLabel(targetLabel).toLowerCase();
    if (unscoredCount > 0) {
        return `Warning: ${unscoredCount} ${noun} still have no saved score. Submitting marks this assessment as submitted. Senior therapists and admins can still edit scores until it is approved. Are you sure you want to proceed?`;
    }
    return 'Submit this assessment for review? It will appear under Submitted. Senior therapists and admins can still edit scores until it is approved.';
}

export function matrixScoresEntryAllowed(
    cycleScoresLoadState: CycleScoresLoadState
): boolean {
    return cycleScoresLoadState === 'loaded';
}

export function comparisonLoadIsDistinguishableFromEmpty(
    state: ComparisonScoresLoadState
): boolean {
    return state === 'loaded' || state === 'none';
}

export interface CycleSummaryLike {
    id: string;
    cycle_number: number;
}

export type CycleScoresLoadResult =
    | { kind: 'stale' }
    | {
          kind: 'primary_error';
          cycleScoresLoadError: string;
      }
    | {
          kind: 'success';
          scores: ScoreRowLike[];
          previousScores: ScoreRowLike[];
          comparisonScoresLoadState: ComparisonScoresLoadState;
          comparisonScoresLoadError: string | null;
      };

const DEFAULT_PRIMARY_LOAD_ERROR =
    'Scores for this cycle could not be loaded. Entry is blocked so blank cells are not mistaken for an unscored assessment.';

const DEFAULT_COMPARISON_LOAD_ERROR =
    'Comparison cycle scores could not be loaded. Trend arrows may be unavailable until you retry.';

/**
 * Loads primary and comparison cycle scores with stale-request discard.
 * Extracted so out-of-order responses are testable without mounting the page.
 */
export async function fetchCycleScoresBundle(input: {
    requestId: number;
    getCurrentRequestId: () => number;
    cycleId: string;
    compareCycleId: string | null;
    cycles: readonly CycleSummaryLike[];
    getScores: (cycleId: string) => Promise<ScoreRowLike[]>;
}): Promise<CycleScoresLoadResult> {
    try {
        const cycleScores = await input.getScores(input.cycleId);
        if (shouldDiscardStaleRequest(input.requestId, input.getCurrentRequestId())) {
            return { kind: 'stale' };
        }

        let targetCompareId = input.compareCycleId;
        if (!targetCompareId || targetCompareId === input.cycleId) {
            const sortedCycles = [...input.cycles].sort(
                (a, b) => b.cycle_number - a.cycle_number
            );
            const currentIndex = sortedCycles.findIndex((c) => c.id === input.cycleId);
            const prevCycle = sortedCycles[currentIndex + 1];
            if (prevCycle) {
                targetCompareId = prevCycle.id;
            }
        }

        if (targetCompareId) {
            try {
                const ghosts = await input.getScores(targetCompareId);
                if (shouldDiscardStaleRequest(input.requestId, input.getCurrentRequestId())) {
                    return { kind: 'stale' };
                }
                return {
                    kind: 'success',
                    scores: cycleScores,
                    previousScores: ghosts,
                    comparisonScoresLoadState: 'loaded',
                    comparisonScoresLoadError: null,
                };
            } catch {
                if (shouldDiscardStaleRequest(input.requestId, input.getCurrentRequestId())) {
                    return { kind: 'stale' };
                }
                return {
                    kind: 'success',
                    scores: cycleScores,
                    previousScores: [],
                    comparisonScoresLoadState: 'error',
                    comparisonScoresLoadError: DEFAULT_COMPARISON_LOAD_ERROR,
                };
            }
        }

        if (shouldDiscardStaleRequest(input.requestId, input.getCurrentRequestId())) {
            return { kind: 'stale' };
        }
        return {
            kind: 'success',
            scores: cycleScores,
            previousScores: [],
            comparisonScoresLoadState: 'none',
            comparisonScoresLoadError: null,
        };
    } catch {
        if (shouldDiscardStaleRequest(input.requestId, input.getCurrentRequestId())) {
            return { kind: 'stale' };
        }
        return {
            kind: 'primary_error',
            cycleScoresLoadError: DEFAULT_PRIMARY_LOAD_ERROR,
        };
    }
}
