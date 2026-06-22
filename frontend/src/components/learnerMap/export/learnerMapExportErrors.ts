export type LearnerMapExportLoadErrorKind = 'assessment_not_found' | 'load_failed';

export interface LearnerMapExportLoadErrorDisplay {
    kind: LearnerMapExportLoadErrorKind;
    title: string;
    message: string;
}

export function resolveLearnerMapExportLoadError(error: unknown): LearnerMapExportLoadErrorDisplay {
    if (error instanceof Error && error.message === 'Assessment not found') {
        return {
            kind: 'assessment_not_found',
            title: 'Assessment not found',
            message:
                'This assessment could not be found. It may have been removed, or the link may be incorrect.',
        };
    }

    return {
        kind: 'load_failed',
        title: 'Unable to prepare export',
        message:
            'The Learner Map export could not be prepared from this assessment. Try again from the Learner Map, or return to the assessment overview.',
    };
}
