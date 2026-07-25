import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ContentPackData, Target } from '../../../types';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { buildLearnerMapProfile } from '../../../services/learnerMapProfile';
import {
    buildSnapshotRenderPlan,
    flattenRenderPlanTargetIds,
} from '../../../utils/snapshotLayoutEngine';
import { snapshotCellClass } from '../snapshotCellDisplay';
import {
    assertPositiveArrowToMaxGap,
    resolveThreadConnectorGeometry,
} from './domainZoneLayout';
import {
    assertArrowToMaxGapVisible,
    assertBeadMaxVerticalAlignment,
    assertPrintDensityTighterThanScreen,
    printLabelWidthClass,
    printRowGapClass,
    printThreadGapClass,
    SNAPSHOT_PRINT_ARROW_TO_MAX_GAP_REM,
    SNAPSHOT_PRINT_MAX_RING_BORDER,
    SNAPSHOT_PRINT_ROW_GAP_REM,
    SNAPSHOT_PRINT_THREAD_GAP_REM,
    SNAPSHOT_SCREEN_ROW_GAP_REM,
    SNAPSHOT_SCREEN_THREAD_GAP_REM,
    screenThreadGapClass,
} from './snapshotPrintDensity';
import { maxRingSurfaceClass } from './snapshotVisualSystem';
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

describe('snapshot print density (PR13.6A)', () => {
    it('uses tighter print row-density and code-to-bead tokens than screen', () => {
        expect(assertPrintDensityTighterThanScreen()).toBe(true);
        expect(SNAPSHOT_PRINT_ROW_GAP_REM).toBeLessThan(SNAPSHOT_SCREEN_ROW_GAP_REM);
        expect(SNAPSHOT_PRINT_THREAD_GAP_REM).toBeLessThan(SNAPSHOT_SCREEN_THREAD_GAP_REM);
        expect(printThreadGapClass()).toBe('gap-0.5');
        expect(screenThreadGapClass()).toBe('gap-1');
        expect(printRowGapClass('standard')).toBe('space-y-[0.2rem]');
        expect(printLabelWidthClass()).toBe('w-11');
    });

    it('applies print density only to print-mode layout tokens', () => {
        const plan = {
            tier: 'standard' as const,
            domainColumnWidthRem: 12,
        };
        const screen = resolveThreadsLayoutFromPlan({ ...plan, mode: 'screen' });
        const print = resolveThreadsLayoutFromPlan({ ...plan, mode: 'print' });

        expect(screen.threadGapClass).toBe('gap-1');
        expect(screen.threadRowGapClass).toBe('space-y-1');
        expect(screen.labelWidthClass).toBe('w-12');
        expect(screen.beadSizeLatest).not.toBe(screen.beadSizeDefault);

        expect(print.threadGapClass).toBe('gap-0.5');
        expect(print.threadRowGapClass).toBe('space-y-[0.2rem]');
        expect(print.labelWidthClass).toBe('w-11');
        expect(print.beadSizeLatest).toBe(print.beadSizeDefault);
        expect(print.maxRingSize).toContain('h-5');
    });

    it('keeps max-ring centerline helpers within 1px and arrow-to-max gap visible', () => {
        expect(assertBeadMaxVerticalAlignment(20, 20)).toBe(true);
        expect(assertBeadMaxVerticalAlignment(20, 21)).toBe(true);
        expect(assertBeadMaxVerticalAlignment(20, 22)).toBe(false);

        const printGeometry = resolveThreadConnectorGeometry('standard', 3, 'print');
        expect(printGeometry.arrowToMaxGapRem).toBe(SNAPSHOT_PRINT_ARROW_TO_MAX_GAP_REM);
        expect(assertPositiveArrowToMaxGap(printGeometry)).toBe(true);

        const gapPx = SNAPSHOT_PRINT_ARROW_TO_MAX_GAP_REM * 16;
        expect(assertArrowToMaxGapVisible(gapPx, 4, 6)).toBe(true);
    });

    it('keeps mastered solid green distinct from hollow green maximum in print CSS', () => {
        const maxClass = maxRingSurfaceClass();
        const mastered = snapshotCellClass('at_maximum');

        expect(maxClass).toContain('assessment-snapshot-max-ring');
        expect(maxClass).toContain('border-green-700');
        expect(maxClass).toContain('bg-white');
        expect(maxClass).not.toMatch(/bg-green/);
        expect(mastered).toContain('bg-green-600');

        const css = readFileSync(resolve(__dirname, '../../../index.css'), 'utf8');
        expect(css).toContain('data-assessment-snapshot-target-max-ring');
        expect(css).toContain(SNAPSHOT_PRINT_MAX_RING_BORDER);
        expect(css).toMatch(/border:\s*2px\s+solid\s+#15803d\s*!important/);
        expect(css).toContain('background-color: #ffffff !important');
        expect(css).toMatch(
            /\[data-assessment-snapshot-target-thread\][\s\S]*break-inside:\s*avoid/
        );
    });

    it('does not change profile input or thread order when applying print density', () => {
        const profile = makeProfile({
            pack_id: 'density',
            org_id: 'org-1',
            title: 'Density',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'D1',
                    title: 'Domain',
                    targets: [
                        makeTarget({ target_id: 'A1' }),
                        makeTarget({ target_id: 'AFLS_205' }),
                        makeTarget({ target_id: 'L1-LR-1' }),
                        makeTarget({ target_id: 'X250' }),
                        makeTarget({ target_id: '11' }),
                        makeTarget({ target_id: '24' }),
                    ],
                },
            ],
        });
        const before = JSON.stringify(profile);
        const printLayout = resolveThreadsLayoutFromPlan({
            tier: 'dense',
            domainColumnWidthRem: 10,
            mode: 'print',
        });
        const screenPlan = buildSnapshotRenderPlan(profile, { mode: 'screen' });

        expect(JSON.stringify(profile)).toBe(before);
        expect(flattenRenderPlanTargetIds(screenPlan)).toEqual([
            'A1',
            'AFLS_205',
            'L1-LR-1',
            'X250',
            '11',
            '24',
        ]);
        expect(printLayout.threadGapClass).toBe('gap-0.5');
        expect(screenPlan.mode).toBe('screen');
    });
});
