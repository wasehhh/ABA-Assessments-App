import { StateDistribution } from '../../../services/domainProfile';
import { STATE_BUCKET_DISPLAY } from './stateDisplay';

interface Props {
    distribution: StateDistribution;
}

function formatBucketPercentage(count: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((count / total) * 100);
}

export function DomainStateDistribution({ distribution }: Props) {
    const visibleBuckets = STATE_BUCKET_DISPLAY.filter(
        (bucket) =>
            bucket.key !== 'in_progress' || distribution.showsInProgressBucket
    );

    const total = visibleBuckets.reduce(
        (sum, bucket) => sum + distribution[bucket.key],
        0
    );

    return (
        <div className="space-y-2">
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
                            title={`${bucket.label}: ${count} targets (${formatBucketPercentage(count, total)}%)`}
                        />
                    );
                })}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {visibleBuckets.map((bucket) => {
                    const count = distribution[bucket.key];
                    const percentage = formatBucketPercentage(count, total);

                    return (
                        <div
                            key={bucket.key}
                            className="flex items-center gap-1.5 text-xs text-gray-700 tabular-nums"
                            title={`${bucket.label}: ${count} targets (${percentage}%)`}
                        >
                            <span
                                className={`h-2.5 w-2.5 shrink-0 rounded-sm border ${bucket.legendClass}`}
                                aria-hidden
                            />
                            <span>
                                {bucket.label} {count}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
