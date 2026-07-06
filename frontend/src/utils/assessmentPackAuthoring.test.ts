import { describe, expect, it } from 'vitest';
import { ContentPackData, Target } from '../types';
import {
    applySecondaryGroupingDisabled,
    applySecondaryGroupingEnabled,
    buildPackStructureLabels,
    collectPackOversizedWarnings,
    materializePackForSave,
    prepareBuilderPackForSave,
    stripPackScoringScaleReferences,
    OVERSIZED_GROUP_EXTREME_THRESHOLD,
    OVERSIZED_GROUP_LARGE_THRESHOLD,
    OVERSIZED_WARNING_ADVICE,
    parseNumericScaleCsv,
    parseScaleLabelsCsv,
} from './assessmentPackAuthoring';
import { getStructureLabels, groupTargetsForDisplay } from './assessmentPackStructure';

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
            ...(scoringOverrides ?? { scale: [0, 1, 2, 3, 4] }),
        },
    };
}

function makeFlatPack(): ContentPackData {
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
                targets: [
                    makeTarget({
                        target_id: 'T1',
                        scoring: {
                            type: 'numeric',
                            scale: [0, 1, 2, 3, 4],
                            scale_labels: {},
                            no_opportunity_allowed: false,
                        },
                    }),
                ],
            },
        ],
    };
}

