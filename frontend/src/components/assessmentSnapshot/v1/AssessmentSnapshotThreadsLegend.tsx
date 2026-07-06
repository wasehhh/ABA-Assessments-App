import { STATE_BUCKET_DISPLAY } from '../../assessment/domainProfile/stateDisplay';
import { scoredBeadClass, unscoredBeadClass } from './targetThreadsShared';

export function AssessmentSnapshotThreadsLegend() {
    return (
        <div
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-gray-200 pb-2 print:border-gray-400 print:pb-1.5"
            data-assessment-snapshot-legend
        >
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-gray-800 print:text-[9px] print:text-black">
                {STATE_BUCKET_DISPLAY.filter((bucket) => bucket.key !== 'unscored').map((bucket) => (
                    <span key={bucket.key} className="inline-flex items-center gap-1">
                        <span
                            className={`inline-flex h-3 w-3 items-center justify-center rounded-full print:border print:border-gray-600 ${scoredBeadClass(bucket.key)}`}
                            aria-hidden
                        />
                        <span>{bucket.label}</span>
                    </span>
                ))}
                <span className="inline-flex items-center gap-1">
                    <span
                        className={`inline-flex h-3 w-3 items-center justify-center rounded-full print:border print:border-gray-600 ${unscoredBeadClass()}`}
                        aria-hidden
                    />
                    <span>Unscored</span>
                </span>
                <span className="inline-flex items-center gap-1">
                    <span
                        className="inline-flex h-3 w-3 items-center justify-center rounded-full border-2 border-green-800 bg-white print:border-gray-800"
                        aria-hidden
                    />
                    <span>Target max</span>
                </span>
            </div>
            <p className="text-[9px] text-gray-600 print:text-[8px] print:text-black">
                bead number = exact score that cycle · colour = competency state
            </p>
        </div>
    );
}
