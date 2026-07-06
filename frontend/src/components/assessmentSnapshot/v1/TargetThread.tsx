import {
    LearnerMapCycleSummary,
    LearnerMapTarget,
} from '../../../services/learnerMapProfile';
import { cellForTargetCycle } from '../record/recordShared';
import { EvidenceBead } from './EvidenceBead';
import { latestCycleId } from './targetThreadsShared';
import { resolveThreadDisplayLabel, ThreadsLayoutTokens } from './threadsLayout';
import { TargetMaxRing } from './TargetMaxRing';
import { ThreadConnector } from './ThreadConnector';

interface Props {
    target: LearnerMapTarget;
    targetIndex: number;
    cycles: LearnerMapCycleSummary[];
    cycleDateLabels?: Record<string, string>;
    layout: ThreadsLayoutTokens;
}

export function TargetThread({
    target,
    targetIndex,
    cycles,
    cycleDateLabels,
    layout,
}: Props) {
    const { primary, fullTitle } = resolveThreadDisplayLabel(target, targetIndex);
    const latestId = latestCycleId(cycles);

    return (
        <div
            className="relative flex min-w-0 items-center gap-1"
            data-assessment-snapshot-target-thread
            data-assessment-snapshot-thread
            data-target-id={target.targetId}
            data-target-index={targetIndex}
        >
            <span
                className={`shrink-0 truncate text-left font-mono font-semibold tabular-nums leading-none text-gray-900 ${layout.labelWidthClass} ${layout.threadLabelClass}`}
                title={`${fullTitle} (${target.targetId})`}
            >
                {primary}
            </span>
            <div className="relative flex min-w-0 flex-1 items-center">
                <ThreadConnector insetRightClass={layout.connectorInsetRight} />
                <div className={`relative z-10 flex items-center ${layout.beadGapClass}`}>
                    {cycles.map((cycle) => {
                        const cell = cellForTargetCycle(target, cycle.cycleId);
                        return (
                            <div
                                key={`${target.targetId}-${cycle.cycleId}`}
                                className={`flex shrink-0 items-center justify-center ${layout.beadSlotWidthClass}`}
                            >
                                <EvidenceBead
                                    cell={cell}
                                    cycle={cycle}
                                    targetTitle={fullTitle}
                                    targetId={target.targetId}
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
                        maxDisplay={target.displayTargetMax}
                        targetTitle={fullTitle}
                        targetId={target.targetId}
                        sizeClass={layout.maxRingSize}
                    />
                </div>
            </div>
        </div>
    );
}
