import { LearnerMapCell, LearnerMapCycleSummary } from '../../../services/learnerMapProfile';
import { snapshotCellClass } from '../snapshotCellDisplay';
import { evidenceMarkTitle, formatCycleLabel } from './recordShared';

export type EvidenceMarkDensity = 'default' | 'compact';

interface Props {
    cell: LearnerMapCell;
    cycle: LearnerMapCycleSummary;
    targetTitle: string;
    cycleDateLabels?: Record<string, string>;
    density?: EvidenceMarkDensity;
}

const MARK_SIZE: Record<EvidenceMarkDensity, string> = {
    default: 'min-h-[1.5rem] min-w-[2.25rem] px-1 text-[11px]',
    compact: 'min-h-[1.25rem] min-w-[2rem] px-0.5 text-[10px]',
};

export function EvidenceMark({
    cell,
    cycle,
    targetTitle,
    cycleDateLabels,
    density = 'default',
}: Props) {
    return (
        <div
            className={`flex shrink-0 items-center justify-center rounded-sm font-mono font-semibold tabular-nums leading-none text-gray-900 ${snapshotCellClass(cell.competencyState)} ${MARK_SIZE[density]}`}
            data-assessment-snapshot-evidence-mark
            title={evidenceMarkTitle(cell, cycle, targetTitle, cycleDateLabels)}
            aria-label={evidenceMarkTitle(cell, cycle, targetTitle, cycleDateLabels)}
        >
            {cell.displayScoreWithMax}
        </div>
    );
}

export function UnscoredEvidenceMark({
    cycle,
    targetTitle,
    cycleDateLabels,
    density = 'default',
}: {
    cycle: LearnerMapCycleSummary;
    targetTitle: string;
    cycleDateLabels?: Record<string, string>;
    density?: EvidenceMarkDensity;
}) {
    const title = `${targetTitle} · ${formatCycleLabel(cycle, cycleDateLabels)} · Unscored · —`;

    return (
        <div
            className={`flex shrink-0 items-center justify-center rounded-sm border border-dashed border-gray-400 bg-gray-300 font-mono text-[11px] font-semibold tabular-nums text-gray-700 ${MARK_SIZE[density]}`}
            data-assessment-snapshot-evidence-mark
            title={title}
            aria-label={title}
        >
            —
        </div>
    );
}
