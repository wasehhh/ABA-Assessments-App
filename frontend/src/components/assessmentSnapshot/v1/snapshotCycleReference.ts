import { CycleDateSource, resolveCycleAnchorIso } from '../../learnerMap/cycleDateDisplay';
import { LearnerMapCycleSummary } from '../../../services/learnerMapProfile';

export const SNAPSHOT_CYCLE_DATE_UNAVAILABLE = 'Date unavailable';

export interface SnapshotCycleReferenceEntry {
    cycleId: string;
    cycleNumber: number;
    /** Full display line, e.g. `C1 — Jan 12, 2026`. */
    label: string;
    /** Date portion only (or unavailable fallback). */
    dateLabel: string;
    hasDate: boolean;
}

/**
 * Snapshot Cycle Reference date — include day when available.
 * Shared by screen and print (do not fork formatting).
 * Uses the ISO calendar date (UTC) so timezone offset does not shift the day.
 */
export function formatSnapshotCycleReferenceDate(dateIso: string): string {
    const calendar = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const date = calendar
        ? new Date(Date.UTC(Number(calendar[1]), Number(calendar[2]) - 1, Number(calendar[3]), 12))
        : new Date(dateIso);

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

export function buildSnapshotCycleDateLabels(
    cycles: CycleDateSource[]
): Record<string, string> {
    const labels: Record<string, string> = {};

    for (const cycle of cycles) {
        const anchor = resolveCycleAnchorIso(cycle);
        if (anchor) {
            labels[cycle.id] = formatSnapshotCycleReferenceDate(anchor);
        }
    }

    return labels;
}

export function formatSnapshotCycleReferenceEntry(
    cycleNumber: number,
    dateLabel?: string | null
): string {
    const resolved = dateLabel?.trim() ? dateLabel.trim() : SNAPSHOT_CYCLE_DATE_UNAVAILABLE;
    return `C${cycleNumber} — ${resolved}`;
}

/**
 * One entry per assessment cycle, in profile order.
 * Missing dates get a neutral fallback — cycles are never omitted.
 */
export function buildSnapshotCycleReferenceEntries(
    cycles: Array<Pick<LearnerMapCycleSummary, 'cycleId' | 'cycleNumber'>>,
    cycleDateLabels?: Record<string, string>
): SnapshotCycleReferenceEntry[] {
    return cycles.map((cycle) => {
        const raw = cycleDateLabels?.[cycle.cycleId];
        const hasDate = Boolean(raw?.trim());
        const dateLabel = hasDate ? raw!.trim() : SNAPSHOT_CYCLE_DATE_UNAVAILABLE;

        return {
            cycleId: cycle.cycleId,
            cycleNumber: cycle.cycleNumber,
            dateLabel,
            hasDate,
            label: formatSnapshotCycleReferenceEntry(cycle.cycleNumber, dateLabel),
        };
    });
}
