import {
    maxRingLegendSwatchClass,
    resolveSnapshotLegendCopy,
} from './snapshotVisualSystem';
import { scoredBeadClass, unscoredBeadClass } from './targetThreadsShared';

interface Props {
    showScores?: boolean;
}

export function AssessmentSnapshotThreadsLegend({ showScores = true }: Props) {
    const legend = resolveSnapshotLegendCopy({ showScores });

    return (
        <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-200 pb-2.5 text-[10px] leading-snug text-gray-700 print:border-gray-400 print:pb-1.5 print:text-[9px] print:text-black"
            data-assessment-snapshot-legend
        >
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {legend.states.map((state) => {
                    const swatchClass =
                        state.key === 'unscored'
                            ? unscoredBeadClass()
                            : scoredBeadClass(state.key);

                    return (
                        <span key={state.key} className="inline-flex items-center gap-1">
                            <span
                                className={`inline-flex h-2.5 w-2.5 items-center justify-center rounded-full print:border print:border-gray-600 ${swatchClass}`}
                                aria-hidden
                            />
                            <span>{state.label}</span>
                        </span>
                    );
                })}
                <span className="inline-flex items-center gap-1">
                    <span
                        className={`inline-flex h-2.5 w-2.5 items-center justify-center ${maxRingLegendSwatchClass()}`}
                        aria-hidden
                        data-assessment-snapshot-legend-max
                    />
                    <span>Maximum</span>
                </span>
            </div>
            <p className="text-[9px] text-gray-500 print:text-[8px] print:text-black">
                {legend.scoreHint}
                <span className="mx-1.5 text-gray-300" aria-hidden>
                    ·
                </span>
                {legend.maxHint}
            </p>
        </div>
    );
}
