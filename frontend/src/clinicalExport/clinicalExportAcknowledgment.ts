/**
 * Artifact-agnostic PHI acknowledgement persistence for clinical exports.
 * Artifact kinds own namespaces; shared code does not invent storage keys.
 */

export type ClinicalExportArtifactKind = 'learner-map' | 'snapshot' | 'report';

/** Exact sessionStorage namespace prefixes (including trailing colon). */
export const CLINICAL_EXPORT_ACK_NAMESPACES = {
    'learner-map': 'learner-map-full-export-ack:',
    snapshot: 'snapshot-export-ack:',
    report: 'report-export-ack:',
} as const satisfies Record<ClinicalExportArtifactKind, string>;

export function clinicalExportAckStorageKey(
    artifactKind: ClinicalExportArtifactKind,
    assessmentId: string
): string {
    return `${CLINICAL_EXPORT_ACK_NAMESPACES[artifactKind]}${assessmentId}`;
}

export function setClinicalExportAcknowledged(
    artifactKind: ClinicalExportArtifactKind,
    assessmentId: string
): void {
    try {
        sessionStorage.setItem(clinicalExportAckStorageKey(artifactKind, assessmentId), '1');
    } catch {
        // sessionStorage may be unavailable; callers treat as unacknowledged (fail closed).
    }
}

export function hasClinicalExportAcknowledged(
    artifactKind: ClinicalExportArtifactKind,
    assessmentId: string
): boolean {
    try {
        return (
            sessionStorage.getItem(clinicalExportAckStorageKey(artifactKind, assessmentId)) ===
            '1'
        );
    } catch {
        return false;
    }
}

/**
 * Whether the given mode requires PHI acknowledgement for this artifact.
 * Policy is owned by the artifact; shared code does not hard-code mode names.
 */
export function requiresClinicalExportAcknowledgment<TMode>(
    mode: TMode,
    policy: (mode: TMode) => boolean
): boolean {
    return policy(mode);
}

export function isClinicalExportAcknowledged<TMode>(
    artifactKind: ClinicalExportArtifactKind,
    assessmentId: string,
    mode: TMode,
    policy: (mode: TMode) => boolean
): boolean {
    if (!requiresClinicalExportAcknowledgment(mode, policy)) {
        return true;
    }

    return hasClinicalExportAcknowledged(artifactKind, assessmentId);
}
