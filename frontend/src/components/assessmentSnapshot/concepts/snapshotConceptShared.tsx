import { LearnerMapCell, LearnerMapCycleSummary, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { snapshotCellClass, snapshotCellLabel } from '../snapshotCellDisplay';

export interface SnapshotConceptProps {
    profile: AssessmentSnapshotProfile;
    cycleDateLabels?: Record<string, string>;
}

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

export function segmentTooltip(
    cell: LearnerMapCell,
    cycle: LearnerMapCycleSummary,
    targetTitle: string
): string {
    return `${targetTitle} · ${formatCycleLabel(cycle)} · ${snapshotCellLabel(cell.competencyState)} · ${cell.displayScoreWithMax}`;
}

interface SnapshotSegmentProps {
    cell: LearnerMapCell;
    cycle: LearnerMapCycleSummary;
    targetTitle: string;
    showScoreText?: boolean;
    className?: string;
}

export function SnapshotCycleSegment({
    cell,
    cycle,
    targetTitle,
    showScoreText = true,
    className = '',
}: SnapshotSegmentProps) {
    const compactScore = cell.displayScoreWithMax.length > 4;
    const displayText = showScoreText && !compactScore;

    return (
        <div
            className={`flex shrink-0 items-center justify-center overflow-hidden ${snapshotCellClass(cell.competencyState)} ${className}`}
            title={segmentTooltip(cell, cycle, targetTitle)}
            aria-label={segmentTooltip(cell, cycle, targetTitle)}
        >
            {displayText ? (
                <span className="truncate px-0.5 font-mono text-[9px] font-semibold tabular-nums leading-none text-gray-900">
                    {cell.displayScoreWithMax}
                </span>
            ) : null}
        </div>
    );
}

export function SnapshotMissingSegment({
    cycle,
    targetTitle,
    className = '',
}: {
    cycle: LearnerMapCycleSummary;
    targetTitle: string;
    className?: string;
}) {
    return (
        <div
            className={`flex shrink-0 items-center justify-center border border-dashed border-gray-300 bg-gray-100 ${className}`}
            title={`${targetTitle} · ${formatCycleLabel(cycle)} · Unscored · —`}
            aria-label={`${targetTitle}, ${formatCycleLabel(cycle)}, Unscored`}
        />
    );
}
