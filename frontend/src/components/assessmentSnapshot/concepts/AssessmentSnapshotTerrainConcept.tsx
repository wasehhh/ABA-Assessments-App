import { snapshotCellClass, snapshotCellLabel } from '../snapshotCellDisplay';
import {
    cellForTargetCycle,
    formatCycleLabel,
    SnapshotConceptProps,
} from './snapshotConceptShared';

export function AssessmentSnapshotTerrainConcept({ profile, cycleDateLabels }: SnapshotConceptProps) {
    return (
        <div
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            data-assessment-snapshot-concept="terrain"
        >
            {profile.domains.map((domain) => (
                <section
                    key={domain.domainId}
                    className="rounded border-2 border-gray-300 bg-gradient-to-b from-gray-50 to-white p-2"
                >
                    <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-900">
                        {domain.title}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                        {domain.targets.map((target) => (
                            <div
                                key={target.targetId}
                                className="flex w-[3.25rem] flex-col items-center rounded border border-gray-200 bg-white p-0.5"
                                title={target.title}
                            >
                                <span className="mb-0.5 max-w-full truncate text-[8px] font-medium text-gray-700">
                                    {target.title}
                                </span>
                                <div className="flex h-8 w-full flex-col-reverse gap-px overflow-hidden rounded-sm border border-gray-200">
                                    {profile.cycles.map((cycle) => {
                                        const cell = cellForTargetCycle(target, cycle.cycleId);
                                        if (!cell) {
                                            return (
                                                <div
                                                    key={`${target.targetId}-${cycle.cycleId}`}
                                                    className="min-h-[6px] flex-1 border-t border-dashed border-gray-300 bg-gray-100"
                                                    title={`${target.title} · ${formatCycleLabel(cycle, cycleDateLabels)} · Unscored`}
                                                />
                                            );
                                        }

                                        return (
                                            <div
                                                key={`${target.targetId}-${cycle.cycleId}`}
                                                className={`min-h-[6px] flex-1 border-t border-gray-200 ${snapshotCellClass(cell.competencyState)}`}
                                                title={`${target.title} · ${formatCycleLabel(cycle, cycleDateLabels)} · ${snapshotCellLabel(cell.competencyState)} · ${cell.displayScoreWithMax}`}
                                            />
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
