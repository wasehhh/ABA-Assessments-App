import { LearnerMapExportMode } from './learnerMapExportMode';

export interface LearnerMapExportState {
    exportMode: LearnerMapExportMode;
    selectedDomainIds: string[];
}

export const DEFAULT_LEARNER_MAP_EXPORT_STATE: LearnerMapExportState = {
    exportMode: 'standard',
    selectedDomainIds: [],
};

export function canContinueLearnerMapExport(state: LearnerMapExportState): boolean {
    if (state.exportMode === 'selected-domains') {
        return state.selectedDomainIds.length > 0;
    }

    return true;
}

export function parseLearnerMapExportPreviewParams(
    search: string
): Pick<LearnerMapExportState, 'exportMode' | 'selectedDomainIds'> {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const modeParam = params.get('mode');
    const exportMode: LearnerMapExportMode =
        modeParam === 'full' || modeParam === 'selected-domains' ? modeParam : 'standard';
    const selectedDomainIds =
        params
            .get('domains')
            ?.split(',')
            .map((entry) => entry.trim())
            .filter(Boolean) ?? [];

    return { exportMode, selectedDomainIds };
}

export function resolveLearnerMapExportPreviewParams(
    params: Pick<LearnerMapExportState, 'exportMode' | 'selectedDomainIds'>,
    profileDomainIds: string[]
): Pick<LearnerMapExportState, 'exportMode' | 'selectedDomainIds'> {
    if (params.exportMode !== 'selected-domains') {
        return params;
    }

    const validDomainIds = new Set(profileDomainIds);
    const selectedDomainIds = params.selectedDomainIds.filter((domainId) =>
        validDomainIds.has(domainId)
    );

    if (selectedDomainIds.length === 0) {
        return { exportMode: 'standard', selectedDomainIds: [] };
    }

    return { exportMode: 'selected-domains', selectedDomainIds };
}

export function buildLearnerMapExportPreviewHash(
    assessmentId: string,
    state: LearnerMapExportState
): string {
    const params = new URLSearchParams();
    params.set('mode', state.exportMode);

    if (state.exportMode === 'selected-domains' && state.selectedDomainIds.length > 0) {
        params.set('domains', state.selectedDomainIds.join(','));
    }

    return `#/assessment/${assessmentId}/learner-map/export?${params.toString()}`;
}
