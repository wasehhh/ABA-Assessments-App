import { describe, expect, it } from 'vitest';
import { ContentPackData, Domain, Target } from '../types';
import { DEFAULT_STRUCTURE_LABELS, getStructureLabels, resolveTargetScoring } from './assessmentPackStructure';
import {
    filterMatrixDisplaySections,
    findMatrixSecondaryGroupTitle,
    flattenMatrixDisplayTargets,
    formatMatrixScoreButtonLabel,
    getMatrixDisplaySections,
    getResolvedScaleValues,
} from './matrixDisplayHelpers';

function makeTarget(overrides: Partial<Target> & Pick<Target, 'target_id'>): Target {
    return {
        title: overrides.target_id,
        success_criteria: 'Criteria',
        materials: 'Materials',
        scoring: {
            type: 'numeric',
            scale: [0, 1, 2, 3, 4],
            scale_labels: {},
            no_opportunity_allowed: true,
        },
        ...overrides,
    };
}

function makeFlatDomain(): Domain {
    return {
        domain_id: 'A',
        title: 'Domain A',
        targets: [
            makeTarget({ target_id: 'T1' }),
            makeTarget({ target_id: 'T2' }),
        ],
    };
}

function makeGroupedDomain(): Domain {
    return {
        domain_id: 'L1',
        title: 'Level 1',
        secondary_groups: [
            { secondary_group_id: 'sg_listen', title: 'Listening' },
            { secondary_group_id: 'sg_motor', title: 'Motor' },
        ],
        targets: [
            makeTarget({ target_id: 'T1', secondary_group_id: 'sg_listen' }),
            makeTarget({ target_id: 'T2', secondary_group_id: 'sg_motor' }),
            makeTarget({ target_id: 'T3' }),
        ],
    };
}

describe('matrixDisplayHelpers', () => {
    it('returns a single flat section for Alpha packs without secondary grouping', () => {
        const domain = makeFlatDomain();
        const sections = getMatrixDisplaySections(domain);

        expect(sections).toHaveLength(1);
        expect(sections[0].secondary_group_id).toBeUndefined();
        expect(sections[0].targets.map((target) => target.target_id)).toEqual(['T1', 'T2']);
    });

    it('renders secondary group sections from groupTargetsForDisplay', () => {
        const sections = getMatrixDisplaySections(makeGroupedDomain());

        expect(sections.map((section) => section.title)).toEqual([
            'Listening',
            'Motor',
            'Ungrouped',
        ]);
        expect(sections[0].targets.map((target) => target.target_id)).toEqual(['T1']);
        expect(sections[2].targets.map((target) => target.target_id)).toEqual(['T3']);
    });

    it('preserves ungrouped targets and stable flatten order', () => {
        const flat = flattenMatrixDisplayTargets(makeGroupedDomain());

        expect(flat.map((target) => target.target_id)).toEqual(['T1', 'T2', 'T3']);
    });

    it('filters sections without mutating domain.targets', () => {
        const domain = makeGroupedDomain();
        const before = JSON.stringify(domain.targets);

        filterMatrixDisplaySections(getMatrixDisplaySections(domain), (target) =>
            target.target_id.startsWith('T1')
        );

        expect(JSON.stringify(domain.targets)).toBe(before);
    });

    it('finds secondary group context for a target id', () => {
        expect(findMatrixSecondaryGroupTitle(makeGroupedDomain(), 'T1')).toBe('Listening');
        expect(findMatrixSecondaryGroupTitle(makeGroupedDomain(), 'T3')).toBe('Ungrouped');
    });

    it('defaults structure labels to Domain and Target', () => {
        const pack: ContentPackData = {
            pack_id: 'pack-1',
            org_id: 'org-1',
            title: 'Flat Pack',
            description: '',
            version: '1.0',
            domains: [makeFlatDomain()],
        };

        expect(getStructureLabels(pack)).toEqual(DEFAULT_STRUCTURE_LABELS);
    });

    it('uses custom structure labels such as Level / Domain / Milestone', () => {
        const pack: ContentPackData = {
            pack_id: 'pack-1',
            org_id: 'org-1',
            title: 'VB Pack',
            description: '',
            version: '1.0',
            structure_labels: {
                primary_group: 'Level',
                secondary_group: 'Domain',
                target: 'Milestone',
            },
            domains: [makeGroupedDomain()],
        };

        expect(getStructureLabels(pack)).toEqual({
            primary_group: 'Level',
            secondary_group: 'Domain',
            target: 'Milestone',
        });
    });

    it('formats scale_labels for score buttons while preserving numeric title', () => {
        expect(formatMatrixScoreButtonLabel(2, { 2: 'Mastered' })).toEqual({
            text: '2',
            title: '2 — Mastered',
        });
        expect(
            formatMatrixScoreButtonLabel(1, { 1: 'Emerging competency observed' })
        ).toEqual({
            text: '1',
            title: '1 — Emerging competency observed',
        });
        expect(formatMatrixScoreButtonLabel(3, { 3: '4+ parts' })).toEqual({
            text: '3',
            title: '3 — 4+ parts',
        });
        expect(formatMatrixScoreButtonLabel(3, { 3: '1 minute' })).toEqual({
            text: '3',
            title: '3 — 1 minute',
        });
        expect(formatMatrixScoreButtonLabel(4, undefined)).toEqual({
            text: '4',
            title: '4',
        });
        expect(formatMatrixScoreButtonLabel(0, { 0: '  ' })).toEqual({
            text: '0',
            title: '0',
        });
    });

    it('uses resolved scoring scale values safely', () => {
        const pack: ContentPackData = {
            pack_id: 'pack-1',
            org_id: 'org-1',
            title: 'Pack',
            description: '',
            version: '1.0',
            domains: [],
        };
        const target = makeTarget({
            target_id: 'C1',
            scoring: {
                type: 'checkbox',
                task_steps: ['Step 1', 'Step 2', 'Step 3'],
                scale_labels: {},
                no_opportunity_allowed: true,
            },
        });

        const resolved = resolveTargetScoring(target, pack);
        expect(getResolvedScaleValues(resolved)).toEqual([0, 1, 2, 3]);
        expect(resolved.scale_labels).toEqual({});
    });

    it('preserves decimal and negative resolved scale values for Matrix buttons', () => {
        expect(
            getResolvedScaleValues({
                type: 'numeric',
                scale: [0, 0.25, 0.5, 0.75, 1],
                scale_labels: {},
                no_opportunity_allowed: true,
            })
        ).toEqual([0, 0.25, 0.5, 0.75, 1]);

        expect(
            getResolvedScaleValues({
                type: 'numeric',
                scale: [-1, 0, 1],
                scale_labels: {},
                no_opportunity_allowed: true,
            })
        ).toEqual([-1, 0, 1]);

        expect(formatMatrixScoreButtonLabel(0.5, { 0.5: 'Partial' })).toEqual({
            text: '0.5',
            title: '0.5 — Partial',
        });
    });

    it('never mixes numerals and words across one numeric scale', () => {
        const labels = {
            0: 'Does not complete the design',
            1: 'Completes with full model',
            2: 'Completes with picture',
            3: '4+ parts',
            4: 'Independent',
        };

        for (const value of [0, 1, 2, 3, 4] as const) {
            const formatted = formatMatrixScoreButtonLabel(value, labels);
            expect(formatted.text).toBe(String(value));
            expect(formatted.title).toBe(`${value} — ${labels[value]}`);
        }
    });
});
