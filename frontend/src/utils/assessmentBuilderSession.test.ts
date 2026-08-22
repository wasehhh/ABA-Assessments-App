import { describe, expect, it } from 'vitest';
import { Domain } from '../types';
import {
    buildBuilderSessionSnapshot,
    builderIssueAnchorId,
    builderSessionSnapshotsEqual,
} from './assessmentBuilderSession';
import { NEW_PACK_DEFAULT_SCALE_CSV } from './assessmentPackCanonical';

function baseInput(overrides: Partial<Parameters<typeof buildBuilderSessionSnapshot>[0]> = {}) {
    const domains: Domain[] = [
        {
            domain_id: 'A',
            title: 'Domain A',
            targets: [
                {
                    target_id: 'A1',
                    title: 'Target A1',
                    success_criteria: 'Criteria',
                    materials: '',
                },
            ],
        },
    ];

    return {
        title: 'Pack Title',
        description: 'Description',
        domains,
        scoringMode: 'uniform' as const,
        defaultScoring: {
            type: 'numeric' as const,
            scale: [0, 1, 2],
            scale_labels: {},
            no_opportunity_allowed: false,
        },
        defaultScale: NEW_PACK_DEFAULT_SCALE_CSV,
        globalScaleLabels: {},
        targetScaleDrafts: {},
        primaryGroupLabel: 'Domain',
        targetLabel: 'Target',
        secondaryGroupLabel: '',
        secondaryGroupingEnabled: false,
        ...overrides,
    };
}

describe('assessmentBuilderSession snapshot dirty detection', () => {
    it('mount snapshot equals itself (not dirty)', () => {
        const baseline = buildBuilderSessionSnapshot(baseInput());
        const current = buildBuilderSessionSnapshot(baseInput());
        expect(builderSessionSnapshotsEqual(baseline, current)).toBe(true);
    });

    it('detects title-only edits', () => {
        const baseline = buildBuilderSessionSnapshot(baseInput());
        const current = buildBuilderSessionSnapshot(baseInput({ title: 'Changed Title' }));
        expect(builderSessionSnapshotsEqual(baseline, current)).toBe(false);
    });

    it('detects uncommitted Uniform defaultScale CSV edits', () => {
        const baseline = buildBuilderSessionSnapshot(
            baseInput({ defaultScale: '0,1,2,3,4' })
        );
        const current = buildBuilderSessionSnapshot(
            baseInput({ defaultScale: '0,1,2' })
        );
        expect(builderSessionSnapshotsEqual(baseline, current)).toBe(false);
    });

    it('detects uncommitted Custom targetScaleDrafts edits', () => {
        const customDomains: Domain[] = [
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [
                    {
                        target_id: 'A1',
                        title: 'Target A1',
                        success_criteria: 'Criteria',
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
        ];

        const baseline = buildBuilderSessionSnapshot(
            baseInput({
                scoringMode: 'custom',
                domains: customDomains,
                defaultScoring: {
                    type: 'numeric',
                    scale: [0, 1, 2],
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
            })
        );
        const current = buildBuilderSessionSnapshot(
            baseInput({
                scoringMode: 'custom',
                domains: customDomains,
                defaultScoring: {
                    type: 'numeric',
                    scale: [0, 1, 2],
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
                targetScaleDrafts: { '0:0': '0,1,2,3' },
            })
        );
        expect(builderSessionSnapshotsEqual(baseline, current)).toBe(false);
    });

    it('detects secondaryGroupingEnabled toggle as dirty', () => {
        const baseline = buildBuilderSessionSnapshot(baseInput());
        const current = buildBuilderSessionSnapshot(
            baseInput({
                secondaryGroupingEnabled: true,
                secondaryGroupLabel: 'Category',
            })
        );
        expect(builderSessionSnapshotsEqual(baseline, current)).toBe(false);
    });

    it('returns to not-dirty when edits are reverted', () => {
        const baseline = buildBuilderSessionSnapshot(baseInput());
        const edited = buildBuilderSessionSnapshot(baseInput({ title: 'Changed' }));
        expect(builderSessionSnapshotsEqual(baseline, edited)).toBe(false);
        const reverted = buildBuilderSessionSnapshot(baseInput({ title: 'Pack Title' }));
        expect(builderSessionSnapshotsEqual(baseline, reverted)).toBe(true);
    });

    it('strips secondary grouping in snapshot when disabled (matches save shape)', () => {
        const snapshot = buildBuilderSessionSnapshot(
            baseInput({
                secondaryGroupingEnabled: false,
                secondaryGroupLabel: 'Should Not Persist',
                domains: [
                    {
                        domain_id: 'A',
                        title: 'Domain A',
                        secondary_groups: [{ secondary_group_id: 'sg1', title: 'Group' }],
                        targets: [
                            {
                                target_id: 'A1',
                                title: 'Target',
                                success_criteria: '',
                                materials: '',
                                secondary_group_id: 'sg1',
                            },
                        ],
                    },
                ],
            })
        );

        expect(snapshot.pack.structure_labels?.secondary_group).toBeUndefined();
        expect(snapshot.pack.domains[0]?.secondary_groups).toBeUndefined();
        expect(snapshot.pack.domains[0]?.targets[0]).not.toHaveProperty('secondary_group_id');
    });
});

describe('builderIssueAnchorId', () => {
    it('builds stable anchor ids', () => {
        expect(builderIssueAnchorId({ field: 'title', message: 'Required' })).toBe(
            'builder-issue-title'
        );
        expect(
            builderIssueAnchorId({
                field: 'domain_id',
                domainIndex: 2,
                message: 'Invalid',
            })
        ).toBe('builder-issue-domain_id-2');
        expect(
            builderIssueAnchorId({
                field: 'scale',
                domainIndex: 0,
                targetIndex: 1,
                message: 'Invalid scale',
            })
        ).toBe('builder-issue-scale-0-1');
    });
});

describe('builderSessionSnapshotsEqual on pack metadata', () => {
    it('compares pack_id independently from authoring fields', () => {
        const left = buildBuilderSessionSnapshot(baseInput({ packId: 'a' }));
        const right = buildBuilderSessionSnapshot(baseInput({ packId: 'b' }));
        expect(builderSessionSnapshotsEqual(left, right)).toBe(false);
    });
});
