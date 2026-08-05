export type ClinicalExportLoadErrorKind = 'assessment_not_found' | 'load_failed';

export interface ClinicalExportLoadErrorDisplay {
    kind: ClinicalExportLoadErrorKind;
    title: string;
    message: string;
}

/** Artifact-owned clinician-facing copy for load failures. */
export interface ClinicalExportLoadErrorCopy {
    assessmentNotFound: Pick<ClinicalExportLoadErrorDisplay, 'title' | 'message'>;
    loadFailed: Pick<ClinicalExportLoadErrorDisplay, 'title' | 'message'>;
}

/**
 * Shared load-error kind resolution. Artifacts supply title/message prose.
 */
export function resolveClinicalExportLoadError(
    error: unknown,
    copy: ClinicalExportLoadErrorCopy
): ClinicalExportLoadErrorDisplay {
    if (error instanceof Error && error.message === 'Assessment not found') {
        return {
            kind: 'assessment_not_found',
            title: copy.assessmentNotFound.title,
            message: copy.assessmentNotFound.message,
        };
    }

    return {
        kind: 'load_failed',
        title: copy.loadFailed.title,
        message: copy.loadFailed.message,
    };
}
