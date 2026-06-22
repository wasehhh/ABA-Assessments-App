import { describe, expect, it } from 'vitest';
import {
    buildLearnerMapExportPreviewHash,
    buildLearnerMapRouteHash,
    canContinueLearnerMapExport,
    DEFAULT_LEARNER_MAP_EXPORT_STATE,
    normalizeExportDomainIds,
    parseLearnerMapExportPreviewParams,
    resolveLearnerMapExportPreviewParams,
    shouldOpenLearnerMapExportDialog,
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

    it('allows continue for standard mode without acknowledgment', () => {
        expect(canContinueLearnerMapExport({ exportMode: 'standard', selectedDomainIds: [] })).toBe(
            true
        );
    });

    it('requires full acknowledgment for full mode', () => {
        expect(canContinueLearnerMapExport({ exportMode: 'full', selectedDomainIds: [] })).toBe(
            false
        );
        expect(
            canContinueLearnerMapExport(
                { exportMode: 'full', selectedDomainIds: [] },
                { fullAcknowledged: true }
            )
        ).toBe(true);
    });

    it('defaults invalid mode URL params to standard', () => {
        expect(parseLearnerMapExportPreviewParams('?mode=banana')).toEqual({
            exportMode: 'standard',
            selectedDomainIds: [],
        });
    });

    it('defaults empty mode URL params to standard', () => {
        expect(parseLearnerMapExportPreviewParams('?mode=')).toEqual({
            exportMode: 'standard',
            selectedDomainIds: [],
        });
    });

    it('deduplicates domain ids while preserving first occurrence order', () => {
        expect(normalizeExportDomainIds('DOM_2, DOM_1 ,DOM_2,, DOM_1')).toEqual(['DOM_2', 'DOM_1']);
        expect(parseLearnerMapExportPreviewParams('?mode=selected-domains&domains=DOM_2,DOM_2,DOM_1')).toEqual({
            exportMode: 'selected-domains',
            selectedDomainIds: ['DOM_2', 'DOM_1'],
        });
    });

    it('treats empty domains param as no selected domains', () => {
        expect(parseLearnerMapExportPreviewParams('?mode=selected-domains&domains=')).toEqual({
            exportMode: 'selected-domains',
            selectedDomainIds: [],
        });
    });

    it('ignores domains param for non selected-domains modes', () => {
        expect(parseLearnerMapExportPreviewParams('?mode=full&domains=DOM_1')).toEqual({
            exportMode: 'full',
            selectedDomainIds: ['DOM_1'],
        });
        expect(
            resolveLearnerMapExportPreviewParams(
                { exportMode: 'full', selectedDomainIds: ['DOM_1'] },
                ['DOM_1']
            )
        ).toEqual({
            exportMode: 'full',
            selectedDomainIds: ['DOM_1'],
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

    it('builds learner map route hash with optional export dialog flag', () => {
        expect(buildLearnerMapRouteHash('assess-1')).toBe('#/assessment/assess-1/learner-map');
        expect(buildLearnerMapRouteHash('assess-1', { openExportDialog: true })).toBe(
            '#/assessment/assess-1/learner-map?export=dialog'
        );
        expect(shouldOpenLearnerMapExportDialog('?export=dialog')).toBe(true);
        expect(shouldOpenLearnerMapExportDialog('?export=preview')).toBe(false);
    });
});
