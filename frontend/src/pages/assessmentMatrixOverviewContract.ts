/**
 * Matrix overview contract after PR13.5C — Domain Overview only (no Landscape).
 * Pure markers for smoke tests without RTL.
 */

export const MATRIX_OVERVIEW_CONTRACT = {
    /** Domains / Landscape toggle must not appear. */
    landscapeToggleAbsent: true,
    /** Overview renders Domain cards directly with no view-selection mode. */
    domainsOnly: true,
    /** Landscape is not a Matrix view option. */
    landscapeViewRemoved: true,
} as const;

export const MATRIX_ACTION_MARKERS = {
    snapshotEntry: 'data-assessment-snapshot-entry',
    learnerMapLabel: 'Learner Map',
    snapshotLabel: 'Assessment Snapshot',
    writeReportLabel: 'Write Report',
    communicationReportLabel: 'Communication Report',
} as const;

/** Heading copy for the Matrix primary-group overview. */
export function formatMatrixOverviewHeading(
    primaryGroupLabel: string,
    count: number
): string {
    return `${primaryGroupLabel} Overview (${count})`;
}

export function matrixExposesLandscapeToggle(): boolean {
    return !MATRIX_OVERVIEW_CONTRACT.landscapeToggleAbsent;
}

export function matrixUsesViewSelectionState(): boolean {
    return !MATRIX_OVERVIEW_CONTRACT.domainsOnly;
}
