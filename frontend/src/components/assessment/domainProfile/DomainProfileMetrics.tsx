import { DomainCycleDelta } from '../../../services/domainProfile';

interface Coverage {
    scored: number;
    total: number;
}

interface PointsCaptured {
    earned: number;
    available: number;
    percentage: number;
}

interface Props {
    coverage: Coverage;
    pointsCaptured: PointsCaptured;
    cycleDelta: DomainCycleDelta | null;
}

export function DomainProfileMetrics({ coverage, pointsCaptured, cycleDelta }: Props) {
    const showAtMaximumDelta = cycleDelta != null && cycleDelta.atMaximumDelta > 0;
    const showNewlyScoredDelta = cycleDelta != null && cycleDelta.newlyScoredDelta > 0;

    return (
        <div className="space-y-3">
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Coverage</h4>
                <p className="mt-1 text-sm text-gray-900">
                    {coverage.scored} of {coverage.total} targets scored
                </p>
            </div>

            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Points Captured</h4>
                <p className="mt-1 text-sm text-gray-900">
                    {pointsCaptured.percentage}% of available points
                </p>
                <p className="mt-0.5 text-xs text-gray-500 tabular-nums">
                    {pointsCaptured.earned} / {pointsCaptured.available} points
                </p>
            </div>

            {cycleDelta != null && (showAtMaximumDelta || showNewlyScoredDelta) && (
                <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cycle Delta</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {showAtMaximumDelta && (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                +{cycleDelta.atMaximumDelta} At Maximum
                            </span>
                        )}
                        {showNewlyScoredDelta && (
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                                +{cycleDelta.newlyScoredDelta} Newly Scored
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
