import { LearnerMapCycleSummary } from '../../../services/learnerMapProfile';
import { resolveThreadConnectorGeometry } from './domainZoneLayout';
import { ThreadsLayoutTokens } from './threadsLayout';

interface Props {
    cycles: LearnerMapCycleSummary[];
    layout: ThreadsLayoutTokens;
    labelOffsetClass: string;
}

/**
 * Domain cycle axis — C1 / C2 / … / max only.
 * Dates live once in the document Cycle Reference.
 */
export function CycleColumnHeader({ cycles, layout, labelOffsetClass }: Props) {
    const geometry = resolveThreadConnectorGeometry(layout.tier, cycles.length);

    return (
        <div
            className={`flex w-full items-end ${layout.beadGapClass} ${labelOffsetClass} font-medium text-gray-500 ${layout.cycleHeaderClass}`}
            data-assessment-snapshot-cycle-header
        >
            {cycles.map((cycle) => (
                <div
                    key={cycle.cycleId}
                    className={`${layout.beadSlotWidthClass} shrink-0 text-center leading-none`}
                    data-cycle-id={cycle.cycleId}
                >
                    <div className="tabular-nums text-gray-600">C{cycle.cycleNumber}</div>
                </div>
            ))}
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
