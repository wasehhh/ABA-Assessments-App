import { describe, expect, it } from 'vitest';
import { ContentPackData } from '../types';
import {
    buildAssessmentSnapshotRouteHash,
    getAssessmentSnapshotAvailability,
    profileHasAnyScoredEvidence,
} from './assessmentSnapshotAvailability';
import { buildAssessmentSnapshotProfile } from './assessmentSnapshotProfile';
import { buildLearnerMapProfile } from './learnerMapProfile';

const pack: ContentPackData = {
    pack_id: 'p1',
    org_id: 'o1',
    title: 'Pack',
    description: '',
    version: '1',
    domains: [
        {
            domain_id: 'D1',
            title: 'Domain',
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
};

describe('assessmentSnapshotAvailability', () => {
    it('allows a valid assessment with pack, domains, targets, and a cycle', () => {
        expect(
            getAssessmentSnapshotAvailability({
                assessment: { id: 'a1', pack_snapshot: pack },
                cycleCount: 1,
            })
        ).toEqual({ available: true, code: 'available' });
    });

    it('rejects missing assessment', () => {
        expect(getAssessmentSnapshotAvailability({ assessment: null, cycleCount: 1 })).toMatchObject(
            {
                available: false,
                code: 'not_found',
            }
        );
    });

    it('rejects missing pack snapshot', () => {
        expect(
            getAssessmentSnapshotAvailability({
                assessment: { id: 'a1', pack_snapshot: null },
                cycleCount: 1,
            }).code
        ).toBe('missing_pack');
    });

    it('rejects packs with no domains', () => {
        expect(
            getAssessmentSnapshotAvailability({
                assessment: {
                    id: 'a1',
                    pack_snapshot: { ...pack, domains: [] },
                },
                cycleCount: 1,
            }).code
        ).toBe('no_domains');
    });

    it('rejects packs with no targets', () => {
        expect(
            getAssessmentSnapshotAvailability({
                assessment: {
                    id: 'a1',
                    pack_snapshot: {
                        ...pack,
                        domains: [{ domain_id: 'D1', title: 'Domain', targets: [] }],
                    },
                },
                cycleCount: 1,
            }).code
        ).toBe('no_targets');
    });

    it('rejects assessments with no cycles', () => {
        expect(
            getAssessmentSnapshotAvailability({
                assessment: { id: 'a1', pack_snapshot: pack },
                cycleCount: 0,
            }).code
        ).toBe('no_cycles');
    });

    it('allows fully unscored assessments when structure is valid', () => {
        const availability = getAssessmentSnapshotAvailability({
            assessment: { id: 'a1', pack_snapshot: pack },
            cycleCount: 2,
        });
        expect(availability.available).toBe(true);

        const snapshot = buildAssessmentSnapshotProfile(
            buildLearnerMapProfile({
                assessment: { id: 'a1', pack_snapshot: pack },
                cycles: [
                    { cycle: { id: 'c1', cycle_number: 1, status: 'closed' }, scores: [] },
                    { cycle: { id: 'c2', cycle_number: 2, status: 'in_progress' }, scores: [] },
                ],
            })
        );

        expect(profileHasAnyScoredEvidence(snapshot)).toBe(false);
    });

    it('builds the production snapshot route hash', () => {
        expect(buildAssessmentSnapshotRouteHash('abc-123')).toBe('#/assessment/abc-123/snapshot');
    });
});
