import { describe, expect, it } from 'vitest';
import { resolveLearnerMapExportLoadError } from './learnerMapExportErrors';

describe('resolveLearnerMapExportLoadError', () => {
    it('maps missing assessments to a clear not-found message', () => {
        expect(resolveLearnerMapExportLoadError(new Error('Assessment not found'))).toEqual({
            kind: 'assessment_not_found',
            title: 'Assessment not found',
            message:
                'This assessment could not be found. It may have been removed, or the link may be incorrect.',
        });
    });

    it('maps other failures to a generic load message', () => {
        expect(resolveLearnerMapExportLoadError(new Error('Network error'))).toEqual({
            kind: 'load_failed',
            title: 'Unable to prepare export',
            message:
                'The Learner Map export could not be prepared from this assessment. Try again from the Learner Map, or return to the assessment overview.',
        });
    });
});
