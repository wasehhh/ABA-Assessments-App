import { LearnerMapCycleSummary, LearnerMapDomain } from '../../services/learnerMapProfile';
import { AssessmentSnapshotCell } from './AssessmentSnapshotCell';

interface Props {
    domain: LearnerMapDomain;
    cycles: LearnerMapCycleSummary[];
    cycleDateLabels?: Record<string, string>;
}

function cycleHeaderLabel(cycle: LearnerMapCycleSummary, cycleDateLabels?: Record<string, string>) {
    const dateLabel = cycleDateLabels?.[cycle.cycleId];
    if (dateLabel) {
        return (
            <>
                <span className="block font-semibold">Cycle {cycle.cycleNumber}</span>
                <span className="block text-[10px] font-normal text-gray-500">{dateLabel}</span>
            </>
        );
    }

    return <span>Cycle {cycle.cycleNumber}</span>;
}

function cellForCycle(target: LearnerMapDomain['targets'][number], cycleId: string) {
    return target.cells.find((entry) => entry.cycleId === cycleId) ?? null;
}

export function AssessmentSnapshotGrid({ domain, cycles, cycleDateLabels }: Props) {
    if (domain.targets.length === 0) {
        return <p className="text-sm text-gray-500">No targets in this domain.</p>;
    }

    return (
        <div className="overflow-x-auto" data-assessment-snapshot-grid>
            <table className="w-full min-w-max border-collapse text-sm">
                <thead>
                    <tr className="border-b border-gray-300 bg-gray-50 text-left text-xs text-gray-700">
                        <th className="min-w-[12rem] border border-gray-200 px-2 py-1.5 font-semibold">
                            Target
                        </th>
                        {cycles.map((cycle) => (
                            <th
                                key={cycle.cycleId}
                                className="min-w-[3rem] border border-gray-200 px-1 py-1.5 text-center font-semibold"
                            >
                                {cycleHeaderLabel(cycle, cycleDateLabels)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {domain.targets.map((target) => (
                        <tr key={target.targetId} className="border-b border-gray-100">
                            <th
                                scope="row"
                                className="border border-gray-200 px-2 py-1.5 text-left text-xs font-medium leading-snug text-gray-900"
                            >
                                {target.title}
                            </th>
                            {cycles.map((cycle) => {
                                const cell = cellForCycle(target, cycle.cycleId);
                                if (!cell) {
                                    return (
                                        <td
                                            key={`${target.targetId}-${cycle.cycleId}`}
                                            className="border border-gray-200 bg-gray-50 p-0.5 text-center text-xs text-gray-400"
                                        >
                                            —
                                        </td>
                                    );
                                }

                                return (
                                    <AssessmentSnapshotCell
                                        key={`${target.targetId}-${cycle.cycleId}`}
                                        cell={cell}
                                    />
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
