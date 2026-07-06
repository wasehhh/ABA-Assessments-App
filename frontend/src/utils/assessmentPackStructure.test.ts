import { describe, expect, it } from 'vitest';
import { ContentPackData, Domain, Target } from '../types';
import {
    DEFAULT_STRUCTURE_LABELS,
    getOversizedGroupWarning,
    getStructureLabels,
    groupTargetsForDisplay,
    OVERSIZED_GROUP_EXTREME_THRESHOLD,
    OVERSIZED_GROUP_LARGE_THRESHOLD,
    resolveTargetScoring,
} from './assessmentPackStructure';

function makeTarget(overrides: Partial<Target> & Pick<Target, 'target_id'>): Target {
    const { scoring: scoringOverrides, ...rest } = overrides;

    return {
        title: overrides.target_id,
        success_criteria: '',
        materials: '',
        ...rest,
        scoring: {
            type: 'numeric',
            scale_labels: {},
            no_opportunity_allowed: false,
            ...(scoringOverrides
                ? scoringOverrides
                : { scale: [0, 1, 2, 3, 4] }),
        },
    };
}

function makeFlatPack(
    targets: Target[] = [
        makeTarget({
            target_id: 'T1',
            scoring: {
                type: 'numeric',
                scale: [0, 1, 2, 3, 4],
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        }),
    ]
): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Flat Pack',
        description: '',
        version: '1.0',
        domains: [
            {
                domain_id: 'DOM_1',
                title: 'Domain 1',
                targets,
            },
        ],
    };
}

describe('getStructureLabels', () => {
    it('returns Alpha defaults for flat packs without structure_labels', () => {
        const labels = getStructureLabels(makeFlatPack());

        expect(labels).toEqual(DEFAULT_STRUCTURE_LABELS);
        expect(labels.primary_group).toBe('Domain');
        expect(labels.target).toBe('Target');
        expect(labels.secondary_group).toBeUndefined();
    });

    it('returns pack structure labels when provided', () => {
        const pack = makeFlatPack();
        pack.structure_labels = {
            primary_group: 'Level',
            secondary_group: 'Domain',
            target: 'Milestone',
        };

        expect(getStructureLabels(pack)).toEqual({
            primary_group: 'Level',
            secondary_group: 'Domain',
            target: 'Milestone',
        });
    });

    it('fills missing label fields with defaults', () => {
        const pack = makeFlatPack();
        pack.structure_labels = {
            primary_group: '',
            target: 'Item',
        };

        expect(getStructureLabels(pack)).toEqual({
            primary_group: 'Domain',
            target: 'Item',
        });
    });
});

