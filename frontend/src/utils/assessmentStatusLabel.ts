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
