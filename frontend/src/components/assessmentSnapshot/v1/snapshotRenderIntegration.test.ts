import { describe, expect, it } from 'vitest';
import { ContentPackData, Target } from '../../../types';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { buildLearnerMapProfile } from '../../../services/learnerMapProfile';
import {
    buildSnapshotRenderPlan,
    findDomainZonePlan,
    findPrimaryChapter,
    flattenRenderPlanZoneTitles,
} from '../../../utils/snapshotLayoutEngine';
import {
    buildTargetByIdMap,
    zoneTargetCount,
} from './snapshotRenderHelpers';
import { resolveThreadsLayoutFromPlan } from './threadsLayout';

const generatedAt = new Date('2026-07-06T12:00:00.000Z');
const cycle1 = { id: 'c1', cycle_number: 1, status: 'closed' as const };
const cycle2 = { id: 'c2', cycle_number: 2, status: 'closed' as const };

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

function makeProfile(pack: ContentPackData) {
    return buildAssessmentSnapshotProfile(
        buildLearnerMapProfile({
            assessment: { id: 'assess-1', pack_snapshot: pack },
            cycles: [
                { cycle: cycle1, scores: [] },
                { cycle: cycle2, scores: [] },
            ],
            generatedAt,
        })
    );
}

function makeTargetList(prefix: string, count: number): Target[] {
    return Array.from({ length: count }, (_, index) =>
        makeTarget({ target_id: `${prefix}${index + 1}`, title: `${prefix} ${index + 1}` })
    );
}

describe('snapshot render integration', () => {
    it('plans a flat Alpha profile as one flat chapter with peer domain zones', () => {
        const profile = makeProfile({
            pack_id: 'alpha',
            org_id: 'org-1',
            title: 'Alpha',
            description: '',
            version: '1.0',
            domains: [
                { domain_id: 'A', title: 'Domain A', targets: makeTargetList('A', 8) },
                { domain_id: 'B', title: 'Domain B', targets: makeTargetList('B', 6) },
            ],
        });

        const plan = buildSnapshotRenderPlan(profile, { mode: 'screen' });

        expect(plan.topology).toBe('flat');
        expect(plan.chapters).toHaveLength(1);
        expect(plan.chapters[0].rows[0].zones).toHaveLength(2);
        for (const zone of plan.chapters[0].rows[0].zones) {
            expect(zone.parts).toHaveLength(1);
            expect(zone.parts[0].partNumber).toBe(1);
            expect(zone.parts[0].isFactored).toBe(false);
            expect(zone.zoneKind).toBe('flat-primary');
        }
    });

    it('plans grouped secondary domains as child zones under Level chapters', () => {
        const profile = makeProfile({
            pack_id: 'vb',
            org_id: 'org-1',
            title: 'VB',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'L1',
                    title: 'Level 1',
                    secondary_groups: [
                        { secondary_group_id: 'sg_listen', title: 'Listening' },
                        { secondary_group_id: 'sg_motor', title: 'Motor' },
                    ],
                    targets: [
                        makeTarget({ target_id: 'M1', secondary_group_id: 'sg_listen' }),
                        makeTarget({ target_id: 'M2', secondary_group_id: 'sg_motor' }),
                        makeTarget({ target_id: 'M3' }),
                    ],
                },
            ],
        });

        const plan = buildSnapshotRenderPlan(profile, { mode: 'screen' });
        const chapter = findPrimaryChapter(plan, 'L1')!;

        expect(plan.topology).toBe('grouped');
        expect(chapter.primaryTitle).toBe('Level 1');
        expect(flattenRenderPlanZoneTitles(plan)).toEqual(['Listening', 'Motor', 'Ungrouped']);
    });

    it('plans multiple presentation parts for PEAK-scale domains in print mode', () => {
        const profile = makeProfile({
            pack_id: 'peak',
            org_id: 'org-1',
            title: 'PEAK',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'PEAK_DT',
                    title: 'PEAK DT Module',
                    targets: makeTargetList('P', 184),
                },
            ],
        });

        const plan = buildSnapshotRenderPlan(profile, { mode: 'print' });
        const zone = findDomainZonePlan(plan, 'PEAK_DT')!;

        expect(zone.parts.length).toBeGreaterThan(1);
        expect(zone.parts[1].partNumber).toBe(2);
        expect(zone.parts[1].title).toContain('Part 2');
    });

    it('uses domain column widths from the render plan', () => {
        const profile = makeProfile({
            pack_id: 'alpha',
            org_id: 'org-1',
            title: 'Alpha',
            description: '',
            version: '1.0',
            domains: [{ domain_id: 'A', title: 'Domain A', targets: makeTargetList('A', 3) }],
        });

        const plan = buildSnapshotRenderPlan(profile, { mode: 'screen' });
        const layout = resolveThreadsLayoutFromPlan(plan);
        const zone = plan.chapters[0].rows[0].zones[0];

        expect(zone.columnWidthRem).toBe(plan.domainColumnWidthRem);
        expect(layout.domainColumnWidthRem).toBe(plan.domainColumnWidthRem);
    });

    it('does not mutate the profile when building a render plan', () => {
        const profile = makeProfile({
            pack_id: 'peak',
            org_id: 'org-1',
            title: 'PEAK',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'PEAK_DT',
                    title: 'PEAK DT Module',
                    targets: makeTargetList('P', 184),
                },
            ],
        });
        const snapshot = JSON.stringify(profile);

        buildSnapshotRenderPlan(profile, { mode: 'print' });

        expect(JSON.stringify(profile)).toBe(snapshot);
    });

    it('builds a target lookup map without altering profile targets', () => {
        const profile = makeProfile({
            pack_id: 'alpha',
            org_id: 'org-1',
            title: 'Alpha',
            description: '',
            version: '1.0',
            domains: [{ domain_id: 'A', title: 'Domain A', targets: makeTargetList('A', 2) }],
        });

        const targetsById = buildTargetByIdMap(profile);
        const plan = buildSnapshotRenderPlan(profile, { mode: 'screen' });
        const zone = plan.chapters[0].rows[0].zones[0];

        expect(targetsById.size).toBe(2);
        expect(zoneTargetCount(zone)).toBe(2);
        expect(targetsById.get('A1')?.targetId).toBe('A1');
    });
});
