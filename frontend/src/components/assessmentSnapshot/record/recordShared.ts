import { LearnerMapCell, LearnerMapCycleSummary, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { snapshotCellLabel } from '../snapshotCellDisplay';

export function cellForTargetCycle(
    target: LearnerMapTarget,
    cycleId: string
): LearnerMapCell | null {
    return target.cells.find((entry) => entry.cycleId === cycleId) ?? null;
}

export function formatCycleLabel(
    cycle: LearnerMapCycleSummary,
    cycleDateLabels?: Record<string, string>
): string {
    const dateLabel = cycleDateLabels?.[cycle.cycleId];
    if (dateLabel) {
        return `Cycle ${cycle.cycleNumber} · ${dateLabel}`;
    }

    return `Cycle ${cycle.cycleNumber}`;
}

export function evidenceMarkTitle(
    cell: LearnerMapCell,
    cycle: LearnerMapCycleSummary,
    targetTitle: string,
    cycleDateLabels?: Record<string, string>
): string {
    return `${targetTitle} · ${formatCycleLabel(cycle, cycleDateLabels)} · ${snapshotCellLabel(cell.competencyState)} · ${cell.displayScoreWithMax}`;
}
