import { LearnerMapDomain } from '../../services/learnerMapProfile';
import { deriveDomainCellStats } from './domainCellDisplay';

interface Props {
    domains: LearnerMapDomain[];
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
        <div
            className="flex h-3 min-w-[6rem] overflow-hidden rounded-sm border border-gray-200"
            role="img"
            aria-label={segments
                .map((segment) => `${segment.label} ${segment.count}`)
                .join(', ')}
        >
            {segments.map((segment) => (
                <span
                    key={segment.key}
                    className={`${segment.segmentClass}`}
                    style={{ width: `${(segment.count / totalCells) * 100}%` }}
                    title={`${segment.label}: ${segment.count}`}
                />
            ))}
        </div>
    );
}

function MovementSummary({
    movement,
}: {
    movement: ReturnType<typeof deriveDomainCellStats>['movement'];
}) {
    const items: { symbol: string; count: number; label: string }[] = [
        { symbol: '↑', count: movement.up, label: 'higher' },
        { symbol: '=', count: movement.flat, label: 'unchanged' },
        { symbol: '↓', count: movement.down, label: 'lower' },
        { symbol: '+', count: movement.new, label: 'newly scored' },
        { symbol: '–', count: movement.none, label: 'no movement' },
    ];

    const visible = items.filter((item) => item.count > 0);
    if (visible.length === 0) {
        return <span className="text-xs text-gray-500">—</span>;
    }

    return (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs tabular-nums text-gray-800">
            {visible.map((item) => (
                <span key={item.symbol} title={item.label}>
                    <span className="font-medium">{item.symbol}</span> {item.count}
                </span>
            ))}
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
        <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
                <thead>
                    <tr className="border-b-2 border-gray-300 text-left">
                        <th className="pb-2 pr-4 font-semibold text-gray-900">Domain</th>
                        <th className="pb-2 pr-4 font-semibold text-gray-900 text-right">Targets</th>
                        <th className="pb-2 pr-4 font-semibold text-gray-900 text-right">
                            Scored Cells
                        </th>
                        <th className="pb-2 pr-4 font-semibold text-gray-900 text-right">Coverage</th>
                        <th className="pb-2 pr-4 font-semibold text-gray-900 min-w-[8rem]">
                            Score Distribution
                        </th>
                        <th className="pb-2 font-semibold text-gray-900 min-w-[10rem]">
                            Movement Summary
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {domains.map((domain) => {
                        const stats = deriveDomainCellStats(domain);
                        return (
                            <tr
                                key={domain.domainId}
                                className="border-b border-gray-100 last:border-b-0"
                            >
                                <td className="py-2.5 pr-4 font-medium text-gray-900 leading-snug">
                                    {domain.title}
                                </td>
                                <td className="py-2.5 pr-4 text-right tabular-nums text-gray-700">
                                    {stats.targetCount}
                                </td>
                                <td className="py-2.5 pr-4 text-right tabular-nums text-gray-700">
                                    {stats.scoredCells}/{stats.totalCells}
                                </td>
                                <td className="py-2.5 pr-4 text-right tabular-nums text-gray-700">
                                    {stats.coveragePercent}%
                                </td>
                                <td className="py-2.5 pr-4">
                                    <ScoreDistributionBar
                                        distribution={stats.distribution}
                                        totalCells={stats.totalCells}
                                    />
                                </td>
                                <td className="py-2.5">
                                    <MovementSummary movement={stats.movement} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
