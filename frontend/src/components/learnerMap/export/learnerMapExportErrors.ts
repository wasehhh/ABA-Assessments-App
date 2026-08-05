import {
    ClinicalExportLoadErrorDisplay,
    resolveClinicalExportLoadError,
} from '../../../clinicalExport/clinicalExportErrors';

export type LearnerMapExportLoadErrorKind = ClinicalExportLoadErrorDisplay['kind'];

export type LearnerMapExportLoadErrorDisplay = ClinicalExportLoadErrorDisplay;

const LEARNER_MAP_EXPORT_ERROR_COPY = {
    assessmentNotFound: {
        title: 'Assessment not found',
        message:
            'This assessment could not be found. It may have been removed, or the link may be incorrect.',
    },
    loadFailed: {
        title: 'Unable to prepare export',
        message:
            'The Learner Map export could not be prepared from this assessment. Try again from the Learner Map, or return to the assessment overview.',
    },
} as const;

export function resolveLearnerMapExportLoadError(
    error: unknown
): LearnerMapExportLoadErrorDisplay {
    return resolveClinicalExportLoadError(error, LEARNER_MAP_EXPORT_ERROR_COPY);
}
