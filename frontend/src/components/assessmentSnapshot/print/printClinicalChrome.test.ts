import { describe, expect, it } from 'vitest';
import { ContentPackData, Target } from '../../../types';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { buildLearnerMapProfile } from '../../../services/learnerMapProfile';
import {
    formatPrintPageLabel,
    formatTargetIndexPageLabel,
    resolveSnapshotPrintIdentity,
    SNAPSHOT_PRINT_CLINICAL_NOTE,
    SNAPSHOT_PRINT_CONFIDENTIALITY,
    SNAPSHOT_PRINT_PRODUCT_NAME,
} from './printClinicalChrome';

const generatedAt = new Date('2026-07-06T12:00:00.000Z');

function makeTarget(overrides: Partial<Target> & Pick<Target, 'target_id'>): Target {
    return {
        title: overrides.title ?? overrides.target_id,
        success_criteria: 'Criteria',
        materials: '',
        scoring: {
            type: 'numeric',
            scale: [0, 1, 2, 3, 4],
            scale_labels: {},
            no_opportunity_allowed: false,
        },
        ...overrides,
    };
}

function makeProfile() {
    const pack: ContentPackData = {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Alpha Pack',
        description: '',
        version: '2.1',
        domains: [
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [makeTarget({ target_id: 'A1' })],
            },
        ],
    };

    return buildAssessmentSnapshotProfile(
        buildLearnerMapProfile({
            assessment: { id: 'assess-1', pack_snapshot: pack },
            cycles: [
                { cycle: { id: 'c1', cycle_number: 1, status: 'closed' }, scores: [] },
                { cycle: { id: 'c2', cycle_number: 2, status: 'closed' }, scores: [] },
            ],
            generatedAt,
        })
    );
}

describe('printClinicalChrome', () => {
    it('resolves production identity without inventing missing fields', () => {
        const profile = makeProfile();
        const identity = resolveSnapshotPrintIdentity(profile, {
            learnerName: 'Jordan Lee',
            assessmentName: 'Fall Reassessment',
            organizationName: 'North Clinic',
        });

        expect(identity.learnerName).toBe('Jordan Lee');
        expect(identity.assessmentName).toBe('Fall Reassessment');
        expect(identity.organizationName).toBe('North Clinic');
        expect(identity.packLabel).toBe('Alpha Pack (v2.1)');
        expect(identity.cycleCount).toBe(2);
    });

    it('omits organization when absent or placeholder', () => {
        const profile = makeProfile();
        expect(resolveSnapshotPrintIdentity(profile).organizationName).toBeNull();
        expect(
            resolveSnapshotPrintIdentity(profile, {
                learnerName: 'A',
                assessmentName: 'B',
                organizationName: '—',
            }).organizationName
        ).toBeNull();
    });

    it('formats page labels for the repeated footer', () => {
        expect(formatPrintPageLabel(1, 2)).toBe('Page 1 of 2');
        expect(formatPrintPageLabel(4, 4)).toBe('Page 4 of 4');
        expect(formatTargetIndexPageLabel(1, 1)).toBe('Target index — page 1 of 1');
        expect(formatTargetIndexPageLabel(2, 3)).toBe('Target index — page 2 of 3');
    });

    it('exposes confidential clinical chrome copy', () => {
        expect(SNAPSHOT_PRINT_PRODUCT_NAME).toBe('Evalis');
        expect(SNAPSHOT_PRINT_CONFIDENTIALITY.toLowerCase()).toContain('confidential');
        expect(SNAPSHOT_PRINT_CLINICAL_NOTE.length).toBeGreaterThan(20);
        expect(SNAPSHOT_PRINT_CLINICAL_NOTE.length).toBeLessThan(160);
    });
});
