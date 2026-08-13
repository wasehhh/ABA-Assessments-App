import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { LearnerMapDisplayContext } from '../../learnerMap/learnerMapDisplayContext';
import { formatCycleScopeLineValue } from '../v1/snapshotCycleScope';

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
    /** Cycles metadata value — count or partial scope line (§5.1). */
    cycleCountLabel: string;
    /** @deprecated Prefer cycleCountLabel; retained for callers that need the included count. */
    cycleCount: number;
}

export function resolveSnapshotPrintIdentity(
    profile: AssessmentSnapshotProfile,
    displayContext?: LearnerMapDisplayContext,
    assessmentCycleCount?: number
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
    const totalCycles = assessmentCycleCount ?? profile.cycles.length;

    return {
        learnerName,
        assessmentName,
        organizationName,
        packTitle,
        packVersion,
        packLabel: `${packTitle} (v${packVersion})`,
        cycleCountLabel: formatCycleScopeLineValue(profile.cycles, totalCycles),
        cycleCount: profile.cycles.length,
    };
}

export function formatPrintPageLabel(pageNumber: number, totalPages: number): string {
    return `Page ${pageNumber} of ${totalPages}`;
}

/** Self-contained Target Index appendix numbering — independent of evidence pages. */
export function formatTargetIndexPageLabel(
    pageNumber: number,
    indexPageCount: number
): string {
    return `Target index — page ${pageNumber} of ${indexPageCount}`;
}
