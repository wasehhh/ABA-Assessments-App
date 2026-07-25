import { describe, expect, it } from 'vitest';
import { ContentPackData, Target } from '../../../types';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { buildLearnerMapProfile, LearnerMapCell } from '../../../services/learnerMapProfile';
import {
    buildSnapshotRenderPlan,
    SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM,
} from '../../../utils/snapshotLayoutEngine';
import {
    buildPrintRenderPlan,
    flattenPrintPlanTargetIds,
} from '../../../utils/snapshotPrintRenderPlan';
import {
    assertPositiveArrowToMaxGap,
    resolveThreadConnectorGeometry,
} from './domainZoneLayout';
import { beadScoreText } from './targetThreadsShared';

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

describe('snapshot print hardening (PR13.6D)', () => {
    it('keeps screen RenderPlan on the screen viewport default', () => {
        const profile = makeProfile({
            pack_id: 'print',
            org_id: 'org-1',
            title: 'Print',
            description: '',
            version: '1.0',
            domains: [{ domain_id: 'D1', title: 'Domain', targets: makeTargetList('T', 20) }],
        });

        const screenPlan = buildSnapshotRenderPlan(profile, { mode: 'screen' });
        expect(screenPlan.mode).toBe('screen');
        expect(screenPlan.viewportWidthRem).toBe(SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM);
    });

    it('segments overflowing domains via PrintRenderPlan, not screen Parts', () => {
        const profile = makeProfile({
            pack_id: 'screen',
            org_id: 'org-1',
            title: 'Screen',
            description: '',
            version: '1.0',
            domains: [{ domain_id: 'D1', title: 'Domain', targets: makeTargetList('T', 60) }],
        });

        const screenPlan = buildSnapshotRenderPlan(profile, { mode: 'screen' });
        const printPlan = buildPrintRenderPlan(profile);

        expect(screenPlan.chapters[0].rows[0].zones[0].parts).toHaveLength(1);
        expect(printPlan.pages.some((page) => page.rows[0].columns.length > 0)).toBe(true);
        expect(flattenPrintPlanTargetIds(printPlan)).toHaveLength(60);
    });

    it('ensures every target appears exactly once in the PrintRenderPlan', () => {
        const profile = makeProfile({
            pack_id: 'extreme',
            org_id: 'org-1',
            title: 'Extreme',
            description: '',
            version: '1.0',
            domains: [{ domain_id: 'D1', title: 'Domain', targets: makeTargetList('T', 250) }],
        });

        const printPlan = buildPrintRenderPlan(profile);
        const ids = flattenPrintPlanTargetIds(printPlan);
        expect(ids).toHaveLength(250);
        expect(new Set(ids).size).toBe(250);
        expect(ids).toEqual(profile.domains[0].targets.map((target) => target.targetId));
    });

    it('preserves secondary groups through print composition', () => {
        const profile = makeProfile({
            pack_id: 'grouped',
            org_id: 'org-1',
            title: 'Grouped',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'L1',
                    title: 'Level 1',
                    secondary_groups: [
                        { secondary_group_id: 'sg_a', title: 'Listening' },
                        { secondary_group_id: 'sg_b', title: 'Motor' },
                    ],
                    targets: [
                        ...makeTargetList('L', 70).map((target) => ({
                            ...target,
                            secondary_group_id: 'sg_a',
                        })),
                        ...makeTargetList('M', 70).map((target) => ({
                            ...target,
                            secondary_group_id: 'sg_b',
                        })),
                    ],
                },
            ],
        });

        const printPlan = buildPrintRenderPlan(profile);
        const titles = printPlan.pages.flatMap((page) =>
            page.rows.flatMap((row) =>
                row.columns.map((column) => column.segment.domainTitle)
            )
        );

        expect(titles).toContain('Listening');
        expect(titles).toContain('Motor');
        expect(printPlan.topology).toBe('grouped');
    });

    it('does not mutate the profile when building screen and print plans', () => {
        const profile = makeProfile({
            pack_id: 'immutable',
            org_id: 'org-1',
            title: 'Immutable',
            description: '',
            version: '1.0',
            domains: [{ domain_id: 'D1', title: 'Domain', targets: makeTargetList('T', 184) }],
        });
        const snapshot = JSON.stringify(profile);

        buildSnapshotRenderPlan(profile, { mode: 'screen' });
        buildPrintRenderPlan(profile);

        expect(JSON.stringify(profile)).toBe(snapshot);
    });

    it('falls back to compact bead text for labeled scales', () => {
        const cell: LearnerMapCell = {
            cycleId: 'c1',
            cycleNumber: 1,
            rawScore: 3,
            displayScoreWithMax: 'Independent/4',
            competencyState: 'mastered',
            normalizedRatio: 0.75,
            isUnscored: false,
            movementFromPrevious: 'none',
        };

        expect(beadScoreText(cell)).toBe('3');
    });

    it('keeps arrow-to-max gap positive for print dense geometries', () => {
        const geometry = resolveThreadConnectorGeometry('dense', 6);
        expect(assertPositiveArrowToMaxGap(geometry)).toBe(true);
    });
});
