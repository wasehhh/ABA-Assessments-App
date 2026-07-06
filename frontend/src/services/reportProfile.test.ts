import { describe, it, expect } from 'vitest';
import { AssessmentScore, ContentPackData } from '../types';
import { interpretTargetScore } from '../utils/scoreInterpretation';
import { buildAssessmentLandscapeRollup } from './assessmentLandscape';
import { buildDomainProfiles } from './domainProfile';
import { buildReportProfile } from './reportProfile';

function makeScore(
    targetId: string,
    domainId: string,
    score: number | null,
    note: string | null = null
): AssessmentScore {
    return {
        id: `score-${targetId}`,
        assessment_id: 'assess-1',
        assessment_cycle_id: 'cycle-2',
        client_id: 'client-1',
        pack_snapshot_id: 'pack-1',
        target_id: targetId,
        domain_id: domainId,
        score,
        note,
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
            domain_id: 'DOM_EMPTY',
            title: 'Empty Domain',
            targets: [],
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

const generatedAt = new Date('2026-05-22T12:00:00.000Z');

const baseInput = {
    assessment: {
        id: 'assess-1',
        client_id: 'client-1',
        assessment_date: '2026-05-01',
        status: 'in_progress',
        client: {
            first_name: 'Alex',
            last_name: 'Rivera',
        },
        pack_snapshot: mixedScalePack,
    },
    cycle: {
        id: 'cycle-2',
        cycle_number: 2,
        status: 'in_progress' as const,
    },
    generatedAt,
};

describe('buildReportProfile', () => {
    it('handles empty assessments with zeroed rollup and distribution', () => {
        const report = buildReportProfile({
            ...baseInput,
            assessment: {
                ...baseInput.assessment,
                pack_snapshot: emptyPack,
            },
            scores: [],
        });

        expect(report.domains).toEqual([]);
        expect(report.rollup).toEqual({
            totalDomains: 0,
            incompleteDomains: 0,
            scoredTargets: 0,
            totalTargets: 0,
            coveragePercentage: 0,
            pointsCapturedPercentage: 0,
        });
        expect(report.assessmentBandDistribution).toEqual({
            unscored: 0,
            not_yet: 0,
            in_progress: 0,
            at_maximum: 0,
            showsInProgressBucket: false,
        });
    });

    it('includes metadata for assessment and cycle', () => {
        const report = buildReportProfile({
            ...baseInput,
            scores: [],
        });

        expect(report.metadata).toEqual({
            assessmentId: 'assess-1',
            assessmentTitle: 'Mixed Scale Pack',
            packTitle: 'Mixed Scale Pack',
            packVersion: '1.0',
            assessmentStatus: 'in_progress',
            assessmentDate: '2026-05-01',
            clientId: 'client-1',
            clientName: 'Alex Rivera',
            cycleId: 'cycle-2',
            cycleNumber: 2,
            cycleStatus: 'in_progress',
            generatedAt: generatedAt.toISOString(),
        });
    });

    it('builds domain sections preserving pack order', () => {
        const report = buildReportProfile({
            ...baseInput,
            scores: [],
        });

        expect(report.domains.map((section) => section.profile.domainId)).toEqual([
            'DOM_MIXED',
            'DOM_YN',
            'DOM_EMPTY',
        ]);
    });

    it('handles domains with no targets', () => {
        const report = buildReportProfile({
            ...baseInput,
            scores: [],
        });

        const emptyDomain = report.domains.find((section) => section.profile.domainId === 'DOM_EMPTY');

        expect(emptyDomain?.targets).toEqual([]);
        expect(emptyDomain?.profile.coverage).toEqual({ scored: 0, total: 0 });
    });

    it('maps scored targets with interpretation fields', () => {
        const scores = [
            makeScore('T04', 'DOM_MIXED', 4),
            makeScore('T02', 'DOM_MIXED', 2),
            makeScore('TYN', 'DOM_MIXED', 1),
            makeScore('YN1', 'DOM_YN', 0),
        ];

        const report = buildReportProfile({
            ...baseInput,
            scores,
        });

        const mixedDomain = report.domains[0].targets;

        expect(mixedDomain[0]).toMatchObject({
            targetId: 'T04',
            title: 'Numeric 0-4',
            score: 4,
            displayScoreWithMax: '4/4',
            competencyState: 'at_maximum',
            normalizedRatio: 1,
            note: null,
        });
        expect(mixedDomain[1]).toMatchObject({
            targetId: 'T02',
            title: 'Numeric 0-2',
            score: 2,
            displayScoreWithMax: '2/2',
            competencyState: 'at_maximum',
            normalizedRatio: 1,
        });
        expect(mixedDomain[2]).toMatchObject({
            targetId: 'TYN',
            title: 'Yes/No',
            score: 1,
            displayScoreWithMax: '1/1',
            competencyState: 'at_maximum',
            normalizedRatio: 1,
        });
        expect(report.domains[1].targets[0]).toMatchObject({
            targetId: 'YN1',
            competencyState: 'not_yet',
            score: 0,
            displayScoreWithMax: '0/1',
            normalizedRatio: 0,
        });
    });

    it('maps unscored targets as unscored interpretation', () => {
        const report = buildReportProfile({
            ...baseInput,
            scores: [],
        });

        const unscoredTarget = report.domains[0].targets[0];

        expect(unscoredTarget).toMatchObject({
            targetId: 'T04',
            score: null,
            displayScoreWithMax: '—',
            competencyState: 'unscored',
            normalizedRatio: null,
            note: null,
        });
    });

    it('includes notes when available on score rows', () => {
        const report = buildReportProfile({
            ...baseInput,
            scores: [makeScore('T04', 'DOM_MIXED', 3, 'Emerging skill observed')],
        });

        expect(report.domains[0].targets[0].note).toBe('Emerging skill observed');
    });

    it('aggregates assessment-wide band distribution across domains', () => {
        const report = buildReportProfile({
            ...baseInput,
            scores: [
                makeScore('T04', 'DOM_MIXED', null),
                makeScore('T02', 'DOM_MIXED', 0),
                makeScore('TYN', 'DOM_MIXED', 1),
                makeScore('YN1', 'DOM_YN', 1),
            ],
        });

        expect(report.assessmentBandDistribution).toEqual({
            unscored: 1,
            not_yet: 1,
            in_progress: 0,
            at_maximum: 2,
            showsInProgressBucket: true,
        });
    });

    it('integrates rollup from buildAssessmentLandscapeRollup', () => {
        const scores = [
            makeScore('T04', 'DOM_MIXED', 4),
            makeScore('T02', 'DOM_MIXED', null),
            makeScore('TYN', 'DOM_MIXED', 1),
            makeScore('YN1', 'DOM_YN', 1),
        ];
        const profiles = buildDomainProfiles(mixedScalePack, scores);
        const expectedRollup = buildAssessmentLandscapeRollup(profiles);

        const report = buildReportProfile({
            ...baseInput,
            scores,
        });

        expect(report.rollup).toEqual(expectedRollup);
        expect(report.rollup).toMatchObject({
            totalDomains: 3,
            scoredTargets: 3,
            totalTargets: 4,
            incompleteDomains: 1,
        });
    });

    it('aligns target rows with interpretTargetScore for mixed scales', () => {
        const scores = [
            makeScore('T04', 'DOM_MIXED', 2),
            makeScore('T02', 'DOM_MIXED', 1),
            makeScore('TYN', 'DOM_MIXED', 0),
        ];

        const report = buildReportProfile({
            ...baseInput,
            scores,
        });

        const mixedDomain = report.domains[0];
        mixedDomain.targets.forEach((row, index) => {
            const { target } = mixedDomain.profile.sequence[index];
            const scoreRow = scores.find((s) => s.target_id === target.target_id) ?? null;
            const interpretation = interpretTargetScore(target, scoreRow);

            expect(row.score).toBe(interpretation.rawScore);
            expect(row.displayScoreWithMax).toBe(interpretation.displayScoreWithMax);
            expect(row.competencyState).toBe(interpretation.competencyState);
            expect(row.normalizedRatio).toBe(interpretation.normalizedRatio);
        });
    });

    it('handles missing cycle metadata safely', () => {
        const report = buildReportProfile({
            assessment: {
                id: 'assess-1',
                pack_snapshot: emptyPack,
            },
            scores: [],
            generatedAt,
        });

        expect(report.metadata.cycleId).toBeNull();
        expect(report.metadata.cycleNumber).toBeNull();
        expect(report.metadata.cycleStatus).toBeNull();
        expect(report.metadata.clientName).toBeNull();
    });

    it('exposes structure labels and secondary target sections for grouped packs', () => {
        const groupedPack: ContentPackData = {
            pack_id: 'pack-1',
            org_id: 'org-1',
            title: 'Grouped Pack',
            description: '',
            version: '1.0',
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

        const report = buildReportProfile({
            assessment: {
                id: 'assess-1',
                pack_snapshot: groupedPack,
            },
            cycle: { id: 'cycle-1', cycle_number: 1, status: 'closed' },
            scores: [makeScore('T1', 'L1', 2)],
            generatedAt,
        });

        expect(report.structureLabels).toEqual({
            primary_group: 'Level',
            secondary_group: 'Domain',
            target: 'Milestone',
        });
        expect(report.domains[0].targetSections?.map((section) => section.title)).toEqual([
            'Listening',
            'Ungrouped',
        ]);
        expect(report.domains[0].targets.map((row) => row.targetId)).toEqual(['T1', 'T2']);
    });

    it('leaves targetSections undefined for flat packs', () => {
        const report = buildReportProfile({
            ...baseInput,
            scores: [],
        });

        expect(report.structureLabels).toEqual({
            primary_group: 'Domain',
            target: 'Target',
        });
        report.domains.forEach((section) => {
            expect(section.targetSections).toBeUndefined();
        });
    });
});
