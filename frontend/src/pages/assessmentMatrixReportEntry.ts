import { canManageReportAuthoring, canViewFinalizedReport } from '../services/reportAuthoringRoles';

/** Matrix overflow labels only — routes and function names stay as-is until the post-C1 sweep. */
export const ASSESSMENT_SNAPSHOT_ENTRY_LABEL = 'Assessment Snapshot';
export const ASSESSMENT_SNAPSHOT_ENTRY_SUBTITLE = 'All scores, all cycles — source data.';
export const WRITE_REPORT_ENTRY_LABEL = 'Write Report';
export const WRITE_REPORT_ENTRY_SUBTITLE = 'Draft the family-facing report.';
export const COMMUNICATION_REPORT_ENTRY_LABEL = 'Communication Report';
export const COMMUNICATION_REPORT_ENTRY_SUBTITLE = 'All issued reports for this assessment';

export function shouldShowReportAuthoringEntry(
    assessmentStatus: string | null | undefined,
    role: string | null | undefined
): boolean {
    return assessmentStatus === 'approved' && canManageReportAuthoring(role);
}

export function shouldShowFinalizedReportEntry(
    role: string | null | undefined,
    hasIssuedReports: boolean
): boolean {
    return hasIssuedReports && canViewFinalizedReport(role);
}

export function buildReportAuthoringRouteHash(assessmentId: string, cycleId: string): string {
    return `#/assessment/${assessmentId}/report/edit?cycleId=${encodeURIComponent(cycleId)}`;
}

export function buildFinalizedReportRouteHash(
    assessmentId: string,
    cycleId: string,
    version?: number
): string {
    const base = `#/assessment/${assessmentId}/report/finalized?cycleId=${encodeURIComponent(cycleId)}`;
    if (version == null) {
        return base;
    }
    return `${base}&version=${version}`;
}

export function buildVersionHistoryRouteHash(assessmentId: string, cycleId: string): string {
    return `#/assessment/${assessmentId}/report/versions?cycleId=${encodeURIComponent(cycleId)}`;
}

export function buildDocumentsIndexRouteHash(assessmentId: string): string {
    return `#/assessment/${assessmentId}/reports`;
}

export function readReportAuthoringCycleIdFromHash(
    hash: string = typeof window !== 'undefined' ? window.location.hash : ''
): string | null {
    const queryIndex = hash.indexOf('?');
    if (queryIndex < 0) {
        return null;
    }
    const params = new URLSearchParams(hash.slice(queryIndex + 1));
    return params.get('cycleId');
}

export function readFinalizedReportCycleIdFromHash(
    hash?: string
): string | null {
    return readReportAuthoringCycleIdFromHash(hash);
}

export type FinalizedReportVersionQuery =
    | { kind: 'current' }
    | { kind: 'specific'; version: number }
    | { kind: 'invalid' };

export function readFinalizedReportVersionQueryFromHash(
    hash: string = typeof window !== 'undefined' ? window.location.hash : ''
): FinalizedReportVersionQuery {
    const queryIndex = hash.indexOf('?');
    if (queryIndex < 0) {
        return { kind: 'current' };
    }
    const raw = new URLSearchParams(hash.slice(queryIndex + 1)).get('version');
    if (raw == null || raw === '') {
        return { kind: 'current' };
    }
    const version = Number(raw);
    if (!Number.isInteger(version) || version < 1) {
        return { kind: 'invalid' };
    }
    return { kind: 'specific', version };
}
