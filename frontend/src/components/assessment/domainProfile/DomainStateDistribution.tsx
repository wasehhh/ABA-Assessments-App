import { StateDistribution } from '../../../services/domainProfile';

interface Props {
    distribution: StateDistribution;
}

interface BucketConfig {
    key: keyof Omit<StateDistribution, 'showsInProgressBucket'>;
    label: string;
    segmentClass: string;
    legendClass: string;
}

const BUCKET_CONFIG: BucketConfig[] = [
    {
        key: 'unscored',
        label: 'Unscored',
        segmentClass: 'bg-gray-300',
        legendClass: 'border-gray-300 bg-gray-100',
    },
    {
        key: 'not_yet',
        label: 'Not Yet',
        segmentClass: 'bg-gray-500',
        legendClass: 'border-gray-500 bg-gray-200',
    },
    {
        key: 'in_progress',
        label: 'In Progress',
        segmentClass: 'bg-amber-400',
        legendClass: 'border-amber-400 bg-amber-50',
    },
    {
        key: 'at_maximum',
        label: 'At Maximum',
        segmentClass: 'bg-emerald-600',
        legendClass: 'border-emerald-600 bg-emerald-50',
    },
];

function formatBucketPercentage(count: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((count / total) * 100);
}

export function DomainStateDistribution({ distribution }: Props) {
    const visibleBuckets = BUCKET_CONFIG.filter(
        (bucket) =>
            bucket.key !== 'in_progress' || distribution.showsInProgressBucket
    );

    const total = visibleBuckets.reduce(
        (sum, bucket) => sum + distribution[bucket.key],
        0
    );

    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Score Bands (Summary)
            </h4>

            <div
                className="flex h-3 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100"
                role="img"
                aria-label="Score band distribution"
            >
                {visibleBuckets.map((bucket) => {
                    const count = distribution[bucket.key];
                    const width = total > 0 ? (count / total) * 100 : 0;

                    if (count === 0) return null;

                    return (
                        <div
                            key={bucket.key}
                            className={`h-full ${bucket.segmentClass}`}
                            style={{ width: `${width}%` }}
                            title={`${bucket.label}: ${count}`}
                        />
                    );
                })}
            </div>

            <ul className="space-y-1.5">
                {visibleBuckets.map((bucket) => {
                    const count = distribution[bucket.key];
                    const percentage = formatBucketPercentage(count, total);

                    return (
                        <li
                            key={bucket.key}
                            className="flex items-center justify-between gap-3 text-sm"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <span
                                    className={`h-2.5 w-2.5 shrink-0 rounded-sm border ${bucket.legendClass}`}
                                    aria-hidden
                                />
                                <span className="text-gray-700">{bucket.label}</span>
                            </div>
                            <span className="shrink-0 tabular-nums text-gray-900">
                                {count} ({percentage}%)
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
