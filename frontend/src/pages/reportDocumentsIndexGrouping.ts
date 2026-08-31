import { AssessmentCycle } from '../types';
import { AssessmentCommunicationReport } from '../services/reportAuthoringTypes';
import { formatFinalizedReportDate } from '../utils/finalizedReportPresentation';
import { issuedReportVersions } from './issuedReportVersions';

export type IssuedReportCycleSection = {
    cycleId: string;
    cycleNumber: number;
    startDate: string | null;
    endDate: string | null;
    isActiveCycle: boolean;
    rows: AssessmentCommunicationReport[];
};

export function groupIssuedReportsByCycle(
    reports: AssessmentCommunicationReport[],
    cycles: Pick<
        AssessmentCycle,
        'id' | 'cycle_number' | 'status' | 'start_date' | 'end_date'
    >[]
): IssuedReportCycleSection[] {
    const issued = issuedReportVersions(reports);
    const cycleById = new Map(cycles.map((cycle) => [cycle.id, cycle]));
    const rowsByCycleId = new Map<string, AssessmentCommunicationReport[]>();

    for (const row of issued) {
        const list = rowsByCycleId.get(row.cycle_id) ?? [];
        list.push(row);
        rowsByCycleId.set(row.cycle_id, list);
    }

    const sections: IssuedReportCycleSection[] = [];
    for (const [cycleId, rows] of rowsByCycleId) {
        const cycle = cycleById.get(cycleId);
        const cycleNumber =
            cycle?.cycle_number ?? rows[0]?.embedded_computed?.overview.cycle_number;
        if (cycleNumber == null) {
            continue;
        }
        rows.sort((a, b) => b.version - a.version);
        sections.push({
            cycleId,
            cycleNumber,
            startDate: cycle?.start_date ?? null,
            endDate: cycle?.end_date ?? null,
            isActiveCycle: cycle?.status === 'in_progress',
            rows,
        });
    }

    sections.sort((a, b) => b.cycleNumber - a.cycleNumber);
    return sections;
}

export function formatCycleSectionHeading(section: IssuedReportCycleSection): string {
    const parts = [`Cycle ${section.cycleNumber}`];
    if (section.startDate) {
        const start = formatFinalizedReportDate(section.startDate);
        if (section.endDate) {
            parts.push(`${start} – ${formatFinalizedReportDate(section.endDate)}`);
        } else {
            parts.push(start);
        }
    }
    return parts.join(' · ');
}
