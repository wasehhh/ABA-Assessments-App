import { LearnerMapCell, LearnerMapCycleSummary } from '../../../services/learnerMapProfile';
import { formatCycleLabel } from '../record/recordShared';
import { snapshotCellClass, snapshotCellLabel } from '../snapshotCellDisplay';

export function beadScoreText(cell: LearnerMapCell): string {
    if (cell.isUnscored || cell.rawScore === null) {
        return '—';
    }

    return String(cell.rawScore);
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

const DOMAIN_ACCENT_CLASSES = [
    'bg-orange-200',
    'bg-sky-200',
    'bg-emerald-200',
    'bg-violet-200',
    'bg-rose-200',
    'bg-amber-200',
    'bg-cyan-200',
    'bg-fuchsia-200',
] as const;

export function domainAccentClass(domainIndex: number): string {
    return DOMAIN_ACCENT_CLASSES[domainIndex % DOMAIN_ACCENT_CLASSES.length];
}
