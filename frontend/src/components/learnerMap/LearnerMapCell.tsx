import { LearnerMapCell as LearnerMapCellData, LearnerMapMovement } from '../../services/learnerMapProfile';
import { CompetencyState } from '../../utils/scoreInterpretation';
import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';

interface Props {
    cell: LearnerMapCellData;
}

function bucketForState(state: CompetencyState) {
    return STATE_BUCKET_DISPLAY.find((bucket) => bucket.key === state) ?? STATE_BUCKET_DISPLAY[0];
}

function movementMarker(movement: LearnerMapMovement): string {
    switch (movement) {
        case 'up':
            return '↑';
        case 'down':
            return '↓';
        case 'flat':
            return '=';
        case 'new':
            return '+';
        default:
            return '';
    }
}

export function LearnerMapCell({ cell }: Props) {
    const bucket = bucketForState(cell.competencyState);
    const marker = movementMarker(cell.movementFromPrevious);

    return (
        <td className="border border-gray-200 p-1 align-middle text-center">
            <div
                className={`mx-auto flex min-h-[3rem] w-full min-w-[4.5rem] flex-col items-center justify-center rounded border px-1 py-1.5 ${bucket.legendClass}`}
                aria-label={`${bucket.label}, score ${cell.displayScoreWithMax}${
                    marker ? `, movement ${cell.movementFromPrevious}` : ''
                }`}
            >
                <span className="text-xs font-mono font-semibold tabular-nums text-gray-900">
                    {cell.displayScoreWithMax}
                </span>
                {marker ? (
                    <span className="mt-0.5 text-[10px] font-medium leading-none text-gray-700" aria-hidden>
                        {marker}
                    </span>
                ) : (
                    <span className="mt-0.5 text-[10px] leading-none text-transparent" aria-hidden>
                        ·
                    </span>
                )}
            </div>
        </td>
    );
}
