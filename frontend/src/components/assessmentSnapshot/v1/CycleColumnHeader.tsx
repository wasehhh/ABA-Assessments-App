import { LearnerMapCycleSummary } from '../../../services/learnerMapProfile';
import { formatCycleLabel } from '../record/recordShared';
import { ThreadsLayoutTokens } from './threadsLayout';

interface Props {
    cycles: LearnerMapCycleSummary[];
    cycleDateLabels?: Record<string, string>;
    layout: ThreadsLayoutTokens;
    labelOffsetClass: string;
}

export function CycleColumnHeader({
    cycles,
    cycleDateLabels,
    layout,
    labelOffsetClass,
}: Props) {
    return (
        <div
            className={`mb-1.5 flex items-end ${layout.beadGapClass} ${labelOffsetClass} font-medium uppercase tracking-wide text-gray-600 ${layout.cycleHeaderClass}`}
            data-assessment-snapshot-cycle-header
        >
            {cycles.map((cycle) => {
                const dateLabel = cycleDateLabels?.[cycle.cycleId];

                return (
                    <div
                        key={cycle.cycleId}
                        className={`${layout.beadSlotWidthClass} text-center leading-none`}
                        data-cycle-id={cycle.cycleId}
                    >
                        <div className="tabular-nums text-gray-700">C{cycle.cycleNumber}</div>
                        {dateLabel ? (
                            <div
                                className="mt-0.5 text-[8px] font-normal normal-case tracking-normal text-gray-500"
                                title={formatCycleLabel(cycle, cycleDateLabels)}
                            >
                                {dateLabel}
                            </div>
                        ) : null}
                    </div>
                );
            })}
            <div className="ml-0.5 w-5 shrink-0 text-center normal-case tracking-normal">max</div>
        </div>
    );
}
