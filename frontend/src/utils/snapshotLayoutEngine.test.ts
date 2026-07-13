import { describe, expect, it } from 'vitest';
import { ContentPackData, Target } from '../types';
import { buildAssessmentSnapshotProfile } from '../services/assessmentSnapshotProfile';
import { buildLearnerMapProfile } from '../services/learnerMapProfile';
import {
    buildSnapshotRenderPlan,
    findDomainZonePlan,
    flattenRenderPlanSecondarySectionTitles,
    flattenRenderPlanTargetIds,
    packDomainZonesIntoRows,
    resolveDomainColumnWidthRem,
    shouldApplyPresentationFactoring,
    SNAPSHOT_FACTORING_PART_SIZE,
    type DomainZonePlan,
} from './snapshotLayoutEngine';

const generatedAt = new Date('2026-07-06T12:00:00.000Z');

const cycle1 = { id: 'c1', cycle_number: 1, status: 'closed' as const };
const cycle2 = { id: 'c2', cycle_number: 2, status: 'closed' as const };
const cycle3 = { id: 'c3', cycle_number: 3, status: 'in_progress' as const };

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
                { cycle: cycle3, scores: [] },
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

describe('snapshotLayoutEngine', () => {
    it('plans a flat Alpha pack without presentation factoring', () => {
        const pack: ContentPackData = {
            pack_id: 'alpha',
            org_id: 'org-1',
            title: 'Alpha Pack',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'DOM_A',
                    title: 'Domain A',
                    targets: makeTargetList('A', 12),
                },
                {
                    domain_id: 'DOM_B',
                    title: 'Domain B',
                    targets: makeTargetList('B', 10),
                },
                {
                    domain_id: 'DOM_C',
                    title: 'Domain C',
                    targets: makeTargetList('C', 8),
                },
            ],
        };

        const profile = makeProfile(pack);
        const plan = buildSnapshotRenderPlan(profile, { mode: 'screen' });

        expect(plan.totalDomains).toBe(3);
        expect(plan.totalTargets).toBe(30);
        expect(plan.cycles.map((cycle) => cycle.cycleNumber)).toEqual([1, 2, 3]);
        expect(plan.rows.length).toBeGreaterThanOrEqual(1);

        for (const row of plan.rows) {
            for (const zone of row.zones) {
                expect(zone.parts).toHaveLength(1);
                expect(zone.parts[0].isFactored).toBe(false);
                expect(zone.parts[0].title).toBe(zone.domainTitle);
            }
        }

        expect(flattenRenderPlanTargetIds(plan)).toEqual(
            profile.domains.flatMap((domain) => domain.targets.map((target) => target.targetId))
        );
    });

    it('preserves authored secondary groups for a grouped VB-MAPP-like pack', () => {
        const pack: ContentPackData = {
            pack_id: 'vb',
            org_id: 'org-1',
            title: 'VB Pack',
            description: '',
            version: '1.0',
            structure_labels: {
                primary_group: 'Level',
                secondary_group: 'Domain',
                target: 'Milestone',
            },
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
        };

        const profile = makeProfile(pack);
        const plan = buildSnapshotRenderPlan(profile, { mode: 'screen' });
        const zone = findDomainZonePlan(plan, 'L1');

        expect(zone).toBeDefined();
        expect(zone!.parts).toHaveLength(1);
        expect(zone!.parts[0].secondarySections.map((section) => section.title)).toEqual([
            'Listening',
            'Motor',
            'Ungrouped',
        ]);
        expect(flattenRenderPlanSecondarySectionTitles(plan)).toEqual([
            'Listening',
            'Motor',
            'Ungrouped',
        ]);
        expect(flattenRenderPlanTargetIds(plan)).toEqual(['M1', 'M2', 'M3']);
    });

    it('factors a PEAK 184-target module in print mode', () => {
        const pack: ContentPackData = {
            pack_id: 'peak',
            org_id: 'org-1',
            title: 'PEAK DT',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'PEAK_DT',
                    title: 'PEAK DT Module',
                    targets: makeTargetList('P', 184),
                },
            ],
        };

        const profile = makeProfile(pack);
        const screenPlan = buildSnapshotRenderPlan(profile, { mode: 'screen' });
        const printPlan = buildSnapshotRenderPlan(profile, { mode: 'print' });
        const zone = findDomainZonePlan(printPlan, 'PEAK_DT');

        expect(screenPlan.rows[0].zones[0].parts.length).toBeGreaterThan(1);
        expect(zone).toBeDefined();
        expect(zone!.parts.length).toBe(Math.ceil(184 / SNAPSHOT_FACTORING_PART_SIZE));
        expect(zone!.parts.every((part) => part.isFactored)).toBe(true);
        expect(zone!.parts[0].title).toMatch(/^PEAK DT Module · Part 1 · Targets 1–/);
        expect(flattenRenderPlanTargetIds(printPlan)).toHaveLength(184);
        expect(flattenRenderPlanTargetIds(printPlan)[0]).toBe('P1');
        expect(flattenRenderPlanTargetIds(printPlan).at(-1)).toBe('P184');
    });

    it('factors a 250-target custom group in print mode', () => {
        const pack: ContentPackData = {
            pack_id: 'custom',
            org_id: 'org-1',
            title: 'Custom Flat',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'FLAT',
                    title: 'Flat Upload',
                    targets: makeTargetList('T', 250),
                },
            ],
        };

        const profile = makeProfile(pack);
        const plan = buildSnapshotRenderPlan(profile, { mode: 'print' });
        const zone = findDomainZonePlan(plan, 'FLAT');

        expect(zone!.parts.length).toBe(Math.ceil(250 / SNAPSHOT_FACTORING_PART_SIZE));
        expect(flattenRenderPlanTargetIds(plan)).toHaveLength(250);

        const ordinals = zone!.parts.flatMap((part) =>
            part.secondarySections.flatMap((section) =>
                section.threads.map((thread) => thread.domainTargetOrdinal)
            )
        );
        expect(ordinals).toEqual(Array.from({ length: 250 }, (_, index) => index + 1));
    });

    it('preserves target order across presentation parts', () => {
        const pack: ContentPackData = {
            pack_id: 'ordered',
            org_id: 'org-1',
            title: 'Ordered',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'BIG',
                    title: 'Big Domain',
                    targets: makeTargetList('X', 130),
                },
            ],
        };

        const profile = makeProfile(pack);
        const plan = buildSnapshotRenderPlan(profile, { mode: 'print' });

        expect(flattenRenderPlanTargetIds(plan)).toEqual(
            profile.domains[0].targets.map((target) => target.targetId)
        );
    });

    it('preserves cycle order on every evidence mark', () => {
        const pack: ContentPackData = {
            pack_id: 'cycles',
            org_id: 'org-1',
            title: 'Cycles',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'D1',
                    title: 'Domain 1',
                    targets: [makeTarget({ target_id: 'T1' })],
                },
            ],
        };

        const profile = makeProfile(pack);
        const plan = buildSnapshotRenderPlan(profile);
        const thread = plan.rows[0].zones[0].parts[0].secondarySections[0].threads[0];

        expect(thread.marks.map((mark) => mark.cycleNumber)).toEqual([1, 2, 3]);
        expect(thread.marks.map((mark) => mark.cycleIndex)).toEqual([0, 1, 2]);
        expect(thread.marks.map((mark) => mark.cycleId)).toEqual(['c1', 'c2', 'c3']);
        expect(plan.cycles.map((cycle) => cycle.cycleNumber)).toEqual([1, 2, 3]);
    });

    it('does not mutate the authored profile when factoring', () => {
        const pack: ContentPackData = {
            pack_id: 'immutable',
            org_id: 'org-1',
            title: 'Immutable',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'PEAK',
                    title: 'PEAK Module',
                    targets: makeTargetList('I', 184),
                },
            ],
        };

        const profile = makeProfile(pack);
        const profileSnapshot = JSON.stringify(profile);

        buildSnapshotRenderPlan(profile, { mode: 'print' });

        expect(JSON.stringify(profile)).toBe(profileSnapshot);
        expect(profile.domains[0].targets).toHaveLength(184);
        expect(profile.domains[0].targetSections).toBeUndefined();
    });

    it('packs domains into rows based on available viewport width', () => {
        const pack: ContentPackData = {
            pack_id: 'packing',
            org_id: 'org-1',
            title: 'Packing',
            description: '',
            version: '1.0',
            domains: [
                { domain_id: 'D1', title: 'One', targets: makeTargetList('A', 5) },
                { domain_id: 'D2', title: 'Two', targets: makeTargetList('B', 5) },
                { domain_id: 'D3', title: 'Three', targets: makeTargetList('C', 5) },
                { domain_id: 'D4', title: 'Four', targets: makeTargetList('D', 5) },
            ],
        };

        const profile = makeProfile(pack);
        const columnWidth = resolveDomainColumnWidthRem(profile.cycles.length, 'standard');
        const zones: DomainZonePlan[] = profile.domains.map((domain, domainIndex) => ({
            domainId: domain.domainId,
            domainTitle: domain.title,
            domainIndex,
            columnWidthRem: columnWidth,
            parts: [],
        }));

        const narrowRows = packDomainZonesIntoRows(zones, {
            mode: 'screen',
            viewportWidthRem: columnWidth + 0.5,
            factoringNoneMax: 60,
            factoringLargeMin: 80,
            factoringExtremeMin: 120,
            factoringPartSize: 46,
            domainGapRem: 1.25,
        });

        const wideViewportRem = columnWidth * 4 + 1.25 * 3;
        const wideRows = packDomainZonesIntoRows(zones, {
            mode: 'screen',
            viewportWidthRem: wideViewportRem,
            factoringNoneMax: 60,
            factoringLargeMin: 80,
            factoringExtremeMin: 120,
            factoringPartSize: 46,
            domainGapRem: 1.25,
        });

        expect(narrowRows).toHaveLength(4);
        expect(wideRows).toHaveLength(1);
        expect(wideRows[0].zones).toHaveLength(4);
    });

    it('applies presentation factoring thresholds by mode', () => {
        const config = {
            mode: 'screen' as const,
            viewportWidthRem: 96,
            factoringNoneMax: 60,
            factoringLargeMin: 80,
            factoringExtremeMin: 120,
            factoringPartSize: 46,
            domainGapRem: 1.25,
        };

        expect(shouldApplyPresentationFactoring(60, 'screen', config)).toBe(false);
        expect(shouldApplyPresentationFactoring(90, 'screen', config)).toBe(false);
        expect(shouldApplyPresentationFactoring(90, 'print', { ...config, mode: 'print' })).toBe(
            true
        );
        expect(shouldApplyPresentationFactoring(130, 'screen', config)).toBe(true);
        expect(shouldApplyPresentationFactoring(130, 'print', { ...config, mode: 'print' })).toBe(
            true
        );
    });

    it('keeps secondary group sections when a factored part spans only part of a group', () => {
        const listeningTargets = makeTargetList('L', 70);
        const motorTargets = makeTargetList('M', 70);

        const pack: ContentPackData = {
            pack_id: 'grouped-large',
            org_id: 'org-1',
            title: 'Grouped Large',
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
                        ...listeningTargets.map((target) => ({
                            ...target,
                            secondary_group_id: 'sg_listen',
                        })),
                        ...motorTargets.map((target) => ({
                            ...target,
                            secondary_group_id: 'sg_motor',
                        })),
                    ],
                },
            ],
        };

        const profile = makeProfile(pack);
        const plan = buildSnapshotRenderPlan(profile, { mode: 'print' });
        const zone = findDomainZonePlan(plan, 'L1');

        expect(zone!.parts.length).toBeGreaterThan(1);
        expect(
            zone!.parts.some((part) =>
                part.secondarySections.some((section) => section.title === 'Listening')
            )
        ).toBe(true);
        expect(
            zone!.parts.some((part) =>
                part.secondarySections.some((section) => section.title === 'Motor')
            )
        ).toBe(true);
        expect(flattenRenderPlanTargetIds(plan)).toHaveLength(140);
    });
});
