import { LearnerMapCell } from '../../services/learnerMapProfile';
import { snapshotCellClass, snapshotCellLabel } from './snapshotCellDisplay';

interface Props {
    cell: LearnerMapCell;
}

export function AssessmentSnapshotCell({ cell }: Props) {
    return (
        <td className="border border-gray-200 p-0.5 align-middle text-center">
            <div
                className={`mx-auto flex min-h-[1.75rem] min-w-[2.5rem] items-center justify-center rounded px-1 py-0.5 ${snapshotCellClass(cell.competencyState)}`}
                title={`${snapshotCellLabel(cell.competencyState)} · ${cell.displayScoreWithMax}`}
                aria-label={`${snapshotCellLabel(cell.competencyState)}, score ${cell.displayScoreWithMax}`}
            >
                <span className="font-mono text-[11px] font-semibold tabular-nums leading-none text-gray-900">
                    {cell.displayScoreWithMax}
                </span>
            </div>
        </td>
    );
}
