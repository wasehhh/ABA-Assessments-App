import { describe, expect, it } from 'vitest';
import { buildAssessmentSnapshotProfile } from './assessmentSnapshotProfile';
import { buildLearnerMapProfile } from './learnerMapProfile';
import {
    buildAssessmentSnapshotRouteHash,
    getAssessmentSnapshotAvailability,
} from './assessmentSnapshotAvailability';
import {
    ASSESSMENT_SNAPSHOT_DEV_CONTROL_MARKERS,
    ASSESSMENT_SNAPSHOT_DEV_ROUTE,
    ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS,
    matchAssessmentSnapshotProductionRoute,
    shouldShowAssessmentSnapshotEntry,
} from './assessmentSnapshotProductionContract';
import { buildSnapshotScreenPlanConfig } from '../hooks/snapshotViewport';
import {
    buildSnapshotRenderPlan,
    flattenRenderPlanTargetIds,
    SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM,
} from '../utils/snapshotLayoutEngine';
import { buildPrintRenderPlan } from '../utils/snapshotPrintRenderPlan';
import { getAssessmentSnapshotStressScenario } from '../pages/dev/assessmentSnapshotMockData';
import { ContentPackData } from '../types';

const pack: ContentPackData = {
    pack_id: 'p1',
    org_id: 'o1',
    title: 'Pack',
    description: '',
    version: '1',
    domains: [
        {
            domain_id: 'D1',
            title: 'Domain A',
            targets: [
                {
                    target_id: 'T1',
                    title: 'Target Alpha',
                    success_criteria: '',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
                {
                    target_id: 'T2',
                    title: 'Target Beta',
                    success_criteria: '',
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
        {
            domain_id: 'D2',
            title: 'Domain B',
            targets: [
                {
                    target_id: 'T3',
                    title: 'Target Gamma',
                    success_criteria: '',
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
    ],
};

describe('Assessment Snapshot production smoke (PR13.5)', () => {
    it('matches the authenticated production route hash', () => {
        expect(matchAssessmentSnapshotProductionRoute('#/assessment/abc/snapshot')).toEqual({
            assessmentId: 'abc',
        });
        expect(matchAssessmentSnapshotProductionRoute('#/assessment/abc/snapshot?x=1')).toEqual({
            assessmentId: 'abc',
        });
        expect(matchAssessmentSnapshotProductionRoute('#/assessment/abc')).toBeNull();
        expect(matchAssessmentSnapshotProductionRoute('#/assessment/abc/learner-map')).toBeNull();
        expect(
            matchAssessmentSnapshotProductionRoute(ASSESSMENT_SNAPSHOT_DEV_ROUTE)
        ).toBeNull();
        expect(buildAssessmentSnapshotRouteHash('abc')).toBe('#/assessment/abc/snapshot');
    });

    it('exposes production shell / surface / visibility markers', () => {
        expect(ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS.page).toBe(
            'data-assessment-snapshot-production'
        );
        expect(ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS.loading).toBe(
            'data-assessment-snapshot-loading'
        );
        expect(ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS.error).toBe(
            'data-assessment-snapshot-error'
        );
        expect(ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS.screenOnlyClass).toBe(
            'assessment-snapshot-screen-only'
        );
        expect(ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS.printOnlyClass).toBe(
            'assessment-snapshot-print-only'
        );
        expect(ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS.printSurface).toBe(
            'data-assessment-snapshot-print-surface'
        );
        expect(ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS.primaryChapter).toBe(
            'data-assessment-snapshot-primary-chapter'
        );
        expect(ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS.domainZone).toBe(
            'data-assessment-snapshot-domain-zone'
        );
        expect(ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS.targetThread).toBe(
            'data-assessment-snapshot-target-thread'
        );
        expect(ASSESSMENT_SNAPSHOT_PRODUCTION_MARKERS.entry).toBe(
            'data-assessment-snapshot-entry'
        );
    });

    it('lists Concept Lab markers that production must not render', () => {
        expect(ASSESSMENT_SNAPSHOT_DEV_CONTROL_MARKERS.length).toBeGreaterThan(0);
        expect(ASSESSMENT_SNAPSHOT_DEV_CONTROL_MARKERS).toContain(
            'data-assessment-snapshot-concept-lab'
        );
    });

    it('gates the Matrix entry on availability', () => {
        expect(
            shouldShowAssessmentSnapshotEntry(
                getAssessmentSnapshotAvailability({
                    assessment: { id: 'a1', pack_snapshot: pack },
                    cycleCount: 1,
                }).available
            )
        ).toBe(true);

        expect(
            shouldShowAssessmentSnapshotEntry(
                getAssessmentSnapshotAvailability({
                    assessment: { id: 'a1', pack_snapshot: pack },
                    cycleCount: 0,
                }).available
            )
        ).toBe(false);

        expect(
            shouldShowAssessmentSnapshotEntry(
                getAssessmentSnapshotAvailability({
                    assessment: null,
                    cycleCount: 1,
                }).available
            )
        ).toBe(false);
    });

    it('passes measured width into the screen RenderPlan configuration', () => {
        const measured = 56;
        const config = buildSnapshotScreenPlanConfig(measured);
        expect(config).toEqual({ mode: 'screen', viewportWidthRem: measured });
        expect(config.viewportWidthRem).not.toBe(SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM);

        const profile = buildAssessmentSnapshotProfile(
            buildLearnerMapProfile({
                assessment: { id: 'a1', pack_snapshot: pack },
                cycles: [{ cycle: { id: 'c1', cycle_number: 1, status: 'closed' }, scores: [] }],
            })
        );
        const plan = buildSnapshotRenderPlan(profile, config);
        expect(plan.mode).toBe('screen');
        expect(plan.viewportWidthRem).toBe(measured);
        expect(plan.topology).toBe('flat');
        expect(plan.chapters.every((chapter) => chapter.chapterKind === 'flat')).toBe(true);
    });

    it('rebuilds flat packing for narrower measured widths without dropping targets', () => {
        const profile = buildAssessmentSnapshotProfile(
            buildLearnerMapProfile({
                assessment: { id: 'a1', pack_snapshot: pack },
                cycles: [{ cycle: { id: 'c1', cycle_number: 1, status: 'closed' }, scores: [] }],
            })
        );

        const wide = buildSnapshotRenderPlan(
            profile,
            buildSnapshotScreenPlanConfig(SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM)
        );
        const narrow = buildSnapshotRenderPlan(profile, buildSnapshotScreenPlanConfig(20));

        const wideTargets = flattenRenderPlanTargetIds(wide);
        const narrowTargets = flattenRenderPlanTargetIds(narrow);

        expect(wideTargets).toEqual(['T1', 'T2', 'T3']);
        expect(narrowTargets).toEqual(['T1', 'T2', 'T3']);
        expect(narrow.viewportWidthRem).toBe(20);
    });

    it('keeps grouped VB-MAPP Levels as full-width chapters when viewport is measured', () => {
        const scenario = getAssessmentSnapshotStressScenario('vb-mapp-like');
        const profile = buildAssessmentSnapshotProfile(scenario.profile);
        const plan = buildSnapshotRenderPlan(
            profile,
            buildSnapshotScreenPlanConfig(48)
        );

        expect(plan.topology).toBe('grouped');
        expect(plan.viewportWidthRem).toBe(48);
        expect(plan.chapters).toHaveLength(3);
        expect(plan.chapters.every((chapter) => chapter.chapterKind === 'grouped')).toBe(true);
        for (const chapter of plan.chapters) {
            for (const row of chapter.rows) {
                expect(new Set(row.zones.map((zone) => zone.primaryId)).size).toBe(1);
            }
        }
    });

    it('keeps print composition independent of screen measured viewport', () => {
        const scenario = getAssessmentSnapshotStressScenario('vb-mapp-like');
        const profile = buildAssessmentSnapshotProfile(scenario.profile);
        const printPlan = buildPrintRenderPlan(profile, { paper: 'letter' });
        expect(printPlan.mode).toBe('print');
        expect(printPlan.profileId).toBe('letter');
        expect(printPlan.totalPages).toBeGreaterThan(0);
    });

    it('preserves distinct target labels in the profile used by production', () => {
        const profile = buildAssessmentSnapshotProfile(
            buildLearnerMapProfile({
                assessment: { id: 'a1', pack_snapshot: pack },
                cycles: [{ cycle: { id: 'c1', cycle_number: 1, status: 'closed' }, scores: [] }],
            })
        );
        const titles = profile.domains.flatMap((domain) =>
            domain.targets.map((target) => target.title)
        );
        expect(titles).toEqual(['Target Alpha', 'Target Beta', 'Target Gamma']);
        expect(new Set(titles).size).toBe(3);
    });
});
