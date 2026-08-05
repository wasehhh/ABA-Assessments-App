import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentPackData, Target } from '../../../types';
import { buildLearnerMapProfile } from '../../../services/learnerMapProfile';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { buildPrintRenderPlan } from '../../../utils/snapshotPrintRenderPlan';
import { buildSnapshotExportHtml } from '../export/snapshotExportHtml';
import { AssessmentSnapshotPrintDocument } from '../print/AssessmentSnapshotPrintDocument';
import { buildSnapshotTargetIndex } from './snapshotTargetIndex';
import { SNAPSHOT_TARGET_INDEX_TITLE } from './AssessmentSnapshotTargetIndexTable';

function makeTarget(targetId: string, title: string, scale: number[] = [0, 1, 2, 3, 4]): Target {
    return {
        target_id: targetId,
        title,
        success_criteria: '',
        materials: '',
        scoring: {
            type: 'numeric',
            scale,
            scale_labels: {},
            no_opportunity_allowed: true,
        },
    };
}

function makePack(
    targets: Target[],
    options?: {
        title?: string;
        secondaryGroups?: boolean;
    }
): ContentPackData {
    const pack: ContentPackData = {
        pack_id: 'pack-index',
        org_id: 'org-1',
        title: options?.title ?? 'Index Pack',
        description: '',
        version: '1.0',
        domains: [
            {
                domain_id: 'DOM_A',
                title: 'Domain A',
                targets,
            },
        ],
    };

    if (options?.secondaryGroups) {
        pack.domains[0]!.secondary_groups = [
            { secondary_group_id: 'SG1', title: 'Skill Area One' },
            { secondary_group_id: 'SG2', title: 'Skill Area Two' },
        ];
        pack.domains[0]!.targets = targets.map((target, index) => ({
            ...target,
            secondary_group_id: index === 0 ? 'SG1' : 'SG2',
        }));
        pack.structure_labels = {
            primary_group: 'Domain',
            secondary_group: 'Skill Area',
            target: 'Target',
        };
    }

    return pack;
}

function buildProfile(pack: ContentPackData) {
    return buildAssessmentSnapshotProfile(
        buildLearnerMapProfile({
            assessment: {
                id: 'assess-index',
                pack_snapshot: pack,
            },
            cycles: [
                {
                    cycle: { id: 'c1', cycle_number: 1, status: 'locked' },
                    scores: [],
                },
            ],
            generatedAt: new Date('2026-08-01T12:00:00.000Z'),
        })
    );
}

function renderPrintHtml(profile: ReturnType<typeof buildProfile>): string {
    const plan = buildPrintRenderPlan(profile, { paper: 'letter' });
    return renderToStaticMarkup(
        createElement(AssessmentSnapshotPrintDocument, {
            profile,
            plan,
            generatedAtLabel: 'Aug 1, 2026, 12:00 PM',
        })
    );
}

