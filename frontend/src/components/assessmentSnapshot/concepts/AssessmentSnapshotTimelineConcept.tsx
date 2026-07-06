import { snapshotCellClass, snapshotCellLabel } from '../snapshotCellDisplay';
import {
    cellForTargetCycle,
    formatCycleLabel,
    SnapshotConceptProps,
} from './snapshotConceptShared';

export function AssessmentSnapshotTimelineConcept({ profile, cycleDateLabels }: SnapshotConceptProps) {
    return (
        <div className="space-y-6" data-assessment-snapshot-concept="timeline">
            {profile.domains.map((domain) => (
                <section key={domain.domainId}>
                    <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-900">
                        {domain.title}
                    </h2>
                    <ul className="space-y-2">
                        {domain.targets.map((target) => (
                            <li key={target.targetId} className="flex items-center gap-2">
                                <span
                                    className="w-24 shrink-0 truncate text-[10px] font-medium text-gray-700"
                                    title={target.title}
                                >
                                    {target.title}
                                </span>
                                <div className="relative flex min-w-0 flex-1 items-center py-1">
                                    <div
                                        className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gray-300"
                                        aria-hidden
                                    />
                                    <div className="relative flex w-full justify-between px-1">
                                        {profile.cycles.map((cycle) => {
                                            const cell = cellForTargetCycle(target, cycle.cycleId);
                                            const label = formatCycleLabel(cycle, cycleDateLabels);

                                            if (!cell) {
                                                return (
                                                    <div
                                                        key={`${target.targetId}-${cycle.cycleId}`}
                                                        className="flex flex-col items-center"
                                                        title={`${target.title} · ${label} · Unscored`}
                                                    >
                                                        <div className="h-3 w-3 rounded-full border border-dashed border-gray-400 bg-gray-100" />
                                                        <span className="mt-0.5 max-w-[3rem] truncate text-[8px] text-gray-500">
                                                            C{cycle.cycleNumber}
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={`${target.targetId}-${cycle.cycleId}`}
                                                    className="flex flex-col items-center"
                                                    title={`${target.title} · ${label} · ${snapshotCellLabel(cell.competencyState)} · ${cell.displayScoreWithMax}`}
                                                >
                                                    <div
                                                        className={`flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[8px] font-bold tabular-nums ${snapshotCellClass(cell.competencyState)}`}
                                                    >
                                                        {cell.displayScoreWithMax.length <= 3
                                                            ? cell.displayScoreWithMax
                                                            : '·'}
                                                    </div>
                                                    <span className="mt-0.5 max-w-[3rem] truncate text-[8px] text-gray-500">
                                                        C{cycle.cycleNumber}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
