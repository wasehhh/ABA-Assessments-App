import {
    ClinicalExportLoadErrorDisplay,
    resolveClinicalExportLoadError,
} from '../../../clinicalExport/clinicalExportErrors';

export type SnapshotExportLoadErrorDisplay = ClinicalExportLoadErrorDisplay;

const SNAPSHOT_EXPORT_ERROR_COPY = {
    assessmentNotFound: {
        title: 'Assessment not found',
        message:
            'This assessment could not be found. It may have been removed, or the link may be incorrect.',
    },
    loadFailed: {
        title: 'Unable to prepare export',
        message:
            'The Assessment Snapshot export could not be prepared from this assessment. Try again from the Snapshot, or return to the assessment overview.',
    },
} as const;

export function resolveSnapshotExportLoadError(
    error: unknown
): SnapshotExportLoadErrorDisplay {
    return resolveClinicalExportLoadError(error, SNAPSHOT_EXPORT_ERROR_COPY);
}
