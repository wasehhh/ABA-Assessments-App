import { describe, expect, it } from 'vitest';
import { ContentPackData, Domain, Target } from '../types';
import {
    buildReadSurfaceTargetSections,
    buildSecondaryGroupHeaderCells,
    getPackDomainTargetOrder,
    getPackStructureLabels,
    hasReadSurfaceSecondarySections,
} from './readSurfaceDisplay';

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

describe('readSurfaceDisplay', () => {
    it('returns default structure labels for flat packs', () => {
        const pack: ContentPackData = {
            pack_id: 'pack-1',
            org_id: 'org-1',
            title: 'Flat Pack',
            description: '',
            version: '1.0',
            domains: [{ domain_id: 'A', title: 'Domain A', targets: [makeTarget({ target_id: 'T1' })] }],
        };

        expect(getPackStructureLabels(pack)).toEqual({
            primary_group: 'Domain',
            target: 'Target',
        });
    });

    it('uses custom structure labels from the pack', () => {
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

        expect(getPackStructureLabels(pack)).toEqual({
            primary_group: 'Level',
            secondary_group: 'Domain',
            target: 'Milestone',
        });
    });

    it('keeps flat pack target order unchanged', () => {
        const domain: Domain = {
            domain_id: 'A',
            title: 'Domain A',
            targets: [makeTarget({ target_id: 'T1' }), makeTarget({ target_id: 'T2' })],
        };

        expect(getPackDomainTargetOrder(domain).map((target) => target.target_id)).toEqual([
            'T1',
            'T2',
        ]);
        expect(hasReadSurfaceSecondarySections(undefined)).toBe(false);
    });

    it('builds grouped display sections and preserves ungrouped targets', () => {
        const domain = makeGroupedDomain();
        const rows = domain.targets.map((target) => ({
            targetId: target.target_id,
            title: target.title,
        }));
        const byId = new Map(rows.map((row) => [row.targetId, row]));

        const sections = buildReadSurfaceTargetSections(domain, byId);

        expect(sections?.map((section) => section.title)).toEqual([
            'Listening',
            'Motor',
            'Ungrouped',
        ]);
        expect(sections?.[2].targets.map((row) => row.targetId)).toEqual(['T3']);
    });

    it('builds secondary group header cells aligned to visible target order', () => {
        const domain = makeGroupedDomain();
        const rows = getPackDomainTargetOrder(domain).map((target) => ({
            targetId: target.target_id,
            title: target.title,
        }));
        const sections = buildReadSurfaceTargetSections(
            domain,
            new Map(rows.map((row) => [row.targetId, row]))
        )!;

        expect(buildSecondaryGroupHeaderCells(sections, rows)).toEqual([
            { title: 'Listening', colSpan: 1 },
            { title: 'Motor', colSpan: 1 },
            { title: 'Ungrouped', colSpan: 1 },
        ]);
    });
});
