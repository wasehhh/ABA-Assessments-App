/**
 * Production Snapshot UI contract markers (pure module for smoke tests).
 * Keeps production route / shell expectations documentable without RTL.
 */

export const ASSESSMENT_SNAPSHOT_PRODUCTION_ROUTE_PATTERN =
    /^#\/assessment\/([^/]+)\/snapshot$/;

export const ASSESSMENT_SNAPSHOT_DEV_ROUTE = '#/dev/assessment-snapshot';

export const ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS = {
    page: 'data-assessment-snapshot-production',
    loading: 'data-assessment-snapshot-loading',
    error: 'data-assessment-snapshot-error',
    unavailable: 'data-assessment-snapshot-unavailable',
    emptyEvidence: 'data-assessment-snapshot-empty-evidence',
    entry: 'data-assessment-snapshot-entry',
    measure: 'data-assessment-snapshot-measure',
    screenViewportRem: 'data-assessment-snapshot-screen-viewport-rem',
    printSurface: 'data-assessment-snapshot-print-surface',
    screenOnlyClass: 'assessment-snapshot-screen-only',
    printOnlyClass: 'assessment-snapshot-print-only',
    primaryChapter: 'data-assessment-snapshot-primary-chapter',
    domainZone: 'data-assessment-snapshot-domain-zone',
    targetThread: 'data-assessment-snapshot-target-thread',
} as const;

/** Dev Concept Lab controls that must never appear on the production surface. */
export const ASSESSMENT_SNAPSHOT_DEV_CONTROL_MARKERS = [
    'data-assessment-snapshot-dev-banner',
    'data-assessment-snapshot-fixture-selector',
    'data-assessment-snapshot-concept-lab',
    'data-assessment-snapshot-archived-concepts',
] as const;

export function matchAssessmentSnapshotProductionRoute(
    hash: string
): { assessmentId: string } | null {
    const match = hash.split('?')[0].match(ASSESSMENT_SNAPSHOT_PRODUCTION_ROUTE_PATTERN);
    if (!match) {
        return null;
    }
    return { assessmentId: match[1] };
}

export function shouldShowAssessmentSnapshotEntry(available: boolean): boolean {
    return available;
}
