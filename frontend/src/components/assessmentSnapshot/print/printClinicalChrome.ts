import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { LearnerMapDisplayContext } from '../../learnerMap/learnerMapDisplayContext';

/**
 * PR13.6C — Shared clinical chrome for the printed Snapshot.
 * Presentation only; does not affect PrintRenderPlan composition.
 */

export const SNAPSHOT_PRINT_PRODUCT_NAME = 'Evalis';

export const SNAPSHOT_PRINT_ARTIFACT_LABEL = 'Assessment Snapshot';

/** Short confidentiality line for the repeated page footer. */
export const SNAPSHOT_PRINT_CONFIDENTIALITY =
    'Confidential clinical record — for authorized clinical use only.';

/**
 * Quiet framing for the document footer. Intentionally shorter than the Learner Map
 * export disclaimer so it does not push content onto an empty trailing page.
 */
export const SNAPSHOT_PRINT_CLINICAL_NOTE =
    'Summarizes cycle scores for clinical review. Does not replace clinical judgment.';

export interface SnapshotPrintIdentity {
    learnerName: string;
    assessmentName: string;
    organizationName: string | null;
    packTitle: string;
    packVersion: string;
    packLabel: string;
    cycleCount: number;
}

export function resolveSnapshotPrintIdentity(
    profile: AssessmentSnapshotProfile,
    displayContext?: LearnerMapDisplayContext
): SnapshotPrintIdentity {
    const learnerName = displayContext?.learnerName?.trim() || '—';
    const assessmentName =
        displayContext?.assessmentName?.trim() ||
        `Assessment ${profile.metadata.assessmentId}`;
    const organizationRaw = displayContext?.organizationName?.trim() || '';
    const organizationName =
        organizationRaw && organizationRaw !== '—' ? organizationRaw : null;
    const packTitle = profile.metadata.packTitle?.trim() || '—';
    const packVersion = profile.metadata.packVersion?.trim() || '—';

    return {
        learnerName,
        assessmentName,
        organizationName,
        packTitle,
        packVersion,
        packLabel: `${packTitle} (v${packVersion})`,
        cycleCount: profile.cycles.length,
    };
}

export function formatPrintPageLabel(pageNumber: number, totalPages: number): string {
    return `Page ${pageNumber} of ${totalPages}`;
}
