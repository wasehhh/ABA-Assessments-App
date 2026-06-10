import { describe, it, expect } from 'vitest';
import { AssessmentScore, ContentPackData } from '../types';
import { buildDomainProfiles } from './domainProfile';

function makeScore(targetId: string, domainId: string, score: number | null): AssessmentScore {
    return {
        id: `score-${targetId}`,
        assessment_id: 'assess-1',
        assessment_cycle_id: 'cycle-1',
        client_id: 'client-1',
        pack_snapshot_id: 'pack-1',
        target_id: targetId,
        domain_id: domainId,
        score,
        note: null,
        evidence_files: [],
        assessor_user_id: 'user-1',
        scored_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

const mixedScalePack: ContentPackData = {
    pack_id: 'pack-1',
    org_id: 'org-1',
    title: 'Mixed Scale Pack',
    description: '',
    version: '1.0',
    domains: [
        {
            domain_id: 'DOM_MIXED',
            title: 'Mixed Numeric Domain',
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
        {
            domain_id: 'DOM_YN',
            title: 'Yes/No Only Domain',
            targets: [
                {
                    target_id: 'YN1',
                    title: 'Yes/No One',
                    success_criteria: 'Criteria',
                    materials: '',
                    scoring: {
                        type: 'yesno',
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
                {
                    target_id: 'YN2',
                    title: 'Yes/No Two',
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
        {
            domain_id: 'DOM_B',
            title: 'Second Domain',
            targets: [
                {
                    target_id: 'B1',
                    title: 'Domain B Target',
                    success_criteria: 'Criteria',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2, 3, 4],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
            ],
        },
    ],
};

describe('buildDomainProfiles', () => {
    it('builds one profile per domain and preserves domain order', () => {
        const profiles = buildDomainProfiles(mixedScalePack, []);

        expect(profiles).toHaveLength(3);
        expect(profiles.map((p) => p.domainId)).toEqual(['DOM_MIXED', 'DOM_YN', 'DOM_B']);
        expect(profiles.map((p) => p.title)).toEqual([
            'Mixed Numeric Domain',
            'Yes/No Only Domain',
            'Second Domain',
        ]);
    });

    it('preserves target order in sequence', () => {
        const profiles = buildDomainProfiles(mixedScalePack, []);

        expect(profiles[0].sequence.map((item) => item.target.target_id)).toEqual([
            'T04',
            'T02',
            'TYN',
        ]);
    });

    it('computes coverage from domain stats', () => {
        const profiles = buildDomainProfiles(mixedScalePack, [
            makeScore('T04', 'DOM_MIXED', 4),
            makeScore('T02', 'DOM_MIXED', null),
            makeScore('TYN', 'DOM_MIXED', 1),
        ]);

        expect(profiles[0].coverage).toEqual({ scored: 2, total: 3 });
    });

    it('computes points captured with target-specific max values', () => {
        const profiles = buildDomainProfiles(mixedScalePack, [
            makeScore('T04', 'DOM_MIXED', 4),
            makeScore('T02', 'DOM_MIXED', 2),
            makeScore('TYN', 'DOM_MIXED', 1),
        ]);

        expect(profiles[0].pointsCaptured).toEqual({
            earned: 7,
            available: 7,
            percentage: 100,
        });
    });

    it('separates unscored, not_yet, in_progress, and at_maximum states', () => {
        const profiles = buildDomainProfiles(mixedScalePack, [
            makeScore('T04', 'DOM_MIXED', null),
            makeScore('T02', 'DOM_MIXED', 0),
            makeScore('TYN', 'DOM_MIXED', 1),
            makeScore('B1', 'DOM_B', 2),
        ]);

        expect(profiles[0].stateDistribution).toMatchObject({
            unscored: 1,
            not_yet: 1,
            in_progress: 0,
            at_maximum: 1,
            showsInProgressBucket: true,
        });
        expect(profiles[2].stateDistribution).toMatchObject({
            unscored: 0,
            not_yet: 0,
            in_progress: 1,
            at_maximum: 0,
            showsInProgressBucket: true,
        });
    });

    it('sets showsInProgressBucket false for all yes/no domains', () => {
        const profiles = buildDomainProfiles(mixedScalePack, [
            makeScore('YN1', 'DOM_YN', 0),
            makeScore('YN2', 'DOM_YN', 1),
        ]);

        expect(profiles[1].stateDistribution.showsInProgressBucket).toBe(false);
    });

    it('returns null cycleDelta when previous scores are missing or empty', () => {
        const current = [makeScore('T04', 'DOM_MIXED', 4)];

        expect(buildDomainProfiles(mixedScalePack, current)[0].cycleDelta).toBeNull();
        expect(buildDomainProfiles(mixedScalePack, current, [])[0].cycleDelta).toBeNull();
    });

    it('computes cycle delta counts and points captured delta', () => {
        const current = [
            makeScore('T04', 'DOM_MIXED', 4),
            makeScore('T02', 'DOM_MIXED', 2),
            makeScore('TYN', 'DOM_MIXED', 1),
        ];
        const previous = [
            makeScore('T04', 'DOM_MIXED', 2),
            makeScore('T02', 'DOM_MIXED', null),
            makeScore('TYN', 'DOM_MIXED', 0),
        ];

        const profile = buildDomainProfiles(mixedScalePack, current, previous)[0];

        expect(profile.cycleDelta).toEqual({
            atMaximumDelta: 3,
            newlyScoredDelta: 1,
            pointsCapturedDelta: 71,
            hasBaseline: true,
        });
    });

    it('resolves sequence trend values: new, up, down, flat', () => {
        const current = [
            makeScore('T04', 'DOM_MIXED', 3),
            makeScore('T02', 'DOM_MIXED', 2),
            makeScore('TYN', 'DOM_MIXED', 1),
        ];
        const previous = [
            makeScore('T04', 'DOM_MIXED', 1),
            makeScore('T02', 'DOM_MIXED', null),
            makeScore('TYN', 'DOM_MIXED', 1),
        ];

        const trends = buildDomainProfiles(mixedScalePack, current, previous)[0].sequence.map(
            (item) => item.trend
        );

        expect(trends).toEqual(['up', 'new', 'flat']);
    });

    it('treats missing score rows as unscored, not zero', () => {
        const profile = buildDomainProfiles(mixedScalePack, [])[0];

        expect(profile.sequence[0].interpretation.isUnscored).toBe(true);
        expect(profile.sequence[0].interpretation.competencyState).toBe('unscored');
        expect(profile.stateDistribution.unscored).toBe(3);
        expect(profile.stateDistribution.not_yet).toBe(0);
    });
});
