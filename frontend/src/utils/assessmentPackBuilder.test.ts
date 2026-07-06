import { describe, expect, it } from 'vitest';
import { Domain } from '../types';
import {
    appendTargetToDomain,
    createBuilderTarget,
    getTargetsForSecondaryGroup,
    getUngroupedTargetEntries,
    moveTargetSecondaryGroup,
} from './assessmentPackBuilder';
import { groupTargetsForDisplay } from './assessmentPackStructure';
import { materializePackForSave } from './assessmentPackAuthoring';

function makeGroupedDomain(): Domain {
    return {
        domain_id: 'L1',
        title: 'Level 1',
        secondary_groups: [
            { secondary_group_id: 'sg_listen', title: 'Listening' },
            { secondary_group_id: 'sg_motor', title: 'Motor' },
        ],
        targets: [
            {
                target_id: 'T1',
                title: 'Target 1',
                success_criteria: 'Criteria',
                materials: 'Materials',
                scoring: {
                    type: 'numeric',
                    scale: [0, 1, 2, 3, 4],
                    scale_labels: {},
                    no_opportunity_allowed: true,
                },
                secondary_group_id: 'sg_listen',
            },
        ],
    };
}

describe('assessmentPackBuilder', () => {
    it('adding a target under a secondary group automatically assigns secondary_group_id', () => {
        const domain = makeGroupedDomain();
        const next = appendTargetToDomain(domain, [0, 1, 2, 3, 4], 'sg_motor');

        expect(next.targets).toHaveLength(2);
        expect(next.targets[1].secondary_group_id).toBe('sg_motor');
        expect(next.targets[0].secondary_group_id).toBe('sg_listen');
    });

    it('createBuilderTarget does not mutate the source domain', () => {
        const domain = makeGroupedDomain();
        const before = JSON.stringify(domain);

        createBuilderTarget(domain, [0, 1, 2, 3, 4], 'sg_motor');

        expect(JSON.stringify(domain)).toBe(before);
    });

    it('grouping helpers do not mutate domain.targets', () => {
        const domain = makeGroupedDomain();
        const before = JSON.stringify(domain.targets);

        getTargetsForSecondaryGroup(domain, 'sg_listen');
        getUngroupedTargetEntries(domain);
        groupTargetsForDisplay(domain);

        expect(JSON.stringify(domain.targets)).toBe(before);
    });

    it('moving a target between groups updates only secondary_group_id', () => {
        const domain = makeGroupedDomain();
        const moved = moveTargetSecondaryGroup(domain, 0, 'sg_motor');

        expect(moved.targets[0].secondary_group_id).toBe('sg_motor');
        expect(moved.targets[0].target_id).toBe('T1');
        expect(moved.targets[0].title).toBe('Target 1');
        expect(moved.secondary_groups).toEqual(domain.secondary_groups);
    });

    it('moving a target to ungrouped removes secondary_group_id', () => {
        const domain = makeGroupedDomain();
        const moved = moveTargetSecondaryGroup(domain, 0, undefined);

        expect(moved.targets[0].secondary_group_id).toBeUndefined();
    });

    it('saving still produces flat domain.targets with secondary_group_id', () => {
        const domain = appendTargetToDomain(makeGroupedDomain(), [0, 1, 2, 3, 4], 'sg_motor');
        const saved = materializePackForSave({
            pack_id: 'pack-1',
            org_id: 'org-1',
            title: 'Grouped Pack',
            description: '',
            version: '1.0',
            structure_labels: {
                primary_group: 'Level',
                secondary_group: 'Domain',
                target: 'Milestone',
            },
            domains: [domain],
        });

        expect(Array.isArray(saved.domains[0].targets)).toBe(true);
        expect(saved.domains[0].targets[0]).not.toHaveProperty('targets');
        expect(saved.domains[0].targets[1].secondary_group_id).toBe('sg_motor');
        expect(saved.domains[0].secondary_groups).toHaveLength(2);
    });

    it('flat domain append without secondary group leaves targets ungrouped', () => {
        const flat: Domain = {
            domain_id: 'A',
            title: 'Domain A',
            targets: [],
        };
        const next = appendTargetToDomain(flat, [0, 1, 2, 3, 4]);

        expect(next.targets[0].secondary_group_id).toBeUndefined();
        expect(groupTargetsForDisplay(next)[0].targets).toHaveLength(1);
    });
});
