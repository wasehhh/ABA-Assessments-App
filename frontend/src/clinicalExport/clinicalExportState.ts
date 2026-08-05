/**
 * Generic clinical export session helpers.
 * Mode unions and route segments are owned by each artifact.
 */

export interface ClinicalExportContinueState<TMode extends string> {
    exportMode: TMode;
    selectedDomainIds?: string[];
}

export interface ClinicalExportContinueOptions<TMode extends string> {
    /** When true for the current mode, at least one domain id is required. */
    requiresDomainSelection?: (mode: TMode) => boolean;
    /** When true for the current mode, acknowledgement must be present. */
    requiresAcknowledgment?: (mode: TMode) => boolean;
    acknowledged?: boolean;
}

export function canContinueClinicalExport<TMode extends string>(
    state: ClinicalExportContinueState<TMode>,
    options?: ClinicalExportContinueOptions<TMode>
): boolean {
    if (options?.requiresDomainSelection?.(state.exportMode)) {
        return (state.selectedDomainIds?.length ?? 0) > 0;
    }

    if (options?.requiresAcknowledgment?.(state.exportMode)) {
        return options.acknowledged === true;
    }

    return true;
}

export function normalizeExportDomainIds(raw: string | null | undefined): string[] {
    if (!raw) {
        return [];
    }

    const seen = new Set<string>();
    const selectedDomainIds: string[] = [];

    for (const entry of raw.split(',')) {
        const trimmed = entry.trim();
        if (!trimmed || seen.has(trimmed)) {
            continue;
        }

        seen.add(trimmed);
        selectedDomainIds.push(trimmed);
    }

    return selectedDomainIds;
}

/**
 * Build an artifact export preview hash.
 * `routeSegment` is the path after `/assessment/:id/` (e.g. `learner-map/export`).
 */
export function buildClinicalExportPreviewHash(
    assessmentId: string,
    routeSegment: string,
    query: Record<string, string | undefined>
): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== '') {
            params.set(key, value);
        }
    }
    const queryString = params.toString();
    const base = `#/assessment/${assessmentId}/${routeSegment}`;
    return queryString ? `${base}?${queryString}` : base;
}

export function buildClinicalArtifactRouteHash(
    assessmentId: string,
    routeSegment: string,
    options?: { openExportDialog?: boolean }
): string {
    const base = `#/assessment/${assessmentId}/${routeSegment}`;

    if (options?.openExportDialog) {
        return `${base}?export=dialog`;
    }

    return base;
}

export function shouldOpenClinicalExportDialog(search: string): boolean {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    return params.get('export') === 'dialog';
}

export function readHashSearch(): string {
    const hash = window.location.hash;
    const queryIndex = hash.indexOf('?');
    return queryIndex >= 0 ? hash.slice(queryIndex) : '';
}
