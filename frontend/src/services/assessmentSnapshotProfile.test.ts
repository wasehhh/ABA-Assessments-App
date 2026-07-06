import { describe, expect, it } from 'vitest';
import { buildLearnerMapProfile } from './learnerMapProfile';
import { buildAssessmentSnapshotProfile } from './assessmentSnapshotProfile';

describe('buildAssessmentSnapshotProfile', () => {
    it('projects normalized learner map evidence without duplicating domains', () => {
        const learnerMapProfile = buildLearnerMapProfile({
            assessment: {
                id: 'assess-1',
                pack_snapshot: {
                    pack_id: 'pack-1',
                    org_id: 'org-1',
                    title: 'Pack',
                    description: '',
                    version: '1.0',
                    domains: [
                        {
                            domain_id: 'DOM_1',
                            title: 'Domain 1',
                            targets: [
                                {
                                    target_id: 'T1',
                                    title: 'Target 1',
                                    success_criteria: '',
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
                },
            },
            cycles: [
                {
                    cycle: { id: 'c1', cycle_number: 1, status: 'closed' },
                    scores: [],
                },
                {
                    cycle: { id: 'c2', cycle_number: 2, status: 'closed' },
                    scores: [],
                },
            ],
            generatedAt: new Date('2026-05-22T12:00:00.000Z'),
        });

        const snapshotProfile = buildAssessmentSnapshotProfile(learnerMapProfile);

        expect(snapshotProfile.metadata).toEqual(learnerMapProfile.metadata);
        expect(snapshotProfile.structureLabels).toEqual(learnerMapProfile.structureLabels);
        expect(snapshotProfile.cycles).toEqual(learnerMapProfile.cycles);
        expect(snapshotProfile.domains).toEqual(learnerMapProfile.domains);
        expect(snapshotProfile.domains[0].targets[0].cells).toHaveLength(2);
    });
});
