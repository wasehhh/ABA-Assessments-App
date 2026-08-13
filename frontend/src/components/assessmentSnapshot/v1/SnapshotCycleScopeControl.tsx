import { LearnerMapCycleSummary } from '../../../services/learnerMapProfile';
import {
    recentPresetScope,
    resolveIncludedCycleIds,
    scopeFromExplicitSelection,
    SNAPSHOT_CYCLE_SCOPE_COMPLETE,
    SNAPSHOT_RECENT_PRESET_N,
    SnapshotCycleScope,
} from './snapshotCycleScope';

interface Props {
    cycles: LearnerMapCycleSummary[];
    scope: SnapshotCycleScope;
    onChange: (scope: SnapshotCycleScope) => void;
}

/**
 * Snapshot cycle scope control — All / Most recent 3 / per-cycle toggles.
 * Non-contiguous selections are first-class (contract §6.1).
 */
export function SnapshotCycleScopeControl({ cycles, scope, onChange }: Props) {
    const includedIds = new Set(resolveIncludedCycleIds(scope, cycles));
    const allSelected = cycles.length > 0 && includedIds.size === cycles.length;
    const isRecentPreset = scope.kind === 'recent' && scope.n === SNAPSHOT_RECENT_PRESET_N;

    const applySelection = (nextSelected: string[]) => {
        onChange(scopeFromExplicitSelection(nextSelected, cycles));
    };

    const toggleCycle = (cycleId: string, checked: boolean) => {
        const next = cycles
            .map((cycle) => cycle.cycleId)
            .filter((id) => (id === cycleId ? checked : includedIds.has(id)));
        if (next.length === 0) {
            onChange(SNAPSHOT_CYCLE_SCOPE_COMPLETE);
            return;
        }
        applySelection(next);
    };

    return (
        <div
            className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            data-assessment-snapshot-cycle-scope-control
        >
            <span className="font-medium text-gray-800">Cycles</span>
            <button
                type="button"
                className={`rounded border px-2 py-0.5 text-xs font-medium ${
                    allSelected && scope.kind === 'complete'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                data-assessment-snapshot-cycle-scope-all
                aria-pressed={allSelected && scope.kind === 'complete'}
                onClick={() => onChange(SNAPSHOT_CYCLE_SCOPE_COMPLETE)}
            >
                All cycles
            </button>
            <button
                type="button"
                className={`rounded border px-2 py-0.5 text-xs font-medium ${
                    isRecentPreset
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                data-assessment-snapshot-cycle-scope-recent
                aria-pressed={isRecentPreset}
                onClick={() => onChange(recentPresetScope())}
            >
                Most recent {SNAPSHOT_RECENT_PRESET_N}
            </button>
            <span className="mx-0.5 hidden text-gray-300 sm:inline" aria-hidden>
                |
            </span>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {cycles.map((cycle) => {
                    const checked = includedIds.has(cycle.cycleId);
                    return (
                        <li key={cycle.cycleId}>
                            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={checked}
                                    data-cycle-id={cycle.cycleId}
                                    onChange={(event) =>
                                        toggleCycle(cycle.cycleId, event.target.checked)
                                    }
                                />
                                C{cycle.cycleNumber}
                            </label>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
