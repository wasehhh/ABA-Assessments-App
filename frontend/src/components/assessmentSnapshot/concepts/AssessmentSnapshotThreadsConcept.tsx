import {
    cellForTargetCycle,
    SnapshotConceptProps,
    SnapshotCycleSegment,
    SnapshotMissingSegment,
} from './snapshotConceptShared';

export function AssessmentSnapshotThreadsConcept({ profile, cycleDateLabels }: SnapshotConceptProps) {
    return (
        <div className="space-y-8" data-assessment-snapshot-concept="threads">
            {profile.domains.map((domain) => (
                <section key={domain.domainId} className="relative pl-6">
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-900">
                        {domain.title}
                    </h2>
                    <div
                        className="absolute bottom-2 left-2 top-8 w-0.5 rounded-full bg-gradient-to-b from-slate-400 via-slate-500 to-slate-400"
                        aria-hidden
                    />
                    <ul className="space-y-4">
                        {domain.targets.map((target) => (
                            <li key={target.targetId} className="relative flex items-center gap-3">
                                <div
                                    className="absolute -left-[1.125rem] z-10 h-3 w-3 rounded-full border-2 border-slate-600 bg-white shadow-sm"
                                    aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                    <p
                                        className="mb-1 truncate text-[10px] font-semibold text-gray-800"
                                        title={target.title}
                                    >
                                        {target.title}
                                    </p>
                                    <div className="flex gap-0.5">
                                        {profile.cycles.map((cycle) => {
                                            const cell = cellForTargetCycle(target, cycle.cycleId);
                                            if (!cell) {
                                                return (
                                                    <SnapshotMissingSegment
                                                        key={`${target.targetId}-${cycle.cycleId}`}
                                                        cycle={cycle}
                                                        targetTitle={target.title}
                                                        className="h-6 w-6 rounded-full"
                                                    />
                                                );
                                            }

                                            return (
                                                <SnapshotCycleSegment
                                                    key={`${target.targetId}-${cycle.cycleId}`}
                                                    cell={cell}
                                                    cycle={cycle}
                                                    targetTitle={target.title}
                                                    className="h-6 w-6 rounded-full"
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {cycleDateLabels ? (
                        <p className="mt-2 text-[10px] text-gray-500">Knot tooltips include cycle dates.</p>
                    ) : null}
                </section>
            ))}
        </div>
    );
}