describe('assessmentPackAuthoring', () => {
    it('parses numeric and label CSV fragments', () => {
        expect(parseNumericScaleCsv('0,1,2')).toEqual([0, 1, 2]);
        expect(parseScaleLabelsCsv('0:Not Yet|1:Emerging|2:Mastered')).toEqual({
            0: 'Not Yet',
            1: 'Emerging',
            2: 'Mastered',
        });
    });

    it('saves flat pack unchanged aside from materialized inline scoring', () => {
        const pack = makeFlatPack();
        const saved = materializePackForSave(pack);

        expect(saved.structure_labels).toBeUndefined();
        expect(saved.scoring_scales).toBeUndefined();
        expect(saved.domains[0].targets[0].scoring.scale).toEqual([0, 1, 2, 3, 4]);
        expect(saved.domains[0].targets[0].scoring.scale_id).toBeUndefined();
        expect(getStructureLabels(saved)).toEqual({
            primary_group: 'Domain',
            target: 'Target',
        });
    });

    it('enables structure labels when authors customize names', () => {
        const labels = buildPackStructureLabels('Level', 'Milestone', '', false);
        expect(labels).toEqual({
            primary_group: 'Level',
            target: 'Milestone',
        });
    });

    it('uses Secondary Group as the default secondary label when grouping is enabled', () => {
        const labels = buildPackStructureLabels('Primary Group', 'Target', '', true);
        expect(labels).toEqual({
            primary_group: 'Primary Group',
            secondary_group: 'Secondary Group',
            target: 'Target',
        });
    });

    it('enabling secondary grouping from Alpha defaults produces neutral three-level labels', () => {
        expect(
            applySecondaryGroupingEnabled({
                primaryGroup: 'Domain',
                secondaryGroup: '',
                target: 'Target',
            })
        ).toEqual({
            primaryGroup: 'Primary Group',
            secondaryGroup: 'Secondary Group',
            target: 'Target',
        });
    });

    it('enabling secondary grouping does not overwrite customized labels', () => {
        expect(
            applySecondaryGroupingEnabled({
                primaryGroup: 'Level',
                secondaryGroup: '',
                target: 'Target',
            })
        ).toEqual({
            primaryGroup: 'Level',
            secondaryGroup: 'Secondary Group',
            target: 'Target',
        });
    });

    it('disabling secondary grouping from neutral defaults reverts to Domain and Target', () => {
        expect(
            applySecondaryGroupingDisabled({
                primaryGroup: 'Primary Group',
                secondaryGroup: 'Secondary Group',
                target: 'Target',
            })
        ).toEqual({
            primaryGroup: 'Domain',
            secondaryGroup: '',
            target: 'Target',
        });
    });

    it('disabling secondary grouping does not overwrite a customized primary label', () => {
        expect(
            applySecondaryGroupingDisabled({
                primaryGroup: 'Module',
                secondaryGroup: 'Secondary Group',
                target: 'Target',
            })
        ).toEqual({
            primaryGroup: 'Module',
            secondaryGroup: '',
            target: 'Target',
        });
    });

    it('prepareBuilderPackForSave omits scoring_scales and strips scale_id references', () => {
        const pack = makeFlatPack();
        pack.scoring_scales = [
            {
                scale_id: 'scale-0-2',
                title: '0–2',
                type: 'numeric',
                scale: [0, 1, 2],
                scale_labels: { 0: 'Not yet', 1: 'Emerging', 2: 'Mastered' },
                no_opportunity_allowed: false,
            },
        ];
        pack.domains[0].targets[0].scoring = {
            type: 'numeric',
            scale_id: 'scale-0-2',
            scale: [0, 1, 2, 3, 4],
            scale_labels: {},
            no_opportunity_allowed: false,
        };

        const saved = prepareBuilderPackForSave(pack);

        expect(saved.scoring_scales).toBeUndefined();
        expect(saved.domains[0].targets[0].scoring.scale_id).toBeUndefined();
        expect(saved.domains[0].targets[0].scoring.scale).toEqual([0, 1, 2, 3, 4]);
    });

    it('stripPackScoringScaleReferences preserves inline per-target scoring', () => {
        const pack = makeFlatPack();
        pack.domains[0].targets[0].scoring = {
            type: 'numeric',
            scale: [0, 1, 2],
            scale_labels: { 0: 'Not Yet', 2: 'Mastered' },
            no_opportunity_allowed: true,
        };

        const stripped = stripPackScoringScaleReferences(pack);

        expect(stripped.scoring_scales).toBeUndefined();
        expect(stripped.domains[0].targets[0].scoring).toEqual({
            type: 'numeric',
            scale: [0, 1, 2],
            scale_labels: { 0: 'Not Yet', 2: 'Mastered' },
            no_opportunity_allowed: true,
        });
    });

    it('materializes referenced scale and preserves scale_id', () => {
        const pack = makeFlatPack();
        pack.scoring_scales = [
            {
                scale_id: 'scale-0-2',
                title: '0–2',
                type: 'numeric',
                scale: [0, 1, 2],
                scale_labels: { 0: 'Not yet', 1: 'Emerging', 2: 'Mastered' },
                no_opportunity_allowed: false,
            },
        ];
        pack.domains[0].targets[0].scoring = {
            type: 'numeric',
            scale_id: 'scale-0-2',
            scale_labels: {},
            no_opportunity_allowed: false,
        };

        const saved = materializePackForSave(pack);
        const scoring = saved.domains[0].targets[0].scoring;

        expect(scoring.scale_id).toBe('scale-0-2');
        expect(scoring.scale).toEqual([0, 1, 2]);
        expect(scoring.scale_labels).toEqual({
            0: 'Not yet',
            1: 'Emerging',
            2: 'Mastered',
        });
    });

    it('lets target inline override win over referenced scale', () => {
        const pack = makeFlatPack();
        pack.scoring_scales = [
            {
                scale_id: 'scale-0-4',
                title: '0–4',
                type: 'numeric',
                scale: [0, 1, 2, 3, 4],
                scale_labels: { 0: 'Pack zero' },
                no_opportunity_allowed: false,
            },
        ];
        pack.domains[0].targets[0].scoring = {
            type: 'numeric',
            scale_id: 'scale-0-4',
            scale: [0, 1, 2],
            scale_labels: { 0: 'Target zero', 1: 'Target one', 2: 'Target two' },
            no_opportunity_allowed: true,
        };

        const saved = materializePackForSave(pack);
        expect(saved.domains[0].targets[0].scoring.scale).toEqual([0, 1, 2]);
        expect(saved.domains[0].targets[0].scoring.scale_labels[0]).toBe('Target zero');
        expect(saved.domains[0].targets[0].scoring.no_opportunity_allowed).toBe(true);
    });

    it('strips secondary grouping when disabled at save', () => {
        const pack = makeFlatPack();
        pack.structure_labels = {
            primary_group: 'Domain',
            target: 'Target',
        };
        pack.domains[0].secondary_groups = [
            { secondary_group_id: 'sg-a', title: 'Group A' },
        ];
        pack.domains[0].targets[0].secondary_group_id = 'sg-a';

        const saved = materializePackForSave(pack);

        expect(saved.domains[0].secondary_groups).toBeUndefined();
        expect(saved.domains[0].targets[0].secondary_group_id).toBeUndefined();
    });

    it('preserves secondary grouping when enabled', () => {
        const pack = makeFlatPack();
        pack.structure_labels = {
            primary_group: 'Level',
            secondary_group: 'Domain',
            target: 'Milestone',
        };
        pack.domains[0].secondary_groups = [
            { secondary_group_id: 'sg-a', title: 'Group A' },
        ];
        pack.domains[0].targets[0].secondary_group_id = 'sg-a';

        const saved = materializePackForSave(pack);
        const sections = groupTargetsForDisplay(saved.domains[0]);

        expect(saved.domains[0].secondary_groups).toHaveLength(1);
        expect(saved.domains[0].targets[0].secondary_group_id).toBe('sg-a');
        expect(sections[0].targets).toHaveLength(1);
    });

    it('returns oversized warnings at threshold boundaries', () => {
        const targets = Array.from({ length: OVERSIZED_GROUP_LARGE_THRESHOLD }, (_, index) =>
            makeTarget({ target_id: `T${index + 1}` })
        );
        const pack: ContentPackData = {
            ...makeFlatPack(),
            domains: [{ domain_id: 'DOM_1', title: 'Big Domain', targets }],
        };

        const largeWarnings = collectPackOversizedWarnings(pack);
        expect(largeWarnings).toHaveLength(1);
        expect(largeWarnings[0].level).toBe('large');
        expect(largeWarnings[0].message).toBe(OVERSIZED_WARNING_ADVICE);

        const extremeTargets = Array.from(
            { length: OVERSIZED_GROUP_EXTREME_THRESHOLD },
            (_, index) => makeTarget({ target_id: `X${index + 1}` })
        );
        const extremePack: ContentPackData = {
            ...makeFlatPack(),
            domains: [{ domain_id: 'DOM_2', title: 'Huge Domain', targets: extremeTargets }],
        };
        const extremeWarnings = collectPackOversizedWarnings(extremePack);
        expect(extremeWarnings[0].level).toBe('extreme');
    });

    it('returns secondary-tier oversized warnings for large secondary groups', () => {
        const targets = Array.from({ length: OVERSIZED_GROUP_LARGE_THRESHOLD }, (_, index) =>
            makeTarget({
                target_id: `T${index + 1}`,
                secondary_group_id: 'sg-big',
            })
        );
        const pack: ContentPackData = {
            ...makeFlatPack(),
            structure_labels: {
                primary_group: 'Level',
                secondary_group: 'Domain',
                target: 'Milestone',
            },
            domains: [
                {
                    domain_id: 'DOM_1',
                    title: 'Level 1',
                    secondary_groups: [{ secondary_group_id: 'sg-big', title: 'Big Domain' }],
                    targets,
                },
            ],
        };

        const warnings = collectPackOversizedWarnings(pack);
        const secondaryWarnings = warnings.filter((warning) => warning.tier === 'secondary');

        expect(secondaryWarnings).toHaveLength(1);
        expect(secondaryWarnings[0].level).toBe('large');
        expect(secondaryWarnings[0].secondaryGroupId).toBe('sg-big');
        expect(secondaryWarnings[0].secondaryGroupTitle).toBe('Big Domain');
    });
});
