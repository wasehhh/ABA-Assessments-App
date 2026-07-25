import { LearnerMapCell, LearnerMapCycleSummary } from '../../../services/learnerMapProfile';
import { formatCycleLabel } from '../record/recordShared';
import { snapshotCellClass, snapshotCellLabel } from '../snapshotCellDisplay';
import { resolveBeadSurfaceText } from './snapshotThreadDisplay';

export function beadScoreText(cell: LearnerMapCell): string {
    return resolveBeadSurfaceText(cell);
}

export function evidenceBeadTitle(
    cell: LearnerMapCell,
    cycle: LearnerMapCycleSummary,
    targetTitle: string,
    cycleDateLabels?: Record<string, string>
): string {
    if (cell.isUnscored) {
        return `${targetTitle} · ${formatCycleLabel(cycle, cycleDateLabels)} · Unscored · —`;
    }

    return `${targetTitle} · ${formatCycleLabel(cycle, cycleDateLabels)} · ${snapshotCellLabel(cell.competencyState)} · ${cell.displayScoreWithMax}`;
}

export function unscoredBeadClass(): string {
    return 'rounded-full border border-dashed border-gray-500 bg-gray-300 text-gray-800';
}

export function scoredBeadClass(state: LearnerMapCell['competencyState']): string {
    return `rounded-full ${snapshotCellClass(state)}`;
}

export function beadFocusClass(): string {
    return 'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-700 focus-visible:ring-offset-1';
}

export function latestCycleId(cycles: LearnerMapCycleSummary[]): string | null {
    if (cycles.length === 0) {
        return null;
    }

    return cycles[cycles.length - 1].cycleId;
}
