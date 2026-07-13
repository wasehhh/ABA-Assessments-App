import { LearnerMapCycleSummary } from '../../../services/learnerMapProfile';
import { formatCycleLabel } from '../record/recordShared';
import { resolveThreadConnectorGeometry } from './domainZoneLayout';
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
    const geometry = resolveThreadConnectorGeometry(layout.tier, cycles.length);

    return (
        <div
            className={`flex w-full items-end ${layout.beadGapClass} ${labelOffsetClass} font-medium text-gray-500 ${layout.cycleHeaderClass}`}
            data-assessment-snapshot-cycle-header
        >
            {cycles.map((cycle) => {
                const dateLabel = cycleDateLabels?.[cycle.cycleId];

                return (
                    <div
                        key={cycle.cycleId}
                        className={`${layout.beadSlotWidthClass} shrink-0 text-center leading-tight`}
                        data-cycle-id={cycle.cycleId}
                    >
                        <div className="tabular-nums text-gray-600">C{cycle.cycleNumber}</div>
                        {dateLabel ? (
                            <div
                                className="mt-0.5 truncate text-[7px] font-normal normal-case tracking-normal text-gray-400"
                                title={formatCycleLabel(cycle, cycleDateLabels)}
                            >
                                {dateLabel}
                            </div>
                        ) : null}
                    </div>
                );
            })}
            <div
                className="shrink-0"
                style={{ width: `${geometry.arrowSlotRem}rem` }}
                aria-hidden
            />
            <div
                className="shrink-0 text-center font-normal normal-case tracking-normal text-gray-400"
                style={{
                    marginLeft: `${geometry.arrowToMaxGapRem}rem`,
                    width: `${geometry.maxRingSlotRem}rem`,
                }}
                data-assessment-snapshot-max-axis-label
            >
                max
            </div>
        </div>
    );
}
