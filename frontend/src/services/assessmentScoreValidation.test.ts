import { describe, expect, it } from 'vitest';
import { ContentPackData, Target } from '../types';
import { resolveTargetScoring } from '../utils/assessmentPackStructure';
import {
    findPackTarget,
    getResolvedScaleValues,
} from '../utils/matrixDisplayHelpers';
import { isScoreInResolvedScale } from '../utils/scoreInterpretation';

function makePack(targets: Target[]): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Decimal Pack',
        description: '',
        version: '1.0',
        domains: [
            {
                domain_id: 'A',
                title: 'Domain A',
                targets,
            },
        ],
    };
}

describe('assessment score membership validation', () => {
    it('validates against resolved target-specific scale membership', () => {
        const pack = makePack([
            {
                target_id: 'A1',
                title: 'Decimal',
                success_criteria: '',
                materials: '',
                scoring: {
                    type: 'numeric',
                    scale: [0, 0.5, 1],
                    scale_labels: {},
                    no_opportunity_allowed: true,
                },
            },
            {
                target_id: 'A2',
                title: 'Even',
                success_criteria: '',
                materials: '',
                scoring: {
                    type: 'numeric',
                    scale: [0, 2, 4],
                    scale_labels: {},
                    no_opportunity_allowed: true,
                },
            },
        ]);

        const decimal = findPackTarget(pack, 'A1')!;
        const even = findPackTarget(pack, 'A2')!;
        const decimalScale = getResolvedScaleValues(resolveTargetScoring(decimal, pack));
        const evenScale = getResolvedScaleValues(resolveTargetScoring(even, pack));

        expect(isScoreInResolvedScale(0.5, decimalScale)).toBe(true);
        expect(isScoreInResolvedScale(0.25, decimalScale)).toBe(false);
        expect(isScoreInResolvedScale(4, evenScale)).toBe(true);
        expect(isScoreInResolvedScale(3, evenScale)).toBe(false);
    });

    it('round-trips decimal persistence values through coerce + membership', () => {
        const values = [0.5, 0.25, -1, 0, 1];
        for (const value of values) {
            expect(isScoreInResolvedScale(value, values)).toBe(true);
        }
    });
});
