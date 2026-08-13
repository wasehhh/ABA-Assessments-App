/**
 * Per-assessment Snapshot cycle scope (PR15-1).
 * Follows the show-scores sessionStorage pattern; fail closed toward complete.
 */

import { LearnerMapCycleSummary } from '../../../services/learnerMapProfile';

export const SNAPSHOT_CYCLE_SCOPE_STORAGE_PREFIX = 'snapshot-cycle-scope:';

/** Most recent N — OQ-4 / Slice 1. */
export const SNAPSHOT_RECENT_PRESET_N = 3;

export type SnapshotCycleScope =
    | { kind: 'complete' }
    | { kind: 'cycles'; cycleIds: string[] }
    | { kind: 'recent'; n: number };

export const SNAPSHOT_CYCLE_SCOPE_COMPLETE: SnapshotCycleScope = { kind: 'complete' };

export function snapshotCycleScopeStorageKey(assessmentId: string): string {
    return `${SNAPSHOT_CYCLE_SCOPE_STORAGE_PREFIX}${assessmentId}`;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((entry) => typeof entry === 'string' && entry.length > 0)
    );
}

function parseStoredScope(raw: string | null): SnapshotCycleScope | null {
    if (raw === null || raw === '') {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        const record = parsed as { kind?: unknown; cycleIds?: unknown; n?: unknown };
        if (record.kind === 'complete') {
            return { kind: 'complete' };
        }
        if (record.kind === 'recent') {
            const n = typeof record.n === 'number' && Number.isInteger(record.n) ? record.n : null;
            if (n === SNAPSHOT_RECENT_PRESET_N) {
                return { kind: 'recent', n };
            }
            return null;
        }
        if (record.kind === 'cycles' && isNonEmptyStringArray(record.cycleIds)) {
            return { kind: 'cycles', cycleIds: [...record.cycleIds] };
        }
        return null;
    } catch {
        return null;
    }
}

/** Missing / malformed / unreadable storage → complete (higher-fidelity default). */
export function readSnapshotCycleScope(assessmentId: string): SnapshotCycleScope {
    try {
        const parsed = parseStoredScope(
            sessionStorage.getItem(snapshotCycleScopeStorageKey(assessmentId))
        );
        return parsed ?? SNAPSHOT_CYCLE_SCOPE_COMPLETE;
    } catch {
        return SNAPSHOT_CYCLE_SCOPE_COMPLETE;
    }
}

export function writeSnapshotCycleScope(
    assessmentId: string,
    scope: SnapshotCycleScope
): void {
    try {
        sessionStorage.setItem(
            snapshotCycleScopeStorageKey(assessmentId),
            JSON.stringify(normalizeScopeForWrite(scope))
        );
    } catch {
        // sessionStorage may be unavailable; in-memory UI state still applies on this page.
    }
}

/** Empty / unlawful selections coerce to complete before persistence. */
export function normalizeScopeForWrite(scope: SnapshotCycleScope): SnapshotCycleScope {
    if (scope.kind === 'complete') {
        return SNAPSHOT_CYCLE_SCOPE_COMPLETE;
    }
    if (scope.kind === 'recent') {
        if (scope.n !== SNAPSHOT_RECENT_PRESET_N) {
            return SNAPSHOT_CYCLE_SCOPE_COMPLETE;
        }
        return { kind: 'recent', n: SNAPSHOT_RECENT_PRESET_N };
    }
    const cycleIds = scope.cycleIds.filter((id) => typeof id === 'string' && id.length > 0);
    if (cycleIds.length === 0) {
        return SNAPSHOT_CYCLE_SCOPE_COMPLETE;
    }
    return { kind: 'cycles', cycleIds };
}

/**
 * Resolve included cycle ids in assessment profile order.
 * Empty explicit selection fails closed to all cycles.
 * Sticky `recent` recomputes from the current cycle list.
 */
export function resolveIncludedCycleIds(
    scope: SnapshotCycleScope,
    assessmentCycles: ReadonlyArray<Pick<LearnerMapCycleSummary, 'cycleId'>>
): string[] {
    const allIds = assessmentCycles.map((cycle) => cycle.cycleId);
    if (allIds.length === 0) {
        return [];
    }

    if (scope.kind === 'complete') {
        return allIds;
    }

    if (scope.kind === 'recent') {
        const n = Math.min(scope.n, allIds.length);
        return allIds.slice(-n);
    }

    const selected = new Set(scope.cycleIds);
    const included = allIds.filter((id) => selected.has(id));
    return included.length > 0 ? included : allIds;
}

export function isPartialCycleScope(
    includedCycleIds: readonly string[],
    assessmentCycleCount: number
): boolean {
    return assessmentCycleCount > 0 && includedCycleIds.length < assessmentCycleCount;
}

/**
 * Cycle scope line value for the Cycles metadata field (§5.1).
 * Complete: integer count. Partial: `C1, C4 of 6` — never an en-dash range.
 */
export function formatCycleScopeLineValue(
    includedCycles: ReadonlyArray<Pick<LearnerMapCycleSummary, 'cycleNumber'>>,
    assessmentTotal: number
): string {
    if (assessmentTotal <= 0) {
        return '0';
    }

    if (includedCycles.length === assessmentTotal) {
        return String(assessmentTotal);
    }

    const ascending = [...includedCycles].sort((a, b) => a.cycleNumber - b.cycleNumber);
    const list = ascending.map((cycle) => `C${cycle.cycleNumber}`).join(', ');
    return `${list} of ${assessmentTotal}`;
}

export function scopeFromExplicitSelection(
    selectedCycleIds: readonly string[],
    assessmentCycles: ReadonlyArray<Pick<LearnerMapCycleSummary, 'cycleId'>>
): SnapshotCycleScope {
    const allIds = assessmentCycles.map((cycle) => cycle.cycleId);
    if (allIds.length === 0) {
        return SNAPSHOT_CYCLE_SCOPE_COMPLETE;
    }

    const selected = new Set(selectedCycleIds);
    const ordered = allIds.filter((id) => selected.has(id));
    if (ordered.length === 0) {
        return SNAPSHOT_CYCLE_SCOPE_COMPLETE;
    }
    if (ordered.length === allIds.length) {
        return SNAPSHOT_CYCLE_SCOPE_COMPLETE;
    }
    return { kind: 'cycles', cycleIds: ordered };
}

export function recentPresetScope(): SnapshotCycleScope {
    return { kind: 'recent', n: SNAPSHOT_RECENT_PRESET_N };
}
