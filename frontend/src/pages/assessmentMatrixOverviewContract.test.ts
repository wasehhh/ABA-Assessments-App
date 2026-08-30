import { describe, expect, it } from 'vitest';
import { getStructureLabels } from '../utils/assessmentPackStructure';
import {
    buildAssessmentSnapshotRouteHash,
    getAssessmentSnapshotAvailability,
} from '../services/assessmentSnapshotAvailability';
import {
    MATRIX_ACTION_MARKERS,
    MATRIX_OVERVIEW_CONTRACT,
    formatMatrixOverviewHeading,
    matrixExposesLandscapeToggle,
    matrixUsesViewSelectionState,
} from './assessmentMatrixOverviewContract';
import { ContentPackData } from '../types';

const flatPack: ContentPackData = {
    pack_id: 'p1',
    org_id: 'o1',
    title: 'Flat Pack',
    description: '',
    version: '1',
    domains: [
        {
            domain_id: 'D1',
            title: 'Domain A',
            targets: [
                {
                    target_id: 'T1',
                    title: 'Target 1',
                    success_criteria: '',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
            ],
        },
        {
            domain_id: 'D2',
            title: 'Domain B',
            targets: [
                {
                    target_id: 'T2',
                    title: 'Target 2',
                    success_criteria: '',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
            ],
        },
    ],
};

const levelPack: ContentPackData = {
    ...flatPack,
    pack_id: 'vb',
    title: 'VB-like',
    structure_labels: {
        primary_group: 'Level',
        secondary_group: 'Domain',
        target: 'Milestone',
    },
    domains: [
        {
            domain_id: 'L1',
            title: 'Level 1',
            secondary_groups: [{ secondary_group_id: 'sg_mand', title: 'Mand' }],
            targets: [
                {
                    target_id: 'L1_MAND_1',
                    title: 'Mand 1',
                    secondary_group_id: 'sg_mand',
                    success_criteria: '',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
            ],
        },
    ],
};

describe('Assessment Matrix overview contract (PR13.5C)', () => {
    it('does not expose a Landscape toggle or view-selection state', () => {
        expect(MATRIX_OVERVIEW_CONTRACT.landscapeToggleAbsent).toBe(true);
        expect(MATRIX_OVERVIEW_CONTRACT.domainsOnly).toBe(true);
        expect(MATRIX_OVERVIEW_CONTRACT.landscapeViewRemoved).toBe(true);
        expect(matrixExposesLandscapeToggle()).toBe(false);
        expect(matrixUsesViewSelectionState()).toBe(false);
    });

    it('formats Domain Overview headings from structure labels', () => {
        const flatLabels = getStructureLabels(flatPack);
        expect(formatMatrixOverviewHeading(flatLabels.primary_group, 2)).toBe(
            'Domain Overview (2)'
        );

        const levelLabels = getStructureLabels(levelPack);
        expect(formatMatrixOverviewHeading(levelLabels.primary_group, 1)).toBe(
            'Level Overview (1)'
        );
        expect(formatMatrixOverviewHeading(levelLabels.primary_group, 1)).not.toContain(
            'Landscape'
        );
    });

    it('keeps primary-group cards available via Domain Overview data', () => {
        expect(flatPack.domains.map((domain) => domain.domain_id)).toEqual(['D1', 'D2']);
        expect(levelPack.domains.map((domain) => domain.domain_id)).toEqual(['L1']);
        expect(levelPack.domains[0]?.secondary_groups?.[0]?.title).toBe('Mand');
    });

    it('keeps Snapshot and Learner Map entry contracts', () => {
        expect(MATRIX_ACTION_MARKERS.snapshotLabel).toBe('Assessment Snapshot');
        expect(MATRIX_ACTION_MARKERS.writeReportLabel).toBe('Write Report');
        expect(MATRIX_ACTION_MARKERS.communicationReportLabel).toBe('Communication Report');
        expect(MATRIX_ACTION_MARKERS.learnerMapLabel).toBe('Learner Map');
        expect(MATRIX_ACTION_MARKERS.snapshotEntry).toBe('data-assessment-snapshot-entry');
        expect(buildAssessmentSnapshotRouteHash('abc')).toBe('#/assessment/abc/snapshot');
        expect(
            getAssessmentSnapshotAvailability({
                assessment: { id: 'abc', pack_snapshot: flatPack },
                cycleCount: 1,
            }).available
        ).toBe(true);
    });
});
