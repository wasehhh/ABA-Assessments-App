/**
 * Human-readable labels for assessment.workflow `status` values (DB unchanged).
 * Use everywhere assessment status is shown in the UI.
 */
const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    in_progress: 'In progress',
    submitted: 'Submitted',
    approved: 'Approved',
};

/** Assignment presence is not a workflow-status bucket. */
export function formatAssignmentPresenceLabel(hasAssignee: boolean): string | null {
    return hasAssignee ? 'Has assignee' : null;
}

/**
 * `submitted_at` is a timestamp that survives starting a new cycle
 * (`startNewCycle` resets status to in_progress and clears approved_at,
 * but not submitted_at). Only show it when status is still submitted,
 * so the date line and the status badge are the same bucket.
 */
export function shouldShowSubmissionDate(
    status: string | null | undefined,
    submittedAt: string | null | undefined
): boolean {
    return Boolean(submittedAt) && status === 'submitted';
}

export function formatAssessmentStatusLabel(status: string | null | undefined): string {
    if (status == null || status === '') {
        return '—';
    }
    const key = status.toLowerCase();
    const mapped = ASSESSMENT_STATUS_LABELS[key];
    if (mapped) return mapped;
    return status
        .split('_')
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
        .join(' ')
        .trim();
}

/** Labels for `assessment_cycles.status` (DB values unchanged). */
const CYCLE_STATUS_LABELS: Record<string, string> = {
    in_progress: 'In progress',
    locked: 'Locked',
};

export function formatCycleStatusLabel(status: string | null | undefined): string {
    if (status == null || status === '') {
        return '—';
    }
    const key = status.toLowerCase();
    const mapped = CYCLE_STATUS_LABELS[key];
    if (mapped) return mapped;
    return status
        .split('_')
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
        .join(' ')
        .trim();
}
