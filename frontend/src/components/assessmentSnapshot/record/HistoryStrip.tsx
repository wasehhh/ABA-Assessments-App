import { LearnerMapCycleSummary, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { EvidenceMark, EvidenceMarkDensity, UnscoredEvidenceMark } from './EvidenceMark';
import { cellForTargetCycle } from './recordShared';

interface Props {
    target: LearnerMapTarget;
    cycles: LearnerMapCycleSummary[];
    cycleDateLabels?: Record<string, string>;
    labelWidth?: string;
    density?: EvidenceMarkDensity;
    showLabel?: boolean;
    labelClassName?: string;
}

export function HistoryStrip({
    target,
    cycles,
    cycleDateLabels,
    labelWidth = 'w-36',
    density = 'default',
    showLabel = true,
    labelClassName = '',
}: Props) {
    return (
        <div
            className="flex min-w-0 items-center gap-2"
            data-assessment-snapshot-history-strip
            data-target-id={target.targetId}
        >
            {showLabel ? (
                <span
                    className={`shrink-0 truncate text-left text-[11px] font-medium leading-tight text-gray-800 ${labelWidth} ${labelClassName}`}
                    title={target.title}
                >
                    {target.title}
                </span>
            ) : null}
            <div className="flex min-w-0 flex-1 gap-px overflow-x-auto">
                {cycles.map((cycle) => {
                    const cell = cellForTargetCycle(target, cycle.cycleId);
                    if (!cell) {
                        return (
                            <UnscoredEvidenceMark
                                key={`${target.targetId}-${cycle.cycleId}`}
                                cycle={cycle}
                                targetTitle={target.title}
                                cycleDateLabels={cycleDateLabels}
                                density={density}
                            />
                        );
                    }

                    return (
                        <EvidenceMark
                            key={`${target.targetId}-${cycle.cycleId}`}
                            cell={cell}
                            cycle={cycle}
                            targetTitle={target.title}
                            cycleDateLabels={cycleDateLabels}
                            density={density}
                        />
                    );
                })}
            </div>
        </div>
    );
}
