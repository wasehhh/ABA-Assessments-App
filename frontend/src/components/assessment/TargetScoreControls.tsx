import { ContentPackData, Target } from '../../types';
import { resolveTargetScoring } from '../../utils/assessmentPackStructure';
import {
    formatMatrixScoreButtonLabel,
    getResolvedScaleValues,
} from '../../utils/matrixDisplayHelpers';

interface Props {
    target: Target;
    pack: ContentPackData;
    current: number | null;
    scoresEditable: boolean;
    onScoreUpdate: (value: number) => void;
}

/** Shared score buttons for numeric, yes/no, and checkbox targets (matrix + detail modal). */
export function TargetScoreControls({
    target,
    pack,
    current,
    scoresEditable,
    onScoreUpdate,
}: Props) {
    const scoring = resolveTargetScoring(target, pack);
    const scoringType = scoring.type as string;

    if (scoringType === 'yes_no' || scoringType === 'yesno') {
        return (
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={!scoresEditable}
                    onClick={() => onScoreUpdate(0)}
                    className={`
                        rounded-lg border px-3 py-1.5 text-sm font-medium transition-all
                        ${
                            current === 0
                                ? 'border-gray-600 bg-gray-600 text-white shadow-sm'
                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }
                        ${!scoresEditable ? 'cursor-not-allowed opacity-50' : ''}
                    `}
                >
                    No
                </button>
                <button
                    type="button"
                    disabled={!scoresEditable}
                    onClick={() => onScoreUpdate(1)}
                    className={`
                        rounded-lg border px-3 py-1.5 text-sm font-medium transition-all
                        ${
                            current === 1
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50'
                        }
                        ${!scoresEditable ? 'cursor-not-allowed opacity-50' : ''}
                    `}
                >
                    Yes
                </button>
            </div>
        );
    }

    const scale = getResolvedScaleValues(scoring);
    const useCompactButtons = scoringType !== 'checkbox';

    return (
        <div className="flex flex-wrap gap-1.5">
            {scale.map((val) => {
                const { text, title } = formatMatrixScoreButtonLabel(val, scoring.scale_labels);

                return (
                    <button
                        type="button"
                        key={val}
                        title={title}
                        disabled={!scoresEditable}
                        onClick={() => onScoreUpdate(val)}
                        className={`
                            ${useCompactButtons ? 'h-9 min-w-9 px-1.5' : 'min-h-9 px-2.5'}
                            rounded-lg text-sm font-medium transition-all
                            ${
                                current === val
                                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-200'
                                    : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-400'
                            }
                            ${!scoresEditable ? 'cursor-not-allowed opacity-50 hover:border-gray-200' : ''}
                        `}
                    >
                        {text}
                    </button>
                );
            })}
        </div>
    );
}
