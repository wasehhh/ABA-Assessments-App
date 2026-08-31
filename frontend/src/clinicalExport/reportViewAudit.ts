import { auditService } from '../services/audit';

export type ReportViewAuditSurface = 'version_history' | 'version_document';

interface ReportViewAuditInput {
    orgId: string | null | undefined;
    userId: string | null | undefined;
    assessmentId: string;
    cycleId: string;
    surface: ReportViewAuditSurface;
    version?: number;
    status?: 'finalized' | 'superseded';
    reportId?: string;
}

/**
 * Fire-and-forget VIEW audit for Communication Report history surfaces.
 * Never throws; never blocks the UI.
 */
export function logReportViewAudit(input: ReportViewAuditInput): void {
    if (!input.orgId || !input.userId) {
        return;
    }

    try {
        void auditService.log({
            org_id: input.orgId,
            user_id: input.userId,
            action: 'VIEW',
            entity_type: 'report',
            entity_id: input.reportId ?? input.assessmentId,
            details: {
                artifact: 'report',
                surface: input.surface,
                assessment_id: input.assessmentId,
                cycle_id: input.cycleId,
                ...(input.version !== undefined ? { version: input.version } : {}),
                ...(input.status ? { status: input.status } : {}),
            },
        });
    } catch (err) {
        console.error('Report view audit failed:', err);
    }
}

export function logReportHistoryListViewAudit(
    input: Omit<ReportViewAuditInput, 'surface'>
): void {
    logReportViewAudit({ ...input, surface: 'version_history' });
}

export function logReportDocumentViewAudit(
    input: Omit<ReportViewAuditInput, 'surface'> & {
        version: number;
        status: 'finalized' | 'superseded';
        reportId: string;
    }
): void {
    logReportViewAudit({ ...input, surface: 'version_document' });
}
