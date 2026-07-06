import { describe, it, expect } from 'vitest';
import { AssessmentScore, ContentPackData } from '../types';
import { buildLearnerMapProfile } from './learnerMapProfile';

const generatedAt = new Date('2026-05-22T12:00:00.000Z');

function makeScore(
    targetId: string,
    domainId: string,
    score: number | null,
    cycleId: string
): AssessmentScore {
    return {
        id: `score-${cycleId}-${targetId}`,
        assessment_id: 'assess-1',
        assessment_cycle_id: cycleId,
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

const emptyPack: ContentPackData = {
    pack_id: 'pack-empty',
    org_id: 'org-1',
    title: 'Empty Pack',
    description: '',
    version: '1.0',
    domains: [],
};

const singleDomainPack: ContentPackData = {
    pack_id: 'pack-single',
    org_id: 'org-1',
    title: 'Single Domain Pack',
    description: '',
    version: '1.0',
    domains: [
        {
            domain_id: 'DOM_SINGLE',
            title: 'Single Domain',
            targets: [
                {
                    target_id: 'S1',
                    title: 'Single Target',
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

const manyTargetsPack: ContentPackData = {
    pack_id: 'pack-many',
    org_id: 'org-1',
    title: 'Many Targets Pack',
    description: '',
    version: '1.0',
    domains: [
        {
            domain_id: 'DOM_MANY',
            title: 'Many Targets Domain',
            targets: Array.from({ length: 12 }, (_, index) => ({
                target_id: `T${index + 1}`,
                title: `Target ${index + 1}`,
                success_criteria: 'Criteria',
                materials: '',
                scoring: {
                    type: 'numeric' as const,
                    scale: [0, 1, 2, 3, 4],
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
            })),
        },
    ],
};

const baseAssessment = {
    id: 'assess-1',
    pack_snapshot: mixedScalePack,
};

const cycle1 = { id: 'cycle-1', cycle_number: 1, status: 'locked' as const };
const cycle2 = { id: 'cycle-2', cycle_number: 2, status: 'in_progress' as const };
const cycle3 = { id: 'cycle-3', cycle_number: 3, status: 'in_progress' as const };

describe('buildLearnerMapProfile', () => {
    it('handles empty pack with zero totals', () => {
        const profile = buildLearnerMapProfile({
            assessment: { id: 'assess-empty', pack_snapshot: emptyPack },
            cycles: [{ cycle: cycle1, scores: [] }],
            generatedAt,
        });

        expect(profile.domains).toEqual([]);
        expect(profile.cycles).toHaveLength(1);
        expect(profile.totals).toEqual({
            totalDomains: 0,
            totalTargets: 0,
            totalCycles: 1,
            totalCells: 0,
            scoredCells: 0,
        });
    });

    it('builds single domain and single target with one cycle', () => {
        const profile = buildLearnerMapProfile({
            assessment: { id: 'assess-1', pack_snapshot: singleDomainPack },
            cycles: [
                {
                    cycle: cycle1,
                    scores: [makeScore('S1', 'DOM_SINGLE', 3, 'cycle-1')],
                },
            ],
            generatedAt,
        });

        expect(profile.domains).toHaveLength(1);
        expect(profile.domains[0].targets).toHaveLength(1);
        expect(profile.domains[0].targets[0].cells[0]).toMatchObject({
            cycleId: 'cycle-1',
            cycleNumber: 1,
            rawScore: 3,
            displayScoreWithMax: '3/4',
            competencyState: 'in_progress',
            isUnscored: false,
            movementFromPrevious: 'none',
        });
    });

    it('preserves domain pack order', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [{ cycle: cycle1, scores: [] }],
            generatedAt,
        });

        expect(profile.domains.map((domain) => domain.domainId)).toEqual([
            'DOM_MIXED',
            'DOM_YN',
            'DOM_B',
        ]);
    });

    it('preserves target order within domains', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [{ cycle: cycle1, scores: [] }],
            generatedAt,
        });

        expect(profile.domains[0].targets.map((target) => target.targetId)).toEqual([
            'T04',
            'T02',
            'TYN',
        ]);
    });

    it('sorts cycles by cycle number ascending', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [
                { cycle: cycle3, scores: [] },
                { cycle: cycle1, scores: [] },
                { cycle: cycle2, scores: [] },
            ],
            generatedAt,
        });

        expect(profile.cycles.map((cycle) => cycle.cycleNumber)).toEqual([1, 2, 3]);
        expect(profile.domains[0].targets[0].cells.map((cell) => cell.cycleNumber)).toEqual([
            1, 2, 3,
        ]);
    });

    it('keeps unscored targets unscored across cycles', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [
                { cycle: cycle1, scores: [] },
                { cycle: cycle2, scores: [] },
            ],
            generatedAt,
        });

        const cell = profile.domains[0].targets[0].cells[0];
        expect(cell.isUnscored).toBe(true);
        expect(cell.competencyState).toBe('unscored');
        expect(cell.displayScoreWithMax).toBe('—');
        expect(cell.rawScore).toBeNull();
        expect(cell.movementFromPrevious).toBe('none');
    });

    it('treats scored zero as Not Yet, not Unscored', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [
                {
                    cycle: cycle1,
                    scores: [makeScore('T04', 'DOM_MIXED', 0, 'cycle-1')],
                },
            ],
            generatedAt,
        });

        expect(profile.domains[0].targets[0].cells[0]).toMatchObject({
            rawScore: 0,
            isUnscored: false,
            competencyState: 'not_yet',
            displayScoreWithMax: '0/4',
        });
    });

    it('interprets mixed scales correctly', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [
                {
                    cycle: cycle1,
                    scores: [
                        makeScore('T04', 'DOM_MIXED', 4, 'cycle-1'),
                        makeScore('T02', 'DOM_MIXED', 2, 'cycle-1'),
                        makeScore('TYN', 'DOM_MIXED', 1, 'cycle-1'),
                        makeScore('YN1', 'DOM_YN', 0, 'cycle-1'),
                    ],
                },
            ],
            generatedAt,
        });

        const mixedTargets = profile.domains[0].targets;
        expect(mixedTargets[0].cells[0]).toMatchObject({
            displayScoreWithMax: '4/4',
            competencyState: 'at_maximum',
        });
        expect(mixedTargets[1].cells[0]).toMatchObject({
            displayScoreWithMax: '2/2',
            competencyState: 'at_maximum',
        });
        expect(mixedTargets[2].cells[0]).toMatchObject({
            displayScoreWithMax: '1/1',
            competencyState: 'at_maximum',
        });
        expect(profile.domains[1].targets[0].cells[0]).toMatchObject({
            displayScoreWithMax: '0/1',
            competencyState: 'not_yet',
        });
    });

    it('resolves movement: none, new, up, down, flat', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [
                {
                    cycle: cycle1,
                    scores: [
                        makeScore('T04', 'DOM_MIXED', 1, 'cycle-1'),
                        makeScore('T02', 'DOM_MIXED', null, 'cycle-1'),
                        makeScore('TYN', 'DOM_MIXED', 1, 'cycle-1'),
                    ],
                },
                {
                    cycle: cycle2,
                    scores: [
                        makeScore('T04', 'DOM_MIXED', 3, 'cycle-2'),
                        makeScore('T02', 'DOM_MIXED', 1, 'cycle-2'),
                        makeScore('TYN', 'DOM_MIXED', 1, 'cycle-2'),
                    ],
                },
            ],
            generatedAt,
        });

        const targetCells = profile.domains[0].targets;
        expect(targetCells[0].cells[0].movementFromPrevious).toBe('none');
        expect(targetCells[0].cells[1].movementFromPrevious).toBe('up');
        expect(targetCells[1].cells[1].movementFromPrevious).toBe('new');
        expect(targetCells[2].cells[1].movementFromPrevious).toBe('flat');
    });

    it('resolves down movement between cycles', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [
                {
                    cycle: cycle1,
                    scores: [makeScore('T04', 'DOM_MIXED', 4, 'cycle-1')],
                },
                {
                    cycle: cycle2,
                    scores: [makeScore('T04', 'DOM_MIXED', 2, 'cycle-2')],
                },
            ],
            generatedAt,
        });

        expect(profile.domains[0].targets[0].cells[1].movementFromPrevious).toBe('down');
    });

    it('handles domains with many targets', () => {
        const profile = buildLearnerMapProfile({
            assessment: { id: 'assess-many', pack_snapshot: manyTargetsPack },
            cycles: [{ cycle: cycle1, scores: [] }],
            generatedAt,
        });

        expect(profile.domains[0].targets).toHaveLength(12);
        expect(profile.totals.totalTargets).toBe(12);
    });

    it('handles missing score rows for a target in a cycle', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [
                {
                    cycle: cycle1,
                    scores: [makeScore('T04', 'DOM_MIXED', 2, 'cycle-1')],
                },
                {
                    cycle: cycle2,
                    scores: [],
                },
            ],
            generatedAt,
        });

        const unscoredCell = profile.domains[0].targets[1].cells[1];
        expect(unscoredCell.isUnscored).toBe(true);
        expect(unscoredCell.movementFromPrevious).toBe('none');
    });

    it('computes assessment-wide totals', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [
                {
                    cycle: cycle1,
                    scores: [
                        makeScore('T04', 'DOM_MIXED', 4, 'cycle-1'),
                        makeScore('T02', 'DOM_MIXED', null, 'cycle-1'),
                        makeScore('TYN', 'DOM_MIXED', 1, 'cycle-1'),
                        makeScore('YN1', 'DOM_YN', 1, 'cycle-1'),
                        makeScore('B1', 'DOM_B', null, 'cycle-1'),
                    ],
                },
                {
                    cycle: cycle2,
                    scores: [
                        makeScore('T04', 'DOM_MIXED', 4, 'cycle-2'),
                        makeScore('T02', 'DOM_MIXED', 2, 'cycle-2'),
                        makeScore('TYN', 'DOM_MIXED', 0, 'cycle-2'),
                        makeScore('YN1', 'DOM_YN', 0, 'cycle-2'),
                        makeScore('B1', 'DOM_B', 1, 'cycle-2'),
                    ],
                },
            ],
            generatedAt,
        });

        expect(profile.totals).toEqual({
            totalDomains: 3,
            totalTargets: 5,
            totalCycles: 2,
            totalCells: 10,
            scoredCells: 8,
        });
    });

    it('includes metadata with generatedAt', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [{ cycle: cycle1, scores: [] }],
            generatedAt,
        });

        expect(profile.metadata).toEqual({
            assessmentId: 'assess-1',
            packTitle: 'Mixed Scale Pack',
            packVersion: '1.0',
            generatedAt: generatedAt.toISOString(),
        });
    });

    it('exposes default structure labels for flat packs', () => {
        const profile = buildLearnerMapProfile({
            assessment: baseAssessment,
            cycles: [{ cycle: cycle1, scores: [] }],
            generatedAt,
        });

        expect(profile.structureLabels).toEqual({
            primary_group: 'Domain',
            target: 'Target',
        });
        expect(profile.domains[0].targetSections).toBeUndefined();
    });

    it('builds secondary target sections and preserves ungrouped targets', () => {
        const groupedPack: ContentPackData = {
            ...baseAssessment.pack_snapshot,
            structure_labels: {
                primary_group: 'Level',
                secondary_group: 'Domain',
                target: 'Milestone',
            },
            domains: [
                {
                    domain_id: 'L1',
                    title: 'Level 1',
                    secondary_groups: [
                        { secondary_group_id: 'sg_a', title: 'Listening' },
                        { secondary_group_id: 'sg_b', title: 'Motor' },
                    ],
                    targets: [
                        {
                            target_id: 'T1',
                            title: 'Listen 1',
                            success_criteria: 'Criteria',
                            materials: '',
                            secondary_group_id: 'sg_a',
                            scoring: {
                                type: 'numeric',
                                scale: [0, 1, 2, 3, 4],
                                scale_labels: {},
                                no_opportunity_allowed: false,
                            },
                        },
                        {
                            target_id: 'T2',
                            title: 'Motor 1',
                            success_criteria: 'Criteria',
                            materials: '',
                            secondary_group_id: 'sg_b',
                            scoring: {
                                type: 'numeric',
                                scale: [0, 1, 2, 3, 4],
                                scale_labels: {},
                                no_opportunity_allowed: false,
                            },
                        },
                        {
                            target_id: 'T3',
                            title: 'Ungrouped',
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

        const profile = buildLearnerMapProfile({
            assessment: { id: 'assess-1', pack_snapshot: groupedPack },
            cycles: [{ cycle: cycle1, scores: [] }],
            generatedAt,
        });

        expect(profile.structureLabels).toEqual({
            primary_group: 'Level',
            secondary_group: 'Domain',
            target: 'Milestone',
        });
        expect(profile.domains[0].targetSections?.map((section) => section.title)).toEqual([
            'Listening',
            'Motor',
            'Ungrouped',
        ]);
        expect(profile.domains[0].targets.map((target) => target.targetId)).toEqual([
            'T1',
            'T2',
            'T3',
        ]);
    });
});
