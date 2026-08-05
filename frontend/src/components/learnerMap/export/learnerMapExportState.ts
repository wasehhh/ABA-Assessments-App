import {
    buildClinicalArtifactRouteHash,
    buildClinicalExportPreviewHash,
    canContinueClinicalExport,
    normalizeExportDomainIds,
    shouldOpenClinicalExportDialog,
} from '../../../clinicalExport/clinicalExportState';
import { LearnerMapExportMode } from './learnerMapExportMode';

export interface LearnerMapExportState {
    exportMode: LearnerMapExportMode;
    selectedDomainIds: string[];
}

export const DEFAULT_LEARNER_MAP_EXPORT_STATE: LearnerMapExportState = {
    exportMode: 'standard',
    selectedDomainIds: [],
};

export function canContinueLearnerMapExport(
    state: LearnerMapExportState,
    options?: { fullAcknowledged?: boolean }
): boolean {
    return canContinueClinicalExport(state, {
        requiresDomainSelection: (mode) => mode === 'selected-domains',
        requiresAcknowledgment: (mode) => mode === 'full',
        acknowledged: options?.fullAcknowledged,
    });
}

export { normalizeExportDomainIds };

export function parseLearnerMapExportPreviewParams(
    search: string
): Pick<LearnerMapExportState, 'exportMode' | 'selectedDomainIds'> {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const modeParam = params.get('mode');
    const exportMode: LearnerMapExportMode =
        modeParam === 'full' || modeParam === 'selected-domains' ? modeParam : 'standard';
    const selectedDomainIds = normalizeExportDomainIds(params.get('domains'));

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
    return buildClinicalExportPreviewHash(assessmentId, 'learner-map/export', {
        mode: state.exportMode,
        domains:
            state.exportMode === 'selected-domains' && state.selectedDomainIds.length > 0
                ? state.selectedDomainIds.join(',')
                : undefined,
    });
}

export function buildLearnerMapRouteHash(
    assessmentId: string,
    options?: { openExportDialog?: boolean }
): string {
    return buildClinicalArtifactRouteHash(assessmentId, 'learner-map', options);
}

export function shouldOpenLearnerMapExportDialog(search: string): boolean {
    return shouldOpenClinicalExportDialog(search);
}
