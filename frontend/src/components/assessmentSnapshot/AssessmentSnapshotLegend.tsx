import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';

export function AssessmentSnapshotLegend() {
    return (
        <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-200 pb-3 text-[11px] text-gray-700"
            data-assessment-snapshot-legend
        >
            <span className="font-semibold uppercase tracking-wide text-gray-500">Legend</span>
            {STATE_BUCKET_DISPLAY.map((bucket) => (
                <span key={bucket.key} className="inline-flex items-center gap-1.5">
                    <span
                        className={`inline-block h-3 w-3 rounded-sm border border-gray-300 ${bucket.segmentClass}`}
                        aria-hidden
                    />
                    <span>{bucket.label}</span>
                </span>
            ))}
        </div>
    );
}
