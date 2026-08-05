import {
    buildClinicalArtifactRouteHash,
    buildClinicalExportPreviewHash,
    canContinueClinicalExport,
    shouldOpenClinicalExportDialog,
} from '../../../clinicalExport/clinicalExportState';
import {
    coerceSnapshotExportMode,
    DEFAULT_SNAPSHOT_EXPORT_STATE,
    SnapshotExportState,
} from './snapshotExportMode';

export { DEFAULT_SNAPSHOT_EXPORT_STATE };
export type { SnapshotExportState };

export function canContinueSnapshotExport(
    state: SnapshotExportState,
    options?: { acknowledged?: boolean }
): boolean {
    return canContinueClinicalExport(state, {
        requiresAcknowledgment: () => true,
        acknowledged: options?.acknowledged,
    });
}

export function parseSnapshotExportPreviewParams(
    search: string
): SnapshotExportState {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    return {
        exportMode: coerceSnapshotExportMode(params.get('mode')),
    };
}

export function buildSnapshotExportPreviewHash(
    assessmentId: string,
    state: SnapshotExportState = DEFAULT_SNAPSHOT_EXPORT_STATE
): string {
    return buildClinicalExportPreviewHash(assessmentId, 'snapshot/export', {
        mode: state.exportMode,
    });
}

export function buildSnapshotRouteHash(
    assessmentId: string,
    options?: { openExportDialog?: boolean }
): string {
    return buildClinicalArtifactRouteHash(assessmentId, 'snapshot', options);
}

export function shouldOpenSnapshotExportDialog(search: string): boolean {
    return shouldOpenClinicalExportDialog(search);
}
