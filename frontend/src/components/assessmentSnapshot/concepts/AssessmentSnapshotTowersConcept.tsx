import {
    cellForTargetCycle,
    SnapshotConceptProps,
    SnapshotCycleSegment,
    SnapshotMissingSegment,
} from './snapshotConceptShared';

export function AssessmentSnapshotTowersConcept({ profile, cycleDateLabels }: SnapshotConceptProps) {
    return (
        <div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            data-assessment-snapshot-concept="towers"
        >
            {profile.domains.map((domain) => (
                <section
                    key={domain.domainId}
                    className="flex flex-col border border-gray-300 bg-gray-50/50"
                >
                    <h2 className="border-b border-gray-300 bg-white px-2 py-1 text-[10px] font-bold uppercase leading-snug tracking-wide text-gray-900">
                        {domain.title}
                    </h2>
                    <ul className="max-h-[28rem] overflow-y-auto">
                        {domain.targets.map((target, index) => (
                            <li
                                key={target.targetId}
                                className={`flex items-center gap-1 px-1 py-0.5 ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'
                                }`}
                            >
                                <span
                                    className="w-16 shrink-0 truncate text-[9px] font-medium text-gray-700"
                                    title={target.title}
                                >
                                    {target.title}
                                </span>
                                <div className="flex flex-1 gap-px">
                                    {profile.cycles.map((cycle) => {
                                        const cell = cellForTargetCycle(target, cycle.cycleId);
                                        if (!cell) {
                                            return (
                                                <SnapshotMissingSegment
                                                    key={`${target.targetId}-${cycle.cycleId}`}
                                                    cycle={cycle}
                                                    targetTitle={target.title}
                                                    className="h-4 w-4 rounded-[2px]"
                                                />
                                            );
                                        }

                                        return (
                                            <SnapshotCycleSegment
                                                key={`${target.targetId}-${cycle.cycleId}`}
                                                cell={cell}
                                                cycle={cycle}
                                                targetTitle={target.title}
                                                showScoreText={false}
                                                className="h-4 w-4 rounded-[2px]"
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
                <p className="col-span-full text-[10px] text-gray-500">
                    Hover tower segments for cycle dates and exact scores.
                </p>
            ) : null}
        </div>
    );
}
