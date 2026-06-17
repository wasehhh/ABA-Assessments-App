import { StateDistribution } from '../../services/domainProfile';
import { ReportDomainSection } from '../../services/reportProfile';
import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';

interface Props {
    domains: ReportDomainSection[];
}

function coveragePercent(scored: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((scored / total) * 100);
}

function ReportCompactBandBar({ distribution }: { distribution: StateDistribution }) {
    const visibleBuckets = STATE_BUCKET_DISPLAY.filter(
        (bucket) => bucket.key !== 'in_progress' || distribution.showsInProgressBucket
    );

    const total = visibleBuckets.reduce(
        (sum, bucket) => sum + distribution[bucket.key],
        0
    );

    return (
        <div
            className="flex h-2 w-full min-w-[6rem] max-w-xs overflow-hidden rounded-full border border-gray-300 bg-gray-100 print:h-2 print:border-gray-400 print:bg-gray-200"
            role="img"
            aria-label="Domain score distribution"
        >
            {visibleBuckets.map((bucket) => {
                const count = distribution[bucket.key];
                const width = total > 0 ? (count / total) * 100 : 0;

                if (count === 0) return null;

                return (
                    <div
                        key={bucket.key}
                        className={`h-full ${bucket.segmentClass} print:border-r print:border-white/80`}
                        style={{ width: `${width}%` }}
                    />
                );
            })}
        </div>
    );
}

export function ReportDomainSummaryTable({ domains }: Props) {
    if (domains.length === 0) {
        return (
            <p className="text-sm text-gray-600 print:text-gray-800">
                No domains available in this assessment.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[36rem] border-collapse text-sm print:text-[13px]">
                <thead>
                    <tr className="border-b border-gray-300 text-left print:border-gray-400">
                        <th className="pb-2 pr-4 font-semibold text-gray-900 print:pb-1.5">Domain</th>
                        <th className="pb-2 pr-4 font-semibold text-gray-900 print:pb-1.5">Coverage</th>
                        <th className="pb-2 pr-4 font-semibold text-gray-900 print:pb-1.5">Points Captured</th>
                        <th className="pb-2 font-semibold text-gray-900 print:pb-1.5">Distribution</th>
                    </tr>
                </thead>
                <tbody>
                    {domains.map((section) => {
                        const { profile } = section;
                        const { scored, total } = profile.coverage;
                        const coveragePct = coveragePercent(scored, total);

                        return (
                            <tr
                                key={profile.domainId}
                                className="border-b border-gray-100 last:border-b-0 print:border-gray-200"
                            >
                                <td className="py-2.5 pr-4 align-middle font-medium text-gray-900 leading-snug print:py-2">
                                    {profile.title}
                                </td>
                                <td className="py-2.5 pr-4 align-middle tabular-nums text-gray-700 whitespace-nowrap print:py-2">
                                    {scored} of {total} scored ({coveragePct}%)
                                </td>
                                <td className="py-2.5 pr-4 align-middle tabular-nums text-gray-700 whitespace-nowrap print:py-2">
                                    {profile.pointsCaptured.percentage}%
                                </td>
                                <td className="py-2.5 align-middle print:py-2">
                                    <ReportCompactBandBar distribution={profile.stateDistribution} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
