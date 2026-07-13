import { LearnerMapCycleSummary, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { SnapshotLayoutMode, TargetThreadPlan } from '../../../utils/snapshotLayoutEngine';
import { EvidenceBead } from './EvidenceBead';
import { resolveThreadConnectorGeometry } from './domainZoneLayout';
import { resolveBeadCell } from './snapshotRenderHelpers';
import { resolveThreadLabelDisplay } from './snapshotThreadDisplay';
import { latestCycleId } from './targetThreadsShared';
import { ThreadsLayoutTokens } from './threadsLayout';
import { TargetMaxRing } from './TargetMaxRing';
import { ThreadConnector, ThreadProgressionLine } from './ThreadConnector';

interface Props {
    thread: TargetThreadPlan;
    target: LearnerMapTarget | undefined;
    cycles: LearnerMapCycleSummary[];
    cycleDateLabels?: Record<string, string>;
    layout: ThreadsLayoutTokens;
    layoutMode: SnapshotLayoutMode;
}

export function TargetThread({
    thread,
    target,
    cycles,
    cycleDateLabels,
    layout,
    layoutMode,
}: Props) {
    const displayTarget = target ?? {
        targetId: thread.targetId,
        title: thread.title,
        displayTargetMax: '—',
        cells: [],
    };
    const labelDisplay = resolveThreadLabelDisplay(displayTarget, thread.targetIndex, layoutMode);
    const latestId = latestCycleId(cycles);
    const cyclesById = new Map(cycles.map((cycle) => [cycle.cycleId, cycle]));
    const connectorGeometry = resolveThreadConnectorGeometry(layout.tier, cycles.length);

    return (
        <div
            className="relative flex min-w-0 items-center gap-1"
            data-assessment-snapshot-target-thread
            data-assessment-snapshot-thread
            data-target-id={thread.targetId}
            data-target-index={thread.targetIndex}
        >
            <span
                className={`shrink-0 text-left font-mono font-semibold tabular-nums leading-tight text-gray-900 ${layout.labelWidthClass} ${layout.threadLabelClass}`}
                title={labelDisplay.accessibleLabel}
                aria-label={labelDisplay.accessibleLabel}
            >
                {labelDisplay.showSubtitle && labelDisplay.subtitle ? (
                    <span className="flex flex-col gap-0.5">
                        <span className="leading-none">{labelDisplay.visibleCode}</span>
                        <span className="font-sans text-[7px] font-normal normal-case leading-tight text-gray-500">
                            {labelDisplay.subtitle}
                        </span>
                    </span>
                ) : (
                    labelDisplay.visibleCode
                )}
            </span>
            <div className="relative flex min-w-0 flex-1 items-center">
                <div className="relative z-10 flex min-w-0 items-center">
                    <div className={`relative flex items-center ${layout.beadGapClass}`}>
                        <ThreadProgressionLine />
                        {thread.marks.map((mark) => {
                            const cycle = cyclesById.get(mark.cycleId);
                            if (!cycle) {
                                return null;
                            }

                            const cell = resolveBeadCell(mark, target);

                            return (
                                <div
                                    key={`${thread.targetId}-${mark.cycleId}`}
                                    className={`relative z-10 flex shrink-0 items-center justify-center ${layout.beadSlotWidthClass}`}
                                >
                                    <EvidenceBead
                                        cell={cell}
                                        cycle={cycle}
                                        targetTitle={labelDisplay.fullTitle}
                                        targetId={thread.targetId}
                                        cycleDateLabels={cycleDateLabels}
                                        isLatestCycle={cycle.cycleId === latestId}
                                        layout={layout}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
                <ThreadConnector geometry={connectorGeometry} />
                <div
                    className="relative z-10 flex shrink-0 items-center justify-center"
                    style={{
                        marginLeft: `${connectorGeometry.arrowToMaxGapRem}rem`,
                        width: `${connectorGeometry.maxRingSlotRem}rem`,
                    }}
                    data-assessment-snapshot-max-ring-slot
                >
                    <TargetMaxRing
                        maxDisplay={displayTarget.displayTargetMax}
                        targetTitle={labelDisplay.fullTitle}
                        targetId={thread.targetId}
                        sizeClass={layout.maxRingSize}
                    />
                </div>
            </div>
        </div>
    );
}
