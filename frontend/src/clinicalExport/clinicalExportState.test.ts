import { describe, expect, it } from 'vitest';
import {
    buildClinicalArtifactRouteHash,
    buildClinicalExportPreviewHash,
    canContinueClinicalExport,
    normalizeExportDomainIds,
    shouldOpenClinicalExportDialog,
} from './clinicalExportState';

describe('clinicalExportState', () => {
    it('normalizes domain ids without inventing values', () => {
        expect(normalizeExportDomainIds('A, B ,A,,')).toEqual(['A', 'B']);
        expect(normalizeExportDomainIds(null)).toEqual([]);
    });

    it('gates continue via artifact-owned predicates', () => {
        expect(
            canContinueClinicalExport(
                { exportMode: 'full' },
                { requiresAcknowledgment: () => true, acknowledged: false }
            )
        ).toBe(false);
        expect(
            canContinueClinicalExport(
                { exportMode: 'full' },
                { requiresAcknowledgment: () => true, acknowledged: true }
            )
        ).toBe(true);
        expect(
            canContinueClinicalExport(
                { exportMode: 'selected-domains', selectedDomainIds: [] },
                { requiresDomainSelection: (mode) => mode === 'selected-domains' }
            )
        ).toBe(false);
    });

    it('builds parameterized hashes without hard-coding artifact modes', () => {
        expect(
            buildClinicalExportPreviewHash('a1', 'snapshot/export', { mode: 'full' })
        ).toBe('#/assessment/a1/snapshot/export?mode=full');
        expect(buildClinicalArtifactRouteHash('a1', 'snapshot', { openExportDialog: true })).toBe(
            '#/assessment/a1/snapshot?export=dialog'
        );
        expect(shouldOpenClinicalExportDialog('?export=dialog')).toBe(true);
    });
});
