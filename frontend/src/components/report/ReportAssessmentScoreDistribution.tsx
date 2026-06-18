import { StateDistribution } from '../../services/domainProfile';
import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';

interface Props {
    distribution: StateDistribution;
}

/**
 * Print-safe assessment-wide score-band bar for Assessment Report.
 * Uses shared stateDisplay labels/colors; no tooltips or interactive affordances.
 */
export function ReportAssessmentScoreDistribution({ distribution }: Props) {
    const visibleBuckets = STATE_BUCKET_DISPLAY.filter(
        (bucket) => bucket.key !== 'in_progress' || distribution.showsInProgressBucket
    );

    const total = visibleBuckets.reduce(
        (sum, bucket) => sum + distribution[bucket.key],
        0
    );

    return (
        <div className="space-y-3 print:space-y-2">
            <div
                className="flex h-3 w-full overflow-hidden rounded-full border border-gray-300 bg-gray-100 print:h-3 print:border-gray-500 print:bg-gray-200"
                role="img"
                aria-label="Assessment score distribution"
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

            <div className="flex flex-wrap gap-x-4 gap-y-2 print:gap-x-3 print:gap-y-1">
                {visibleBuckets.map((bucket) => {
                    const count = distribution[bucket.key];

                    return (
                        <div
                            key={bucket.key}
                            className="flex items-center gap-1.5 text-xs text-gray-800 tabular-nums print:text-[11px] print:text-black"
                        >
                            <span
                                className={`h-2.5 w-2.5 shrink-0 rounded-sm border ${bucket.legendClass} print:border-gray-600 print:bg-white`}
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
