import { LearnerMapDomain } from '../../services/learnerMapProfile';
import { deriveDomainCellStats } from './domainCellDisplay';
import { getDomainIdentity } from './domainIdentity';
import { MOVEMENT_MARKER_ENTRIES, movementMetricEmphasisClass } from './movementDisplay';

interface Props {
    domains: LearnerMapDomain[];
}

const SEGMENT_TEXT_CLASS: Record<string, string> = {
    unscored: 'text-gray-800',
    not_yet: 'text-white',
    in_progress: 'text-gray-900',
    at_maximum: 'text-white',
};

function formatPercent(count: number, total: number): number {
    if (total === 0) {
        return 0;
    }
    return Math.round((count / total) * 100);
}

function ScoreDistributionBar({
    distribution,
    totalCells,
}: {
    distribution: ReturnType<typeof deriveDomainCellStats>['distribution'];
    totalCells: number;
}) {
    if (totalCells === 0) {
        return <span className="text-xs text-gray-500">—</span>;
    }

    const segments = distribution.filter((segment) => segment.count > 0);
    if (segments.length === 0) {
        return <span className="text-xs text-gray-500">—</span>;
    }

    return (
        <div className="min-w-[14rem]">
            <div
                className="flex h-7 overflow-hidden rounded border border-gray-200"
                role="img"
                aria-label={distribution
                    .map((segment) => `${segment.label} ${formatPercent(segment.count, totalCells)}%`)
                    .join(', ')}
            >
                {distribution.map((segment) => {
                    const percent = formatPercent(segment.count, totalCells);
                    if (percent === 0) {
                        return null;
                    }

                    return (
                        <span
                            key={segment.key}
                            className={`${segment.segmentClass} flex items-center justify-center px-0.5 text-[10px] font-semibold leading-none tabular-nums ${SEGMENT_TEXT_CLASS[segment.key]}`}
                            style={{ width: `${percent}%` }}
                            title={`${segment.label}: ${percent}% (${segment.count})`}
                        >
                            {percent >= 8 ? `${percent}%` : ''}
                        </span>
                    );
                })}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] tabular-nums text-gray-600">
                {distribution
                    .filter((segment) => segment.count > 0)
                    .map((segment) => (
                        <span key={segment.key}>
                            {segment.label} {formatPercent(segment.count, totalCells)}%
                        </span>
                    ))}
            </div>
        </div>
    );
}

const MOVEMENT_COLUMNS = MOVEMENT_MARKER_ENTRIES.filter((entry) => entry.key !== 'none').concat(
    MOVEMENT_MARKER_ENTRIES.filter((entry) => entry.key === 'none')
);

function MovementMetric({
    count,
    totalTargets,
    label,
    movementKey,
}: {
    count: number;
    totalTargets: number;
    label: string;
    movementKey: (typeof MOVEMENT_MARKER_ENTRIES)[number]['key'];
}) {
    const percent = formatPercent(count, totalTargets);
    const emphasisClass = movementMetricEmphasisClass(movementKey);
    const deemphasized = movementKey === 'none';

    return (
        <div className="text-center" title={`${label}: ${percent}% (${count} targets)`}>
            <div
                className={`tabular-nums ${emphasisClass} ${
                    deemphasized ? 'text-xs font-medium' : 'text-sm font-semibold'
                }`}
            >
                {percent}%
            </div>
            <div
                className={`mt-0.5 tabular-nums ${
                    deemphasized ? 'text-[10px] text-gray-400' : 'text-[10px] text-gray-500'
                }`}
            >
                ({count})
            </div>
        </div>
    );
}

export function LearnerMapDomainSummary({ domains }: Props) {
    if (domains.length === 0) {
        return (
            <p className="text-sm text-gray-600">No domains available in this assessment.</p>
        );
    }

    return (
        <div data-learner-map-export-l1-table>
            <div className="overflow-x-auto rounded-md border border-gray-200">
                <table className="w-full min-w-[52rem] border-collapse text-sm">
                    <thead className="bg-gray-50">
                        <tr className="border-b border-gray-200 text-left">
                            <th
                                rowSpan={2}
                                className="px-3 py-2.5 align-bottom font-semibold text-gray-900"
                            >
                                Domain
                            </th>
                            <th
                                rowSpan={2}
                                className="px-2 py-2.5 align-bottom text-right text-xs font-semibold text-gray-900"
                            >
                                Coverage
                            </th>
                            <th
                                rowSpan={2}
                                className="min-w-[14rem] px-3 py-2.5 align-bottom font-semibold text-gray-900"
                            >
                                Score Distribution
                            </th>
                            <th
                                colSpan={5}
                                className="border-l border-gray-200 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-900"
                            >
                                Latest Target Movement
                            </th>
                        </tr>
                        <tr className="border-b border-gray-200">
                            {MOVEMENT_COLUMNS.map((column) => (
                                <th
                                    key={column.key}
                                    className="border-l border-gray-100 px-1 py-1.5 text-center text-xs font-bold first:border-l-gray-200"
                                    title={column.label}
                                >
                                    <span
                                        className={
                                            column.key === 'none'
                                                ? 'text-gray-400'
                                                : column.markerClass
                                        }
                                    >
                                        {column.symbol}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {domains.map((domain, index) => {
                            const stats = deriveDomainCellStats(domain);
                            const identity = getDomainIdentity(index);
                            return (
                                <tr
                                    key={domain.domainId}
                                    className={`border-b border-gray-100 last:border-b-0 ${
                                        index % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'
                                    }`}
                                >
                                    <td className="px-3 py-3 font-medium text-gray-900 leading-snug">
                                        <div className="flex items-start gap-2">
                                            <span
                                                className={`mt-0.5 h-4 w-1 shrink-0 rounded-sm ${identity.markerClass}`}
                                                aria-hidden
                                            />
                                            <span>{domain.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 text-right tabular-nums text-base font-semibold text-gray-900">
                                        {stats.coveragePercent}%
                                    </td>
                                    <td className="px-3 py-3">
                                        <ScoreDistributionBar
                                            distribution={stats.distribution}
                                            totalCells={stats.totalCells}
                                        />
                                    </td>
                                    {MOVEMENT_COLUMNS.map((column) => (
                                        <td
                                            key={column.key}
                                            className="border-l border-gray-100 px-1 py-2 first:border-l-gray-200"
                                        >
                                            <MovementMetric
                                                count={stats.movement[column.key]}
                                                totalTargets={stats.targetCount}
                                                label={column.label}
                                                movementKey={column.key}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="mt-3 text-xs text-gray-500" data-learner-map-export-l1-footnote>
                Showing all {domains.length} domain{domains.length === 1 ? '' : 's'}.
            </p>
        </div>
    );
}