describe('Snapshot Target Index (PR14A-2 / contract §6)', () => {
    it('INV-I1: triggers on compaction alone', () => {
        const profile = buildProfile(
            makePack([
                makeTarget('L1_LISTENER_RESPONDING_1', 'Listener Responding 1'),
                makeTarget('ECHO_12', 'Echoic'),
            ])
        );
        const index = buildSnapshotTargetIndex(profile, 'print');
        expect(index).not.toBeNull();
        expect(index!.rows[0]!.displayedCode).toBe('L1-LR-1');
        expect(index!.rows[0]!.authoredTargetId).toBe('L1_LISTENER_RESPONDING_1');

        const printHtml = renderPrintHtml(profile);
        expect(printHtml).toContain('data-assessment-snapshot-target-index');
        expect(printHtml).toContain(SNAPSHOT_TARGET_INDEX_TITLE);

        const exportHtml = buildSnapshotExportHtml({
            profile,
            generatedAt: new Date('2026-08-01T12:00:00.000Z'),
        });
        expect(exportHtml).toContain('data-assessment-snapshot-target-index');
        expect(exportHtml).toContain('data-assessment-snapshot-target-index-page');
    });

    it('INV-I1: triggers on disambiguation alone', () => {
        const profile = buildProfile(
            makePack([
                makeTarget('L1_MOTOR_SKILL_1', 'Motor 1'),
                makeTarget('L1_MEMORY_SKILL_1', 'Memory 1'),
            ])
        );
        const index = buildSnapshotTargetIndex(profile, 'print');
        expect(index).not.toBeNull();
        expect(index!.rows.map((row) => row.displayedCode)).toEqual(['L1-MS-1', 'L1-MS-1-2']);
    });

    it('INV-I1: triggers on non-authored fallback alone', () => {
        const uuid = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
        const profile = buildProfile(makePack([makeTarget(uuid, 'Cooperation A4')]));
        const index = buildSnapshotTargetIndex(profile, 'print');
        expect(index).not.toBeNull();
        expect(index!.rows[0]!.displayedCode).toBe('A4');
        expect(index!.rows[0]!.authoredTargetId).toBe(uuid);
        expect(index!.rows[0]!.authoredLabel).toBe('Cooperation A4');
    });

    it('INV-I2: omits entirely when no abbreviation occurred', () => {
        const profile = buildProfile(
            makePack([
                makeTarget('ECHO_12', 'Echoic'),
                makeTarget('MAND_3', 'Mand'),
                makeTarget('D1T3', 'Target 1.3'),
            ])
        );
        expect(buildSnapshotTargetIndex(profile, 'print')).toBeNull();
        expect(buildSnapshotTargetIndex(profile, 'screen')).toBeNull();

        const printHtml = renderPrintHtml(profile);
        expect(printHtml).not.toContain('data-assessment-snapshot-target-index-page');
        expect(printHtml).not.toContain('data-assessment-snapshot-target-index-row');
        expect(printHtml).not.toContain(`>${SNAPSHOT_TARGET_INDEX_TITLE}<`);

        const exportHtml = buildSnapshotExportHtml({
            profile,
            generatedAt: new Date('2026-08-01T12:00:00.000Z'),
        });
        // Fallback CSS may mention index selectors in <style>; assert on body only.
        const exportBody = exportHtml.slice(exportHtml.indexOf('<body'));
        expect(exportBody).not.toContain('data-assessment-snapshot-target-index-page');
        expect(exportBody).not.toContain('data-assessment-snapshot-target-index-row');
        expect(exportBody).not.toContain(`>${SNAPSHOT_TARGET_INDEX_TITLE}<`);
    });

    it('INV-I3: every row carries required fields; secondary only when authored', () => {
        const flat = buildSnapshotTargetIndex(
            buildProfile(makePack([makeTarget('L1_LISTENER_RESPONDING_1', 'Listener 1')])),
            'print'
        )!;
        expect(flat.rows[0]).toMatchObject({
            displayedCode: 'L1-LR-1',
            authoredTargetId: 'L1_LISTENER_RESPONDING_1',
            authoredLabel: 'Listener 1',
            primaryGroupId: 'DOM_A',
            primaryGroupTitle: 'Domain A',
        });
        expect(flat.rows[0]!.secondaryGroupId).toBeUndefined();
        expect(flat.rows[0]!.secondaryGroupTitle).toBeUndefined();

        const grouped = buildSnapshotTargetIndex(
            buildProfile(
                makePack(
                    [
                        makeTarget('L1_LISTENER_RESPONDING_1', 'Listener 1'),
                        makeTarget('L1_VISUAL_PERFORMANCE_3', 'Visual 3'),
                    ],
                    { secondaryGroups: true }
                )
            ),
            'print'
        )!;
        expect(grouped.rows[0]!.secondaryGroupId).toBe('SG1');
        expect(grouped.rows[0]!.secondaryGroupTitle).toBe('Skill Area One');
        expect(grouped.rows[1]!.secondaryGroupId).toBe('SG2');
        expect(grouped.rows[1]!.secondaryGroupTitle).toBe('Skill Area Two');
    });

    it('INV-I4: index order matches authored evidence order', () => {
        const profile = buildProfile(
            makePack([
                makeTarget('L1_LISTENER_RESPONDING_1', 'First'),
                makeTarget('L1_VISUAL_PERFORMANCE_3', 'Second'),
                makeTarget('L2_INTRAVERBAL_4', 'Third'),
            ])
        );
        const index = buildSnapshotTargetIndex(profile, 'print')!;
        expect(index.rows.map((row) => row.authoredTargetId)).toEqual([
            'L1_LISTENER_RESPONDING_1',
            'L1_VISUAL_PERFORMANCE_3',
            'L2_INTRAVERBAL_4',
        ]);
        expect(profile.domains[0]!.targets.map((t) => t.targetId)).toEqual(
            index.rows.map((row) => row.authoredTargetId)
        );
    });

    it('INV-I5: print/export place index after evidence on a new page', () => {
        const profile = buildProfile(
            makePack([makeTarget('L1_LISTENER_RESPONDING_1', 'Listener 1')])
        );
        const printHtml = renderPrintHtml(profile);
        const evidenceEnd = printHtml.lastIndexOf('data-assessment-snapshot-print-page="1"');
        const indexStart = printHtml.indexOf('data-assessment-snapshot-target-index-page');
        expect(indexStart).toBeGreaterThan(evidenceEnd);
        expect(printHtml).toContain('data-assessment-snapshot-target-index-heading');

        const exportHtml = buildSnapshotExportHtml({
            profile,
            generatedAt: new Date('2026-08-01T12:00:00.000Z'),
        });
        const exportEvidence = exportHtml.lastIndexOf('data-assessment-snapshot-print-page="1"');
        const exportIndex = exportHtml.indexOf('data-assessment-snapshot-target-index-page');
        expect(exportIndex).toBeGreaterThan(exportEvidence);
    });

    it('INV-I6: PrintRenderPlan is unchanged by index presence (outside plan)', () => {
        const profile = buildProfile(
            makePack([makeTarget('L1_LISTENER_RESPONDING_1', 'Listener 1')])
        );
        const planBefore = buildPrintRenderPlan(profile, { paper: 'letter' });
        expect(buildSnapshotTargetIndex(profile, 'print')).not.toBeNull();
        const planAfter = buildPrintRenderPlan(profile, { paper: 'letter' });

        expect(JSON.stringify(planAfter)).toBe(JSON.stringify(planBefore));

        const printHtml = renderPrintHtml(profile);
        expect(printHtml).toContain(
            `data-assessment-snapshot-print-pages="${planBefore.totalPages}"`
        );
        expect(printHtml).toContain('data-assessment-snapshot-has-target-index="true"');
        expect(printHtml).toContain(
            `data-assessment-snapshot-print-page="${planBefore.totalPages + 1}"`
        );
        expect(printHtml).toContain('data-assessment-snapshot-target-index-page');

        const evidenceTargetOrder = [
            ...printHtml.matchAll(
                /data-assessment-snapshot-target-thread[^>]*data-target-id="([^"]+)"/g
            ),
        ].map((match) => match[1]);
        expect(evidenceTargetOrder).toEqual(['L1_LISTENER_RESPONDING_1']);
    });

    it('screen and print/export index content are identical when triggered', () => {
        const profile = buildProfile(
            makePack([
                makeTarget('L1_LISTENER_RESPONDING_1', 'Listener 1'),
                makeTarget('L1_MOTOR_SKILL_1', 'Motor 1'),
                makeTarget('L1_MEMORY_SKILL_1', 'Memory 1'),
            ])
        );
        const screen = buildSnapshotTargetIndex(profile, 'screen');
        const print = buildSnapshotTargetIndex(profile, 'print');
        expect(screen).toEqual(print);
    });

    it('export HTML carries index via shared print document (no export-only path)', () => {
        const profile = buildProfile(
            makePack([makeTarget('L1_LISTENER_RESPONDING_1', 'Listener 1')])
        );
        const printHtml = renderPrintHtml(profile);
        const exportHtml = buildSnapshotExportHtml({
            profile,
            generatedAt: new Date('2026-08-01T12:00:00.000Z'),
        });

        expect(exportHtml).toContain('data-assessment-snapshot-print-document');
        expect(exportHtml).toContain('data-assessment-snapshot-target-index-page');
        expect(exportHtml).toContain('data-assessment-snapshot-target-index-row');
        // Index lives inside the print document body (after evidence pages), not a
        // parallel export-only serializer — CSS may mention the attribute earlier.
        const bodyStart = exportHtml.indexOf('<body');
        const printDocInBody = exportHtml.indexOf(
            'data-assessment-snapshot-print-document',
            bodyStart
        );
        const indexInBody = exportHtml.indexOf(
            'data-assessment-snapshot-target-index-page',
            bodyStart
        );
        expect(printDocInBody).toBeGreaterThan(bodyStart);
        expect(indexInBody).toBeGreaterThan(printDocInBody);
        expect(printHtml).toContain('data-assessment-snapshot-target-index-page');
        expect(exportHtml).not.toMatch(/https?:\/\//i);
        expect(exportHtml).not.toMatch(/<link\s[^>]*rel=["']stylesheet["']/i);
        expect(exportHtml).not.toMatch(/<script\s[^>]*src=/i);
    });
});
