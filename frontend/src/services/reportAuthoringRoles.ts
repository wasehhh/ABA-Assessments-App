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
