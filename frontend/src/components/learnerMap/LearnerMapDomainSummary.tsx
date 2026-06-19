import { LearnerMapDomain } from '../../services/learnerMapProfile';

interface Props {
    domains: LearnerMapDomain[];
}

export function LearnerMapDomainSummary({ domains }: Props) {
    if (domains.length === 0) {
        return (
            <p className="text-sm text-gray-600">No domains available in this assessment.</p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] border-collapse text-sm">
                <thead>
                    <tr className="border-b-2 border-gray-300 text-left">
                        <th className="pb-2 pr-4 font-semibold text-gray-900">Domain</th>
                        <th className="pb-2 font-semibold text-gray-900 text-right">Targets</th>
                    </tr>
                </thead>
                <tbody>
                    {domains.map((domain) => (
                        <tr key={domain.domainId} className="border-b border-gray-100 last:border-b-0">
                            <td className="py-2 pr-4 font-medium text-gray-900 leading-snug">
                                {domain.title}
                            </td>
                            <td className="py-2 text-right tabular-nums text-gray-700">
                                {domain.targets.length}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
