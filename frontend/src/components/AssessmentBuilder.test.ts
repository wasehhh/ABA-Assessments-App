import { describe, expect, it } from 'vitest';
import { ContentPackData, Domain } from '../types';
import { applyGlobalScaleLabels } from '../utils/assessmentPackAuthoring';
import { deriveInitialGlobalScaleState } from './AssessmentBuilder';

function numericTarget(
    targetId: string,
    scale: number[],
    scaleLabels?: Record<number, string>
) {
    return {
        target_id: targetId,
        title: targetId,
        success_criteria: '',
        materials: '',
        scoring: {
            type: 'numeric' as const,
            scale,
            scale_labels: scaleLabels ?? {},
            no_opportunity_allowed: false,
        },
    };
}

function packWithDomains(domains: Domain[]): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Test Pack',
        description: '',
        version: '1.0',
        domains,
    };
}

describe('deriveInitialGlobalScaleState', () => {
    it('keeps new-pack defaults when initialData is absent', () => {
        expect(deriveInitialGlobalScaleState(undefined)).toEqual({
            useGlobalScale: true,
            defaultScale: '0,1,2,3,4',
            globalScaleLabels: {},
        });
        expect(deriveInitialGlobalScaleState()).toEqual({
            useGlobalScale: true,
            defaultScale: '0,1,2,3,4',
            globalScaleLabels: {},
        });
    });

    it('checks the global-scale box when every numeric target shares one scale and labels', () => {
        const pack = packWithDomains([
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [
                    numericTarget('A1', [0, 1, 2], { 0: 'None', 1: 'Emerging', 2: 'Mastered' }),
                    numericTarget('A2', [0, 1, 2], { 0: 'None', 1: 'Emerging', 2: 'Mastered' }),
                ],
            },
            {
                domain_id: 'B',
                title: 'Domain B',
                targets: [
                    numericTarget('B1', [0, 1, 2], { 0: 'None', 1: 'Emerging', 2: 'Mastered' }),
                ],
            },
        ]);

        expect(deriveInitialGlobalScaleState(pack)).toEqual({
            useGlobalScale: true,
            defaultScale: '0,1,2',
            globalScaleLabels: { 0: 'None', 1: 'Emerging', 2: 'Mastered' },
        });
    });

    it('unchecks the global-scale box when numeric targets have differing scales', () => {
        // Domain A–C, G style: genuinely different per-target scales
        const pack = packWithDomains([
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [numericTarget('A1', [0, 1, 2, 3, 4])],
            },
            {
                domain_id: 'C',
                title: 'Domain C',
                targets: [numericTarget('C1', [0, 1, 2])],
            },
            {
                domain_id: 'G',
                title: 'Domain G',
                targets: [numericTarget('G1', [0, 0.5, 1])],
            },
        ]);

        expect(deriveInitialGlobalScaleState(pack)).toEqual({
            useGlobalScale: false,
            defaultScale: '0,1,2,3,4',
            globalScaleLabels: {},
        });
    });

    it('unchecks when scales match but scale_labels differ', () => {
        const pack = packWithDomains([
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [
                    numericTarget('A1', [0, 1, 2], { 0: 'None', 1: 'Emerging', 2: 'Mastered' }),
                    numericTarget('A2', [0, 1, 2], { 0: 'No', 1: 'Partial', 2: 'Yes' }),
                ],
            },
        ]);

        expect(deriveInitialGlobalScaleState(pack).useGlobalScale).toBe(false);
    });

    it('unchecks when there are no numeric targets', () => {
        const pack = packWithDomains([
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [
                    {
                        target_id: 'YN1',
                        title: 'Yes/No',
                        success_criteria: '',
                        materials: '',
                        scoring: {
                            type: 'yesno',
                            scale_labels: {},
                            no_opportunity_allowed: false,
                        },
                    },
                ],
            },
        ]);

        expect(deriveInitialGlobalScaleState(pack).useGlobalScale).toBe(false);
    });

    it('treats undefined and empty scale_labels as equivalent when scales match', () => {
        const pack = packWithDomains([
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [
                    {
                        target_id: 'A1',
                        title: 'A1',
                        success_criteria: '',
                        materials: '',
                        scoring: {
                            type: 'numeric',
                            scale: [0, 1],
                            no_opportunity_allowed: false,
                        },
                    },
                    numericTarget('A2', [0, 1], {}),
                ],
            },
        ]);

        expect(deriveInitialGlobalScaleState(pack)).toEqual({
            useGlobalScale: true,
            defaultScale: '0,1',
            globalScaleLabels: {},
        });
    });

    it('fails closed (unchecked) when a numeric target has no inline scale', () => {
        const pack = packWithDomains([
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [
                    {
                        target_id: 'A1',
                        title: 'A1',
                        success_criteria: '',
                        materials: '',
                        scoring: {
                            type: 'numeric',
                            scale_id: 'catalog-half',
                            no_opportunity_allowed: false,
                        },
                    },
                    numericTarget('A2', [0, 0.5, 1]),
                ],
            },
        ]);

        expect(deriveInitialGlobalScaleState(pack).useGlobalScale).toBe(false);
    });
});

describe('applyGlobalScaleLabels (unchanged save-path behaviour)', () => {
    it('still overwrites labels only, not target scales', () => {
        const domains: Domain[] = [
            {
                domain_id: 'A',
                title: 'A',
                targets: [
                    numericTarget('A1', [0, 1, 2], { 0: 'Keep me' }),
                    numericTarget('A2', [0, 1], { 0: 'Other' }),
                ],
            },
        ];

        const next = applyGlobalScaleLabels(domains, { 0: 'Global' });

        expect(next[0].targets[0].scoring?.scale).toEqual([0, 1, 2]);
        expect(next[0].targets[1].scoring?.scale).toEqual([0, 1]);
        expect(next[0].targets[0].scoring?.scale_labels).toEqual({ 0: 'Global' });
        expect(next[0].targets[1].scoring?.scale_labels).toEqual({ 0: 'Global' });
    });
});