describe('resolveTargetScoring', () => {
    it('preserves Alpha inline scoring for flat packs without scale_id', () => {
        const pack = makeFlatPack();
        const target = pack.domains[0].targets[0];
        const original = structuredClone(target.scoring);

        const resolved = resolveTargetScoring(target, pack);

        expect(resolved.type).toBe('numeric');
        expect(resolved.scale).toEqual([0, 1, 2, 3, 4]);
        expect(resolved.scale_labels).toEqual({});
        expect(resolved.no_opportunity_allowed).toBe(false);
        expect(resolved.resolved_from_scale_id).toBeUndefined();
        expect(target.scoring).toEqual(original);
    });

    it('merges referenced scoring scale as defaults', () => {
        const pack = makeFlatPack([
            makeTarget({
                target_id: 'T1',
                scoring: {
                    type: 'numeric',
                    scale_id: 'scale-0-2',
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
            }),
        ]);
        pack.scoring_scales = [
            {
                scale_id: 'scale-0-2',
                title: '0–2',
                type: 'numeric',
                scale: [0, 1, 2],
                scale_labels: {
                    0: 'Not yet',
                    1: 'Emerging',
                    2: 'Mastered',
                },
                no_opportunity_allowed: true,
            },
        ];

        const resolved = resolveTargetScoring(pack.domains[0].targets[0], pack);

        expect(resolved.resolved_from_scale_id).toBe('scale-0-2');
        expect(resolved.scale).toEqual([0, 1, 2]);
        expect(resolved.scale_labels).toEqual({
            0: 'Not yet',
            1: 'Emerging',
            2: 'Mastered',
        });
        expect(resolved.no_opportunity_allowed).toBe(false);
    });

    it('lets target inline fields override referenced scale', () => {
        const pack = makeFlatPack([
            makeTarget({
                target_id: 'T1',
                scoring: {
                    type: 'numeric',
                    scale_id: 'scale-0-4',
                    scale: [0, 1, 2],
                    scale_labels: { 0: 'Custom zero', 1: 'Custom one', 2: 'Custom two' },
                    no_opportunity_allowed: true,
                },
            }),
        ]);
        pack.scoring_scales = [
            {
                scale_id: 'scale-0-4',
                title: '0–4',
                type: 'numeric',
                scale: [0, 1, 2, 3, 4],
                scale_labels: {
                    0: 'Not yet',
                    1: 'Emerging',
                    4: 'Mastered',
                },
                no_opportunity_allowed: false,
            },
        ];

        const resolved = resolveTargetScoring(pack.domains[0].targets[0], pack);

        expect(resolved.scale).toEqual([0, 1, 2]);
        expect(resolved.scale_labels).toEqual({
            0: 'Custom zero',
            1: 'Custom one',
            2: 'Custom two',
        });
        expect(resolved.no_opportunity_allowed).toBe(true);
    });

    it('falls back safely when scale_id is unknown', () => {
        const pack = makeFlatPack([
            makeTarget({
                target_id: 'T1',
                scoring: {
                    type: 'yesno',
                    scale_id: 'missing-scale',
                    scale_labels: { 0: 'No', 1: 'Yes' },
                    no_opportunity_allowed: false,
                },
            }),
        ]);
        pack.scoring_scales = [
            {
                scale_id: 'other-scale',
                title: 'Other',
                type: 'numeric',
                scale: [0, 1, 2, 3, 4],
            },
        ];

        const resolved = resolveTargetScoring(pack.domains[0].targets[0], pack);

        expect(resolved.resolved_from_scale_id).toBeUndefined();
        expect(resolved.type).toBe('yesno');
        expect(resolved.scale).toBeUndefined();
        expect(resolved.scale_labels).toEqual({ 0: 'No', 1: 'Yes' });
    });

    it('preserves scale_labels from the referenced scale when target labels are empty', () => {
        const pack = makeFlatPack([
            makeTarget({
                target_id: 'T1',
                scoring: {
                    type: 'numeric',
                    scale_id: 'labeled',
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
            }),
        ]);
        pack.scoring_scales = [
            {
                scale_id: 'labeled',
                title: 'Labeled',
                type: 'numeric',
                scale: [0, 1],
                scale_labels: { 0: 'Absent', 1: 'Present' },
            },
        ];

        const resolved = resolveTargetScoring(pack.domains[0].targets[0], pack);

        expect(resolved.scale_labels).toEqual({ 0: 'Absent', 1: 'Present' });
    });

    it('does not mutate pack or target', () => {
        const pack = makeFlatPack([
            makeTarget({
                target_id: 'T1',
                scoring: {
                    type: 'numeric',
                    scale_id: 'scale-0-2',
                    scale: [0, 1, 2],
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
            }),
        ]);
        pack.scoring_scales = [
            {
                scale_id: 'scale-0-2',
                title: '0–2',
                type: 'numeric',
                scale: [0, 1, 2],
                scale_labels: { 0: 'A', 1: 'B', 2: 'C' },
            },
        ];

        const packBefore = structuredClone(pack);
        const targetBefore = structuredClone(pack.domains[0].targets[0]);
        const resolved = resolveTargetScoring(pack.domains[0].targets[0], pack);

        resolved.scale![0] = 99;
        resolved.scale_labels[0] = 'mutated';

        expect(pack).toEqual(packBefore);
        expect(pack.domains[0].targets[0]).toEqual(targetBefore);
    });
});

describe('groupTargetsForDisplay', () => {
    it('returns one section for flat domains', () => {
        const domain: Domain = {
            domain_id: 'DOM_1',
            title: 'Domain 1',
            targets: [
                makeTarget({ target_id: 'T1' }),
                makeTarget({ target_id: 'T2' }),
                makeTarget({ target_id: 'T3' }),
            ],
        };

        const sections = groupTargetsForDisplay(domain);

        expect(sections).toHaveLength(1);
        expect(sections[0].secondary_group_id).toBeUndefined();
        expect(sections[0].title).toBe('Domain 1');
        expect(sections[0].targets.map((target) => target.target_id)).toEqual([
            'T1',
            'T2',
            'T3',
        ]);
    });

    it('uses catalog order and titles for secondary groups', () => {
        const domain: Domain = {
            domain_id: 'DOM_1',
            title: 'Level 1',
            secondary_groups: [
                { secondary_group_id: 'sg-b', title: 'Group B' },
                { secondary_group_id: 'sg-a', title: 'Group A' },
            ],
            targets: [
                makeTarget({ target_id: 'T1', secondary_group_id: 'sg-a' }),
                makeTarget({ target_id: 'T2', secondary_group_id: 'sg-b' }),
                makeTarget({ target_id: 'T3', secondary_group_id: 'sg-a' }),
            ],
        };

        const sections = groupTargetsForDisplay(domain);

        expect(sections.map((section) => section.secondary_group_id)).toEqual([
            'sg-b',
            'sg-a',
        ]);
        expect(sections.map((section) => section.title)).toEqual(['Group B', 'Group A']);
        expect(sections[0].targets.map((target) => target.target_id)).toEqual(['T2']);
        expect(sections[1].targets.map((target) => target.target_id)).toEqual(['T1', 'T3']);
    });

    it('uses first-seen order when catalog is absent', () => {
        const domain: Domain = {
            domain_id: 'DOM_1',
            title: 'Level 1',
            targets: [
                makeTarget({ target_id: 'T1', secondary_group_id: 'sg-z' }),
                makeTarget({ target_id: 'T2', secondary_group_id: 'sg-a' }),
                makeTarget({ target_id: 'T3', secondary_group_id: 'sg-z' }),
            ],
        };

        const sections = groupTargetsForDisplay(domain);

        expect(sections.map((section) => section.secondary_group_id)).toEqual([
            'sg-z',
            'sg-a',
        ]);
        expect(sections.map((section) => section.title)).toEqual(['sg-z', 'sg-a']);
        expect(sections[0].targets.map((target) => target.target_id)).toEqual(['T1', 'T3']);
        expect(sections[1].targets.map((target) => target.target_id)).toEqual(['T2']);
    });

    it('preserves orphan secondary_group_id sections after catalog entries', () => {
        const domain: Domain = {
            domain_id: 'DOM_1',
            title: 'Level 1',
            secondary_groups: [{ secondary_group_id: 'sg-known', title: 'Known' }],
            targets: [
                makeTarget({ target_id: 'T1', secondary_group_id: 'sg-orphan' }),
                makeTarget({ target_id: 'T2', secondary_group_id: 'sg-known' }),
                makeTarget({ target_id: 'T3', secondary_group_id: 'sg-orphan' }),
            ],
        };

        const sections = groupTargetsForDisplay(domain);

        expect(sections.map((section) => section.secondary_group_id)).toEqual([
            'sg-known',
            'sg-orphan',
        ]);
        expect(sections[1].title).toBe('sg-orphan');
        expect(sections[1].targets.map((target) => target.target_id)).toEqual(['T1', 'T3']);
    });

    it('preserves ungrouped targets after grouped sections', () => {
        const domain: Domain = {
            domain_id: 'DOM_1',
            title: 'Level 1',
            secondary_groups: [{ secondary_group_id: 'sg-a', title: 'Group A' }],
            targets: [
                makeTarget({ target_id: 'T1', secondary_group_id: 'sg-a' }),
                makeTarget({ target_id: 'T2' }),
                makeTarget({ target_id: 'T3', secondary_group_id: 'sg-a' }),
                makeTarget({ target_id: 'T4' }),
            ],
        };

        const sections = groupTargetsForDisplay(domain);

        expect(sections).toHaveLength(2);
        expect(sections[0].targets.map((target) => target.target_id)).toEqual(['T1', 'T3']);
        expect(sections[1].secondary_group_id).toBeUndefined();
        expect(sections[1].title).toBe('Ungrouped');
        expect(sections[1].targets.map((target) => target.target_id)).toEqual(['T2', 'T4']);
    });

    it('keeps target order stable within each section', () => {
        const domain: Domain = {
            domain_id: 'DOM_1',
            title: 'Level 1',
            targets: [
                makeTarget({ target_id: 'T1', secondary_group_id: 'sg-a' }),
                makeTarget({ target_id: 'T2', secondary_group_id: 'sg-a' }),
                makeTarget({ target_id: 'T3', secondary_group_id: 'sg-a' }),
            ],
        };

        const sections = groupTargetsForDisplay(domain);

        expect(sections[0].targets.map((target) => target.target_id)).toEqual([
            'T1',
            'T2',
            'T3',
        ]);
    });

    it('does not mutate domain targets', () => {
        const domain: Domain = {
            domain_id: 'DOM_1',
            title: 'Domain 1',
            targets: [
                makeTarget({ target_id: 'T1', secondary_group_id: 'sg-a' }),
                makeTarget({ target_id: 'T2' }),
            ],
        };
        const before = structuredClone(domain);

        const sections = groupTargetsForDisplay(domain);
        sections[0].targets.pop();

        expect(domain).toEqual(before);
    });
});

describe('getOversizedGroupWarning', () => {
    it('returns null below the large threshold', () => {
        expect(getOversizedGroupWarning(OVERSIZED_GROUP_LARGE_THRESHOLD - 1)).toBeNull();
        expect(getOversizedGroupWarning(0)).toBeNull();
    });

    it('returns large at the large threshold boundary', () => {
        const warning = getOversizedGroupWarning(OVERSIZED_GROUP_LARGE_THRESHOLD);

        expect(warning).toMatchObject({
            level: 'large',
            targetCount: OVERSIZED_GROUP_LARGE_THRESHOLD,
            threshold: OVERSIZED_GROUP_LARGE_THRESHOLD,
        });
    });

    it('returns large just below the extreme threshold', () => {
        const warning = getOversizedGroupWarning(OVERSIZED_GROUP_EXTREME_THRESHOLD - 1);

        expect(warning?.level).toBe('large');
    });

    it('returns extreme at the extreme threshold boundary', () => {
        const warning = getOversizedGroupWarning(OVERSIZED_GROUP_EXTREME_THRESHOLD);

        expect(warning).toMatchObject({
            level: 'extreme',
            targetCount: OVERSIZED_GROUP_EXTREME_THRESHOLD,
            threshold: OVERSIZED_GROUP_EXTREME_THRESHOLD,
        });
    });
});
