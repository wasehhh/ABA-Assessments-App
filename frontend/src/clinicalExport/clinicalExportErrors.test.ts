import { describe, expect, it } from 'vitest';
import { resolveClinicalExportLoadError } from './clinicalExportErrors';

const COPY = {
    assessmentNotFound: {
        title: 'Assessment not found',
        message: 'Missing assessment copy.',
    },
    loadFailed: {
        title: 'Unable to prepare export',
        message: 'Generic failure copy.',
    },
};

describe('clinicalExportErrors', () => {
    it('resolves assessment_not_found kind with artifact copy', () => {
        expect(resolveClinicalExportLoadError(new Error('Assessment not found'), COPY)).toEqual({
            kind: 'assessment_not_found',
            title: 'Assessment not found',
            message: 'Missing assessment copy.',
        });
    });

    it('resolves load_failed for other errors', () => {
        expect(resolveClinicalExportLoadError(new Error('boom'), COPY)).toEqual({
            kind: 'load_failed',
            title: 'Unable to prepare export',
            message: 'Generic failure copy.',
        });
    });
});
