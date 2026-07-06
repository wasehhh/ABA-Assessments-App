import { LearnerMapCycleSummary } from '../../../services/learnerMapProfile';
import { formatCycleLabel } from './recordShared';

interface Props {
    cycles: LearnerMapCycleSummary[];
    cycleDateLabels?: Record<string, string>;
    labelWidth?: string;
    className?: string;
}

export function CycleAxis({
    cycles,
    cycleDateLabels,
    labelWidth = 'w-36',
    className = '',
}: Props) {
    return (
        <div
            className={`flex items-end gap-2 text-[10px] text-gray-500 ${className}`}
            data-assessment-snapshot-cycle-axis
        >
            <span className={`shrink-0 ${labelWidth}`} aria-hidden />
            <div className="flex gap-px">
                {cycles.map((cycle) => (
                    <div
                        key={cycle.cycleId}
                        className="flex min-w-[2.25rem] flex-col items-center justify-end"
                    >
                        <span className="font-semibold tabular-nums text-gray-700">
                            C{cycle.cycleNumber}
                        </span>
                        {cycleDateLabels?.[cycle.cycleId] ? (
                            <span className="max-w-[2.5rem] truncate text-[9px]">
                                {cycleDateLabels[cycle.cycleId]}
                            </span>
                        ) : null}
                        <span className="sr-only">{formatCycleLabel(cycle, cycleDateLabels)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
