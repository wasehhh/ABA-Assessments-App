import { LearnerMapCycleSummary, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { TargetThreadPlan } from '../../../utils/snapshotLayoutEngine';
import { EvidenceBead } from './EvidenceBead';
import { resolveBeadCell } from './snapshotRenderHelpers';
import { latestCycleId } from './targetThreadsShared';
import { resolveThreadDisplayLabel, ThreadsLayoutTokens } from './threadsLayout';
import { TargetMaxRing } from './TargetMaxRing';
import { ThreadConnector } from './ThreadConnector';

interface Props {
    thread: TargetThreadPlan;
    target: LearnerMapTarget | undefined;
    cycles: LearnerMapCycleSummary[];
    cycleDateLabels?: Record<string, string>;
    layout: ThreadsLayoutTokens;
}

export function TargetThread({
    thread,
    target,
    cycles,
    cycleDateLabels,
    layout,
}: Props) {
    const displayTarget = target ?? {
        targetId: thread.targetId,
        title: thread.title,
        displayTargetMax: '—',
        cells: [],
    };
    const { primary, fullTitle } = resolveThreadDisplayLabel(displayTarget, thread.targetIndex);
    const latestId = latestCycleId(cycles);
    const cyclesById = new Map(cycles.map((cycle) => [cycle.cycleId, cycle]));

    return (
        <div
            className="relative flex min-w-0 items-center gap-1"
            data-assessment-snapshot-target-thread
            data-assessment-snapshot-thread
            data-target-id={thread.targetId}
            data-target-index={thread.targetIndex}
        >
            <span
                className={`shrink-0 truncate text-left font-mono font-semibold tabular-nums leading-none text-gray-900 ${layout.labelWidthClass} ${layout.threadLabelClass}`}
                title={`${fullTitle} (${thread.targetId})`}
            >
                {primary}
            </span>
            <div className="relative flex min-w-0 flex-1 items-center">
                <ThreadConnector insetRightClass={layout.connectorInsetRight} />
                <div className={`relative z-10 flex items-center ${layout.beadGapClass}`}>
                    {thread.marks.map((mark) => {
                        const cycle = cyclesById.get(mark.cycleId);
                        if (!cycle) {
                            return null;
                        }

                        const cell = resolveBeadCell(mark, target);

                        return (
                            <div
                                key={`${thread.targetId}-${mark.cycleId}`}
                                className={`flex shrink-0 items-center justify-center ${layout.beadSlotWidthClass}`}
                            >
                                <EvidenceBead
                                    cell={cell}
                                    cycle={cycle}
                                    targetTitle={fullTitle}
                                    targetId={thread.targetId}
                                    cycleDateLabels={cycleDateLabels}
                                    isLatestCycle={cycle.cycleId === latestId}
                                    layout={layout}
                                />
                            </div>
                        );
                    })}
                </div>
                <div className="relative z-10 ml-0.5 flex shrink-0 items-center">
                    <TargetMaxRing
                        maxDisplay={displayTarget.displayTargetMax}
                        targetTitle={fullTitle}
                        targetId={thread.targetId}
                        sizeClass={layout.maxRingSize}
                    />
                </div>
            </div>
        </div>
    );
}
