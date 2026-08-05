import { auditService } from '../services/audit';
import { ClinicalExportArtifactKind } from './clinicalExportAcknowledgment';

export type ClinicalExportAuditChannel = 'export' | 'print';

/**
 * PHI egress audit event kinds (artifact-agnostic meanings):
 *
 * - `acknowledgement` — clinician confirmed PHI risk for this assessment session
 * - `export_view` — export preview surface rendered with acknowledgement satisfied
 *   (not a file download)
 * - `html_export` — standalone HTML document was generated and downloaded
 * - `print` — in-app Print / Save-as-PDF path invoked
 */
export type ClinicalExportAuditEvent =
    | 'acknowledgement'
    | 'export_view'
    | 'html_export'
    | 'print';

export const CLINICAL_EXPORT_AUDIT_EVENTS: readonly ClinicalExportAuditEvent[] = [
    'acknowledgement',
    'export_view',
    'html_export',
    'print',
] as const;

/**
 * Claim a one-shot `export_view` audit for the current mount.
 * Returns true only when acknowledgement + availability + data readiness are
 * satisfied and this mount has not already claimed the event.
 */
export function claimExportViewAudit(
    loggedRef: { current: boolean },
    guards: {
        acknowledged: boolean;
        available: boolean;
        ready: boolean;
    }
): boolean {
    if (!guards.acknowledged || !guards.available || !guards.ready || loggedRef.current) {
        return false;
    }
    loggedRef.current = true;
    return true;
}

/**
 * Fire-and-forget PHI egress audit. Never throws; never blocks export/print.
 */
export function logClinicalExportAudit(input: {
    orgId: string | null | undefined;
    userId: string | null | undefined;
    assessmentId: string;
    artifact: ClinicalExportArtifactKind;
    channel: ClinicalExportAuditChannel;
    mode: string;
    event: ClinicalExportAuditEvent;
}): void {
    if (!input.orgId || !input.userId) {
        return;
    }

    try {
        void auditService.log({
            org_id: input.orgId,
            user_id: input.userId,
            action: 'EXPORT',
            entity_type: 'assessment',
            entity_id: input.assessmentId,
            details: {
                artifact: input.artifact,
                channel: input.channel,
                mode: input.mode,
                event: input.event,
            },
        });
    } catch (err) {
        console.error('Clinical export audit failed:', err);
    }
}
