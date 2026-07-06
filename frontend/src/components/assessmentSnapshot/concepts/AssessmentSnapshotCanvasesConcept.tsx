import { snapshotCellClass, snapshotCellLabel } from '../snapshotCellDisplay';
import {
    cellForTargetCycle,
    formatCycleLabel,
    SnapshotConceptProps,
} from './snapshotConceptShared';

function canvasOffset(index: number): string {
    const offsets = ['translate-x-0', 'translate-x-1', '-translate-x-1', 'translate-x-2', '-translate-x-2'];
    return offsets[index % offsets.length];
}

export function AssessmentSnapshotCanvasesConcept({ profile, cycleDateLabels }: SnapshotConceptProps) {
    return (
        <div
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            data-assessment-snapshot-concept="canvases"
        >
            {profile.domains.map((domain) => (
                <section
                    key={domain.domainId}
                    className="min-h-[10rem] rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-slate-50 to-white p-3"
                >
                    <h2 className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-700">
                        {domain.title}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {domain.targets.map((target, index) => (
                            <div
                                key={target.targetId}
                                className={`flex w-[3.5rem] flex-col items-center ${canvasOffset(index)}`}
                                style={{ marginTop: `${(index % 3) * 4}px` }}
                            >
                                <div
                                    className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm"
                                    title={target.title}
                                >
                                    <div className="absolute inset-1 flex flex-col-reverse gap-px overflow-hidden rounded-full">
                                        {profile.cycles.map((cycle) => {
                                            const cell = cellForTargetCycle(target, cycle.cycleId);
                                            if (!cell) {
                                                return (
                                                    <div
                                                        key={`${target.targetId}-${cycle.cycleId}`}
                                                        className="min-h-[3px] flex-1 bg-gray-100"
                                                        title={`${target.title} · ${formatCycleLabel(cycle, cycleDateLabels)} · Unscored`}
                                                    />
                                                );
                                            }

                                            return (
                                                <div
                                                    key={`${target.targetId}-${cycle.cycleId}`}
                                                    className={`min-h-[3px] flex-1 ${snapshotCellClass(cell.competencyState)}`}
                                                    title={`${target.title} · ${formatCycleLabel(cycle, cycleDateLabels)} · ${snapshotCellLabel(cell.competencyState)} · ${cell.displayScoreWithMax}`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                                <span className="mt-1 max-w-[4rem] truncate text-center text-[8px] text-gray-600">
                                    {target.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
