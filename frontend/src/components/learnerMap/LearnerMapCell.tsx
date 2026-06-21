import { LearnerMapCell as LearnerMapCellData } from '../../services/learnerMapProfile';
import { CompetencyState } from '../../utils/scoreInterpretation';
import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';
import { movementMarkerDisplay, movementMarkerSymbol } from './movementDisplay';

interface Props {
    cell: LearnerMapCellData;
    compact?: boolean;
}

function bucketForState(state: CompetencyState) {
    return STATE_BUCKET_DISPLAY.find((bucket) => bucket.key === state) ?? STATE_BUCKET_DISPLAY[0];
}

export function LearnerMapCell({ cell, compact = false }: Props) {
    const bucket = bucketForState(cell.competencyState);
    const marker = movementMarkerSymbol(cell.movementFromPrevious);
    const markerStyle = marker
        ? movementMarkerDisplay(cell.movementFromPrevious)
        : movementMarkerDisplay('none');

    return (
        <td className={`border border-gray-100 align-middle text-center ${compact ? 'p-0' : 'p-0.5'}`}>
            <div
                className={`mx-auto flex w-full flex-col items-center justify-center rounded border ${
                    compact
                        ? 'min-h-[1.85rem] min-w-[2.25rem] px-0 py-0.5'
                        : 'min-h-[2.75rem] min-w-[3.5rem] px-0.5 py-1'
                } ${bucket.legendClass}`}
                aria-label={`${bucket.label}, score ${cell.displayScoreWithMax}${
                    marker ? `, ${markerStyle.label}` : ''
                }`}
            >
                <span
                    className={`font-mono font-semibold tabular-nums text-gray-900 ${
                        compact ? 'text-[9px] leading-none' : 'text-xs'
                    }`}
                >
                    {cell.displayScoreWithMax}
                </span>
                {marker ? (
                    <span
                        className={`font-bold leading-none ${markerStyle.markerClass} ${
                            compact ? 'text-[8px]' : 'mt-0.5 text-[10px]'
                        }`}
                        aria-hidden
                    >
                        {marker}
                    </span>
                ) : (
                    <span
                        className={`leading-none text-transparent ${
                            compact ? 'text-[8px]' : 'mt-0.5 text-[10px]'
                        }`}
                        aria-hidden
                    >
                        ·
                    </span>
                )}
            </div>
        </td>
    );
}
