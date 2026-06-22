import { describe, expect, it } from 'vitest';
import {
    buildLearnerMapExportPreviewHash,
    canContinueLearnerMapExport,
    DEFAULT_LEARNER_MAP_EXPORT_STATE,
    parseLearnerMapExportPreviewParams,
    resolveLearnerMapExportPreviewParams,
} from './learnerMapExportState';

describe('learnerMapExportState', () => {
    it('defaults to standard mode with no selected domains', () => {
        expect(DEFAULT_LEARNER_MAP_EXPORT_STATE).toEqual({
            exportMode: 'standard',
            selectedDomainIds: [],
        });
    });

    it('requires at least one domain for selected-domains continue', () => {
        expect(
            canContinueLearnerMapExport({
                exportMode: 'selected-domains',
                selectedDomainIds: [],
            })
        ).toBe(false);
        expect(
            canContinueLearnerMapExport({
                exportMode: 'selected-domains',
                selectedDomainIds: ['DOM_1'],
            })
        ).toBe(true);
    });

    it('allows continue for standard and full modes', () => {
        expect(canContinueLearnerMapExport({ exportMode: 'standard', selectedDomainIds: [] })).toBe(
            true
        );
        expect(canContinueLearnerMapExport({ exportMode: 'full', selectedDomainIds: [] })).toBe(true);
    });

    it('defaults invalid mode URL params to standard', () => {
        expect(parseLearnerMapExportPreviewParams('?mode=banana')).toEqual({
            exportMode: 'standard',
            selectedDomainIds: [],
        });
    });

    it('falls back to standard when selected-domains has no valid profile domains', () => {
        expect(
            resolveLearnerMapExportPreviewParams(
                { exportMode: 'selected-domains', selectedDomainIds: ['DOM_99'] },
                ['DOM_1', 'DOM_2']
            )
        ).toEqual({
            exportMode: 'standard',
            selectedDomainIds: [],
        });
    });

    it('keeps selected-domains when at least one valid domain remains', () => {
        expect(
            resolveLearnerMapExportPreviewParams(
                { exportMode: 'selected-domains', selectedDomainIds: ['DOM_99', 'DOM_2'] },
                ['DOM_1', 'DOM_2']
            )
        ).toEqual({
            exportMode: 'selected-domains',
            selectedDomainIds: ['DOM_2'],
        });
    });

    it('builds and parses export preview hash params', () => {
        const hash = buildLearnerMapExportPreviewHash('assess-1', {
            exportMode: 'selected-domains',
            selectedDomainIds: ['DOM_1', 'DOM_3'],
        });

        expect(hash).toBe(
            '#/assessment/assess-1/learner-map/export?mode=selected-domains&domains=DOM_1%2CDOM_3'
        );

        const queryStart = hash.indexOf('?');
        expect(parseLearnerMapExportPreviewParams(hash.slice(queryStart))).toEqual({
            exportMode: 'selected-domains',
            selectedDomainIds: ['DOM_1', 'DOM_3'],
        });
    });
});
