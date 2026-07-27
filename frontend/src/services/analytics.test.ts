import { describe, it, expect } from 'vitest';
import { AssessmentScore, ContentPackData } from '../types';
import { analyticsService } from './analytics';

function makeScore(targetId: string, score: number | null): AssessmentScore {
    return {
        id: `score-${targetId}`,
        assessment_id: 'assess-1',
        assessment_cycle_id: 'cycle-1',
        client_id: 'client-1',
        pack_snapshot_id: 'pack-1',
        target_id: targetId,
        domain_id: 'DOM1',
        score,
        note: null,
        evidence_files: [],
        assessor_user_id: 'user-1',
        scored_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

const pack: ContentPackData = {
    pack_id: 'pack-1',
    org_id: 'org-1',
    title: 'Test Pack',
    description: '',
    version: '1.0',
    domains: [
        {
            domain_id: 'DOM1',
            title: 'Domain One',
            targets: [
                {
                    target_id: 'T04',
                    title: 'Numeric 0-4',
                    success_criteria: 'Criteria',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2, 3, 4],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
                {
                    target_id: 'T02',
                    title: 'Numeric 0-2',
                    success_criteria: 'Criteria',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
                {
                    target_id: 'TYN',
                    title: 'Yes/No',
                    success_criteria: 'Criteria',
                    materials: '',
                    scoring: {
                        type: 'yesno',
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
            ],
        },
    ],
};

describe('analyticsService.calculateDomainStats', () => {
    it('uses target-specific max scores in domain totals', () => {
        const stats = analyticsService.calculateDomainStats(pack, [
            makeScore('T04', 4),
            makeScore('T02', 2),
            makeScore('TYN', 1),
        ]);

        expect(stats).toHaveLength(1);
        expect(stats[0].maxScore).toBe(7); // 4 + 2 + 1
        expect(stats[0].totalScore).toBe(7);
        expect(stats[0].percentage).toBe(100);
        expect(stats[0].scoredCount).toBe(3);
        expect(stats[0].targetCount).toBe(3);
    });

    it('excludes unscored targets from scoredCount but keeps them in denominator max', () => {
        const stats = analyticsService.calculateDomainStats(pack, [
            makeScore('T04', 0),
            makeScore('T02', null),
        ]);

        expect(stats[0].scoredCount).toBe(1);
        expect(stats[0].totalScore).toBe(0);
        expect(stats[0].maxScore).toBe(7);
        expect(stats[0].percentage).toBe(0);
    });

    it('includes out-of-scale stored scores in totals without clamping', () => {
        const stats = analyticsService.calculateDomainStats(pack, [makeScore('TYN', 99)]);

        expect(stats[0].totalScore).toBe(99);
        expect(stats[0].percentage).toBe(Math.round((99 / 7) * 100));
    });

    it('sums decimal scores without truncation', () => {
        const decimalPack: ContentPackData = {
            ...pack,
            domains: [
                {
                    domain_id: 'DOM1',
                    title: 'Domain One',
                    targets: [
                        {
                            target_id: 'TD',
                            title: 'Decimal',
                            success_criteria: 'Criteria',
                            materials: '',
                            scoring: {
                                type: 'numeric',
                                scale: [0, 0.5, 1],
                                scale_labels: {},
                                no_opportunity_allowed: false,
                            },
                        },
                    ],
                },
            ],
        };

        const stats = analyticsService.calculateDomainStats(decimalPack, [
            makeScore('TD', 0.5),
        ]);
        expect(stats[0].totalScore).toBe(0.5);
        expect(stats[0].maxScore).toBe(1);
        expect(stats[0].percentage).toBe(50);
    });
});
