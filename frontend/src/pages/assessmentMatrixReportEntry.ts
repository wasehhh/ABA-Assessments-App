import { canManageReportAuthoring, canViewFinalizedReport } from '../services/reportAuthoringRoles';

/** Matrix overflow labels only — routes and function names stay as-is until the post-C1 sweep. */
export const ASSESSMENT_SNAPSHOT_ENTRY_LABEL = 'Assessment Snapshot';
export const ASSESSMENT_SNAPSHOT_ENTRY_SUBTITLE = 'All scores, all cycles — source data.';
export const WRITE_REPORT_ENTRY_LABEL = 'Write Report';
export const WRITE_REPORT_ENTRY_SUBTITLE = 'Draft the family-facing report.';
export const COMMUNICATION_REPORT_ENTRY_LABEL = 'Communication Report';
export const COMMUNICATION_REPORT_ENTRY_SUBTITLE = 'Read the issued report (locked).';

export function shouldShowReportAuthoringEntry(
    assessmentStatus: string | null | undefined,
    role: string | null | undefined
): boolean {
    return assessmentStatus === 'approved' && canManageReportAuthoring(role);
}

export function shouldShowFinalizedReportEntry(
    assessmentStatus: string | null | undefined,
    role: string | null | undefined,
    hasFinalizedReport: boolean
): boolean {
    return (
        assessmentStatus === 'approved' &&
        hasFinalizedReport &&
        canViewFinalizedReport(role)
    );
}

export function buildReportAuthoringRouteHash(assessmentId: string, cycleId: string): string {
    return `#/assessment/${assessmentId}/report/edit?cycleId=${encodeURIComponent(cycleId)}`;
}

export function buildFinalizedReportRouteHash(assessmentId: string, cycleId: string): string {
    return `#/assessment/${assessmentId}/report/finalized?cycleId=${encodeURIComponent(cycleId)}`;
}

export function readReportAuthoringCycleIdFromHash(): string | null {
    const hash = window.location.hash;
    const queryIndex = hash.indexOf('?');
    if (queryIndex < 0) {
        return null;
    }
    const params = new URLSearchParams(hash.slice(queryIndex + 1));
    return params.get('cycleId');
}

export function readFinalizedReportCycleIdFromHash(): string | null {
    return readReportAuthoringCycleIdFromHash();
}
