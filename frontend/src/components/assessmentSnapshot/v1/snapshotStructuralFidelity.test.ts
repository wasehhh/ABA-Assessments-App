import { describe, expect, it } from 'vitest';
import { ContentPackData } from '../../../types';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { buildLearnerMapProfile } from '../../../services/learnerMapProfile';
import {
    buildSnapshotRenderPlan,
    findPrimaryChapter,
    flattenRenderPlanTargetIds,
    flattenRenderPlanZoneTitles,
} from '../../../utils/snapshotLayoutEngine';
import { getAssessmentSnapshotStressScenario } from '../../../pages/dev/assessmentSnapshotMockData';
import {
    assertPositiveArrowToMaxGap,
    resolveDomainZoneHeaderBands,
    resolveThreadBodyStartOffsetRem,
    resolveThreadConnectorGeometry,
} from './domainZoneLayout';

const generatedAt = new Date('2026-07-06T12:00:00.000Z');

describe('snapshot structural fidelity (PR13.3B chapter topology)', () => {
    it('VB-MAPP-like fixture defines multiple secondary domains per level', () => {
        const scenario = getAssessmentSnapshotStressScenario('vb-mapp-like');
        const level1 = scenario.profile.domains.find((domain) => domain.domainId === 'L1');
        const level2 = scenario.profile.domains.find((domain) => domain.domainId === 'L2');
        const level3 = scenario.profile.domains.find((domain) => domain.domainId === 'L3');

        expect(level1?.targetSections?.length).toBeGreaterThanOrEqual(6);
        expect(level2?.targetSections?.length).toBeGreaterThanOrEqual(6);
        expect(level3?.targetSections?.length).toBeGreaterThanOrEqual(7);
        expect(scenario.profile.structureLabels).toEqual({
            primary_group: 'Level',
            secondary_group: 'Domain',
            target: 'Milestone',
        });
    });

    it('produces one chapter per primary group for VB-MAPP-like', () => {
        const scenario = getAssessmentSnapshotStressScenario('vb-mapp-like');
        const profile = buildAssessmentSnapshotProfile(scenario.profile);
        const plan = buildSnapshotRenderPlan(profile, { mode: 'screen' });

        expect(plan.topology).toBe('grouped');
        expect(plan.chapters).toHaveLength(3);
        expect(plan.chapters.map((chapter) => chapter.primaryTitle)).toEqual([
            'Level 1',
            'Level 2',
            'Level 3',
        ]);
        expect(plan.chapters.every((chapter) => chapter.chapterKind === 'grouped')).toBe(true);
    });

    it('places multiple secondary child zones beneath each Level chapter', () => {
        const scenario = getAssessmentSnapshotStressScenario('vb-mapp-like');
        const profile = buildAssessmentSnapshotProfile(scenario.profile);
        const plan = buildSnapshotRenderPlan(profile, { mode: 'screen' });
        const level1 = findPrimaryChapter(plan, 'L1')!;
        const zoneTitles = level1.rows.flatMap((row) => row.zones.map((zone) => zone.zoneTitle));

        expect(zoneTitles.length).toBeGreaterThanOrEqual(6);
        expect(zoneTitles).toContain('Mand');
        expect(zoneTitles).toContain('Social');
        expect(level1.rows.flatMap((row) => row.zones).every((zone) => zone.primaryId === 'L1')).toBe(
            true
        );
    });

    it('never packs Levels as peer zones in one row', () => {
        const scenario = getAssessmentSnapshotStressScenario('vb-mapp-like');
        const profile = buildAssessmentSnapshotProfile(scenario.profile);
        const plan = buildSnapshotRenderPlan(profile, {
            mode: 'screen',
            viewportWidthRem: 400,
        });

        for (const chapter of plan.chapters) {
            for (const row of chapter.rows) {
                const primaryIds = new Set(row.zones.map((zone) => zone.primaryId));
                expect(primaryIds.size).toBe(1);
                expect(primaryIds.has(chapter.primaryId)).toBe(true);
            }
        }
    });

    it('does not drop or duplicate targets in VB-MAPP-like fixture', () => {
        const scenario = getAssessmentSnapshotStressScenario('vb-mapp-like');
        const profile = buildAssessmentSnapshotProfile(scenario.profile);
        const plan = buildSnapshotRenderPlan(profile, { mode: 'screen' });
        const ids = flattenRenderPlanTargetIds(plan);
        const authoredIds = profile.domains.flatMap((domain) =>
            domain.targets.map((target) => target.targetId)
        );

        expect(ids).toEqual(authoredIds);
        expect(new Set(ids).size).toBe(authoredIds.length);
    });

    it('keeps flat Alpha packing as multi-domain flat topology', () => {
        const scenario = getAssessmentSnapshotStressScenario('alpha-small');
        const profile = buildAssessmentSnapshotProfile(scenario.profile);
        const plan = buildSnapshotRenderPlan(profile, { mode: 'screen' });

        expect(plan.topology).toBe('flat');
        expect(plan.chapters).toHaveLength(1);
        expect(plan.chapters[0].chapterKind).toBe('flat');

        const zones = plan.chapters[0].rows.flatMap((row) => row.zones);
        expect(zones).toHaveLength(3);
        expect(zones.every((zone) => zone.zoneKind === 'flat-primary')).toBe(true);
        expect(zones.map((zone) => zone.zoneTitle)).toEqual(
            profile.domains.map((domain) => domain.title)
        );
    });

    it('uses deterministic fixed header bands independent of title length', () => {
        const compact = resolveDomainZoneHeaderBands('compact');
        const standard = resolveDomainZoneHeaderBands('standard');

        expect(compact.maxTitleLines).toBe(3);
        expect(standard.primaryTitleBandRem).toBeGreaterThan(0);
        expect(resolveThreadBodyStartOffsetRem(compact)).toBe(
            compact.primaryTitleBandRem + compact.targetCountBandRem + compact.cycleAxisBandRem
        );
        expect(compact.titleBandClass).toContain('assessment-snapshot-title-band');
    });

    it('keeps a positive visible gap between arrowhead and max ring', () => {
        for (const tier of ['compact', 'standard', 'dense'] as const) {
            for (const cycleCount of [1, 2, 3, 4, 6]) {
                const geometry = resolveThreadConnectorGeometry(tier, cycleCount);
                expect(assertPositiveArrowToMaxGap(geometry)).toBe(true);
                expect(geometry.arrowToMaxGapRem).toBeGreaterThanOrEqual(0.25);
                expect(geometry.arrowSlotRem).toBeGreaterThanOrEqual(geometry.arrowWidthRem * 0.85);
            }
        }
    });

    it('does not mutate profile when building structural plans', () => {
        const scenario = getAssessmentSnapshotStressScenario('vb-mapp-like');
        const profile = buildAssessmentSnapshotProfile(scenario.profile);
        const snapshot = JSON.stringify(profile);

        buildSnapshotRenderPlan(profile, { mode: 'screen' });
        buildSnapshotRenderPlan(profile, { mode: 'print' });

        expect(JSON.stringify(profile)).toBe(snapshot);
    });

    it('preserves ungrouped targets as a secondary child zone under the correct chapter', () => {
        const pack: ContentPackData = {
            pack_id: 'ungrouped',
            org_id: 'org-1',
            title: 'Ungrouped',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'L1',
                    title: 'Level 1',
                    secondary_groups: [
                        { secondary_group_id: 'sg_mand', title: 'Mand' },
                        { secondary_group_id: 'sg_tact', title: 'Tact' },
                    ],
                    targets: [
                        {
                            target_id: 'M1',
                            title: 'Milestone 1',
                            success_criteria: '',
                            materials: '',
                            scoring: {
                                type: 'numeric',
                                scale: [0, 1, 2, 3, 4],
                                scale_labels: {},
                                no_opportunity_allowed: false,
                            },
                            secondary_group_id: 'sg_mand',
                        },
                        {
                            target_id: 'U1',
                            title: 'Ungrouped milestone',
                            success_criteria: '',
                            materials: '',
                            scoring: {
                                type: 'numeric',
                                scale: [0, 1, 2, 3, 4],
                                scale_labels: {},
                                no_opportunity_allowed: false,
                            },
                        },
                    ],
                },
            ],
        };

        const profile = buildAssessmentSnapshotProfile(
            buildLearnerMapProfile({
                assessment: { id: 'a1', pack_snapshot: pack },
                cycles: [{ cycle: { id: 'c1', cycle_number: 1, status: 'closed' }, scores: [] }],
                generatedAt,
            })
        );

        const plan = buildSnapshotRenderPlan(profile, { mode: 'screen' });
        expect(flattenRenderPlanZoneTitles(plan)).toEqual(['Mand', 'Ungrouped']);
        expect(flattenRenderPlanTargetIds(plan)).toEqual(['M1', 'U1']);
    });
});
