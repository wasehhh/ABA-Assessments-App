import {
    cellForTargetCycle,
    SnapshotConceptProps,
    SnapshotCycleSegment,
    SnapshotMissingSegment,
} from './snapshotConceptShared';

export function AssessmentSnapshotBarcodeConcept({ profile, cycleDateLabels }: SnapshotConceptProps) {
    return (
        <div className="space-y-6" data-assessment-snapshot-concept="barcode">
            {profile.domains.map((domain) => (
                <section key={domain.domainId} className="space-y-1">
                    <h2 className="border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-wide text-gray-800">
                        {domain.title}
                    </h2>
                    <ul className="space-y-0.5">
                        {domain.targets.map((target) => (
                            <li
                                key={target.targetId}
                                className="flex items-stretch gap-1 border-b border-gray-100 py-0.5 last:border-b-0"
                            >
                                <span
                                    className="w-28 shrink-0 truncate pr-1 text-[10px] font-medium leading-tight text-gray-800 sm:w-36"
                                    title={target.title}
                                >
                                    {target.title}
                                </span>
                                <div className="flex min-w-0 flex-1 gap-px">
                                    {profile.cycles.map((cycle) => {
                                        const cell = cellForTargetCycle(target, cycle.cycleId);
                                        if (!cell) {
                                            return (
                                                <SnapshotMissingSegment
                                                    key={`${target.targetId}-${cycle.cycleId}`}
                                                    cycle={cycle}
                                                    targetTitle={target.title}
                                                    className="h-5 min-w-[1.75rem] flex-1 rounded-sm"
                                                />
                                            );
                                        }

                                        return (
                                            <SnapshotCycleSegment
                                                key={`${target.targetId}-${cycle.cycleId}`}
                                                cell={cell}
                                                cycle={cycle}
                                                targetTitle={target.title}
                                                className="h-5 min-w-[1.75rem] flex-1 rounded-sm"
                                            />
                                        );
                                    })}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
            {cycleDateLabels ? (
                <p className="text-[10px] text-gray-500">
                    Cycle dates available on segment tooltips.
                </p>
            ) : null}
        </div>
    );
}
