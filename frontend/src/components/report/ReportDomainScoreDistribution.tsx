import { StateDistribution } from '../../services/domainProfile';
import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';

interface Props {
    distribution: StateDistribution;
}

/**
 * Print-safe domain-level score-band bar for Assessment Report domain detail sections.
 * Uses shared stateDisplay labels/colors; no tooltips or interactive affordances.
 */
export function ReportDomainScoreDistribution({ distribution }: Props) {
    const visibleBuckets = STATE_BUCKET_DISPLAY.filter(
        (bucket) => bucket.key !== 'in_progress' || distribution.showsInProgressBucket
    );

    const total = visibleBuckets.reduce(
        (sum, bucket) => sum + distribution[bucket.key],
        0
    );

    return (
        <div className="space-y-2 print:space-y-1.5">
            <div
                className="flex h-2.5 w-full overflow-hidden rounded-full border border-gray-300 bg-gray-100 print:h-2.5 print:border-gray-500 print:bg-gray-200"
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
                            className={`h-full ${bucket.segmentClass} print:border-r print:border-gray-500`}
                            style={{ width: `${width}%` }}
                        />
                    );
                })}
            </div>

            <p className="text-xs text-gray-700 tabular-nums print:text-[11px] print:text-black">
                {visibleBuckets.map((bucket, index) => {
                    const count = distribution[bucket.key];

                    return (
                        <span key={bucket.key}>
                            {index > 0 && <span className="text-gray-400 print:text-gray-600"> · </span>}
                            <span className="inline-flex items-center gap-1">
                                <span
                                    className={`inline-block h-2 w-2 shrink-0 rounded-sm border ${bucket.legendClass} print:border-gray-600 print:bg-white`}
                                    aria-hidden
                                />
                                {bucket.label} {count}
                            </span>
                        </span>
                    );
                })}
            </p>
        </div>
    );
}
