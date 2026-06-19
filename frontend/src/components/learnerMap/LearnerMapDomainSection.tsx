import {
    LearnerMapCycleSummary,
    LearnerMapDomain,
} from '../../services/learnerMapProfile';
import { LearnerMapCell } from './LearnerMapCell';

interface Props {
    domain: LearnerMapDomain;
    cycles: LearnerMapCycleSummary[];
}

export function LearnerMapDomainSection({ domain, cycles }: Props) {
    return (
        <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">{domain.title}</h2>

            {cycles.length === 0 ? (
                <p className="text-sm text-gray-600">No cycles available for this domain.</p>
            ) : domain.targets.length === 0 ? (
                <p className="text-sm text-gray-600">No targets in this domain.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[32rem] border-collapse text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-300 text-left">
                                <th className="min-w-[12rem] pb-2 pr-3 font-semibold text-gray-900">
                                    Target
                                </th>
                                {cycles.map((cycle) => (
                                    <th
                                        key={cycle.cycleId}
                                        className="pb-2 px-1 text-center font-semibold text-gray-900 tabular-nums"
                                    >
                                        Cycle {cycle.cycleNumber}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {domain.targets.map((target) => (
                                <tr key={target.targetId} className="border-b border-gray-100">
                                    <th
                                        scope="row"
                                        className="py-2 pr-3 text-left font-medium text-gray-800 leading-snug"
                                    >
                                        {target.title}
                                    </th>
                                    {target.cells.map((cell) => (
                                        <LearnerMapCell key={`${target.targetId}-${cell.cycleId}`} cell={cell} />
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
