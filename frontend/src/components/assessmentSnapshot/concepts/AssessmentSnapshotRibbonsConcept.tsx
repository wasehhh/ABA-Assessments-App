import { snapshotCellClass, snapshotCellLabel } from '../snapshotCellDisplay';
import {
    cellForTargetCycle,
    formatCycleLabel,
    SnapshotConceptProps,
    SnapshotMissingSegment,
} from './snapshotConceptShared';

export function AssessmentSnapshotRibbonsConcept({ profile, cycleDateLabels }: SnapshotConceptProps) {
    return (
        <div className="space-y-5" data-assessment-snapshot-concept="ribbons">
            {profile.cycles.map((cycle) => (
                <section key={cycle.cycleId} className="border border-gray-300 bg-white">
                    <h2 className="border-b border-gray-300 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-900">
                        {formatCycleLabel(cycle, cycleDateLabels)}
                    </h2>
                    <div className="divide-y divide-gray-100">
                        {profile.domains.map((domain) => (
                            <div key={`${cycle.cycleId}-${domain.domainId}`} className="px-2 py-1.5">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                                    {domain.title}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {domain.targets.map((target) => {
                                        const cell = cellForTargetCycle(target, cycle.cycleId);
                                        if (!cell) {
                                            return (
                                                <SnapshotMissingSegment
                                                    key={`${cycle.cycleId}-${target.targetId}`}
                                                    cycle={cycle}
                                                    targetTitle={target.title}
                                                    className="h-7 min-w-[2.25rem] rounded px-1"
                                                />
                                            );
                                        }

                                        return (
                                            <div
                                                key={`${cycle.cycleId}-${target.targetId}`}
                                                className={`flex h-7 min-w-[2.25rem] flex-col items-center justify-center rounded px-1 ${snapshotCellClass(cell.competencyState)}`}
                                                title={`${target.title} · ${snapshotCellLabel(cell.competencyState)} · ${cell.displayScoreWithMax}`}
                                                aria-label={`${target.title}, ${snapshotCellLabel(cell.competencyState)}, ${cell.displayScoreWithMax}`}
                                            >
                                                <span className="max-w-[4rem] truncate text-[8px] font-medium text-gray-700">
                                                    {target.title}
                                                </span>
                                                <span className="font-mono text-[9px] font-semibold tabular-nums leading-none text-gray-900">
                                                    {cell.displayScoreWithMax}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
