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
            text: 'Mastered',
            title: '2 — Mastered',
        });
        expect(
            formatMatrixScoreButtonLabel(1, { 1: 'Emerging competency observed' })
        ).toEqual({
            text: '1',
            title: '1 — Emerging competency observed',
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
});
