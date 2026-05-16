import { Target } from '../../types';

interface Props {
    target: Target;
    current: number | null;
    scoresEditable: boolean;
    onScoreUpdate: (value: number) => void;
}

/** Shared score buttons for numeric and yes/no targets (matrix + detail modal). */
export function TargetScoreControls({ target, current, scoresEditable, onScoreUpdate }: Props) {
    const scoringType = target.scoring.type as string;

    if (scoringType === 'yes_no' || scoringType === 'yesno') {
        return (
            <div className="flex gap-2 flex-wrap">
                <button
                    type="button"
                    disabled={!scoresEditable}
                    onClick={() => onScoreUpdate(0)}
                    className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                        ${current === 0
                            ? 'bg-gray-600 text-white border-gray-600 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }
                        ${!scoresEditable ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    No
                </button>
                <button
                    type="button"
                    disabled={!scoresEditable}
                    onClick={() => onScoreUpdate(1)}
                    className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                        ${current === 1
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-200'
                        }
                        ${!scoresEditable ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    Yes
                </button>
            </div>
        );
    }

    const scale =
        target.scoring.scale && target.scoring.scale.length > 0
            ? target.scoring.scale
            : [0, 1, 2, 3, 4];

    return (
        <div className="flex gap-1.5 flex-wrap">
            {scale.map((val) => (
                <button
                    type="button"
                    key={val}
                    disabled={!scoresEditable}
                    onClick={() => onScoreUpdate(val)}
                    className={`
                        w-9 h-9 rounded-lg text-sm font-medium transition-all
                        ${current === val
                            ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-200'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-400'
                        }
                        ${!scoresEditable ? 'opacity-50 cursor-not-allowed hover:border-gray-200' : ''}
                    `}
                >
                    {val}
                </button>
            ))}
        </div>
    );
}
