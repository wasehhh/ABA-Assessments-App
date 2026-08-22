import { canManageReportAuthoring, canViewFinalizedReport } from '../services/reportAuthoringRoles';

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
