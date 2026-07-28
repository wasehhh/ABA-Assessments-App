import { describe, expect, it } from 'vitest';
import { ContentPackData, Target } from '../types';
import {
    isScoreAllowedByEffectiveScoring,
    resolveEffectiveScoring,
} from '../utils/effectiveScoring';

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
    it('validates against Effective Scoring membership', () => {
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

        const decimal = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        const even = resolveEffectiveScoring(pack.domains[0].targets[1], pack);

        expect(isScoreAllowedByEffectiveScoring(0.5, decimal)).toBe(true);
        expect(isScoreAllowedByEffectiveScoring(0.25, decimal)).toBe(false);
        expect(isScoreAllowedByEffectiveScoring(4, even)).toBe(true);
        expect(isScoreAllowedByEffectiveScoring(3, even)).toBe(false);
    });
});
