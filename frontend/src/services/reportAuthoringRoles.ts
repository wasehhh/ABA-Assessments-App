/**
 * Role gates for assessment communication report authoring (contract §8.1).
 * Mirrors assessmentScoreEditRules.ts phrasing for admin/senior_therapist checks.
 */
export function canManageReportAuthoring(role: string | null | undefined): boolean {
    return role === 'admin' || role === 'senior_therapist';
}

export function canViewReportDraft(role: string | null | undefined): boolean {
    return role === 'admin' || role === 'senior_therapist' || role === 'therapist';
}

/** View finalized communication report (contract §8.1). */
export function canViewFinalizedReport(role: string | null | undefined): boolean {
    return (
        role === 'admin' ||
        role === 'senior_therapist' ||
        role === 'therapist' ||
        role === 'viewer'
    );
}

/** Print finalized report after PHI acknowledgement (contract §8.1 / OQ-RA2). */
export function canPrintFinalizedReport(role: string | null | undefined): boolean {
    return role === 'admin' || role === 'senior_therapist';
}
