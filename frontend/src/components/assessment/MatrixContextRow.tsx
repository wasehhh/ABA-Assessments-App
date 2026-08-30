import { useId } from 'react';

export interface MatrixContextCycleOption {
    id: string;
    cycle_number: number;
}

interface MatrixContextRowProps {
    cycles: readonly MatrixContextCycleOption[];
    viewingCycleId: string | null;
    compareCycleId: string | null;
    onCompareCycleChange: (cycleId: string | null) => void;
    comparisonError: string | null;
    submitDisabledReason: string | null;
}

export function MatrixContextRow({
    cycles,
    viewingCycleId,
    compareCycleId,
    onCompareCycleChange,
    comparisonError,
    submitDisabledReason,
}: MatrixContextRowProps) {
    const selectId = useId();
    const otherCycles = cycles.filter((cycle) => cycle.id !== viewingCycleId);
    const showCompare = otherCycles.length > 0;
    const showDisableReason = Boolean(submitDisabledReason);

    if (!showCompare && !showDisableReason) {
        return null;
    }

    return (
        <div
            className="border-b border-gray-200 bg-white"
            data-matrix-context-row
        >
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
                {showCompare ? (
                    <>
                        <label
                            htmlFor={selectId}
                            className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                            Compare with cycle
                        </label>
                        <select
                            id={selectId}
                            value={compareCycleId || ''}
                            onChange={(e) =>
                                onCompareCycleChange(e.target.value === '' ? null : e.target.value)
                            }
                            className="rounded border-gray-300 py-1 text-xs focus:ring-emerald-500"
                        >
                            <option value="">None</option>
                            {otherCycles.map((cycle) => (
                                <option key={cycle.id} value={cycle.id}>
                                    Cycle {cycle.cycle_number}
                                </option>
                            ))}
                        </select>
                    </>
                ) : null}
                {comparisonError ? (
                    <span className="text-xs text-amber-800" role="status">
                        {comparisonError}
                    </span>
                ) : null}
                {showDisableReason ? (
                    <span
                        className="text-xs text-amber-800"
                        role="status"
                        data-matrix-submit-disable-reason
                    >
                        {submitDisabledReason}
                    </span>
                ) : null}
            </div>
        </div>
    );
}
