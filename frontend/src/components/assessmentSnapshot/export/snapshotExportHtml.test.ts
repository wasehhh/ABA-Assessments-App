import { describe, expect, it, vi, afterEach } from 'vitest';
import { ContentPackData, Target } from '../../../types';
import { buildLearnerMapProfile } from '../../../services/learnerMapProfile';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { resolveEffectiveScoring } from '../../../utils/effectiveScoring';
import { auditService } from '../../../services/audit';
import { logClinicalExportAudit } from '../../../clinicalExport/clinicalExportAudit';
import {
    buildSnapshotExportHtml,
    downloadSnapshotExportHtml,
} from './snapshotExportHtml';

function makeTarget(targetId: string, scale: number[], title?: string): Target {
    return {
        target_id: targetId,
        title: title ?? targetId,
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
    title: string,
    scale?: number[]
): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title,
        description: '',
        version: '1.0',
        domains: [
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: targets.map((target) =>
                    scale
                        ? {
                              ...target,
                              scoring: {
                                  type: 'numeric' as const,
                                  scale,
                                  scale_labels: {},
                                  no_opportunity_allowed: true,
                              },
                          }
                        : target
                ),
            },
        ],
    };
}

function buildHtmlForPack(pack: ContentPackData, scores: number | null = 0.5) {
    const learnerMapProfile = buildLearnerMapProfile({
        assessment: {
            id: 'assess-export',
            pack_snapshot: pack,
        },
        cycles: [
            {
                cycle: { id: 'c1', cycle_number: 1, status: 'locked' },
                scores:
                    scores === null
                        ? []
                        : [
                              {
                                  id: 's1',
                                  assessment_id: 'assess-export',
                                  assessment_cycle_id: 'c1',
                                  client_id: 'cl',
                                  pack_snapshot_id: 'p',
                                  target_id: pack.domains[0].targets[0].target_id,
                                  domain_id: 'A',
                                  score: scores,
                                  note: null,
                                  evidence_files: [],
                                  assessor_user_id: 'u',
                                  scored_at: '',
                                  created_at: '',
                                  updated_at: '',
                              },
                          ],
            },
        ],
        generatedAt: new Date('2026-08-01T12:00:00.000Z'),
    });

    return buildSnapshotExportHtml({
        profile: buildAssessmentSnapshotProfile(learnerMapProfile),
        displayContext: {
            learnerName: 'Learner',
            assessmentName: pack.title,
            organizationName: 'Org',
        },
        generatedAt: new Date('2026-08-01T12:00:00.000Z'),
    });
}

describe('snapshotExportHtml Target Threads geometry', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('serializes AssessmentSnapshotPrintDocument Target Threads, not a score table', () => {
        const pack = makePack(
            [makeTarget('T1', [0, 0.5, 1]), makeTarget('T2', [0, 0.5, 1])],
            'Threads Pack',
            [0, 0.5, 1]
        );
        const html = buildHtmlForPack(pack, 0.5);

        expect(html).toContain('data-assessment-snapshot-print-document');
        expect(html).toContain('data-assessment-snapshot-target-thread');
        expect(html).toContain('data-assessment-snapshot-evidence-bead');
        expect(html).toContain('data-assessment-snapshot-legend');
        expect(html).toContain('data-export-mode="full"');
        // Score-sheet fork is forbidden; Target Index table (§6) is allowed when triggered.
        expect(html).not.toMatch(/<th scope="col">Cycle/i);
        expect(html).not.toMatch(/data-assessment-snapshot-score-sheet/i);
    });

    it('includes every target exactly once', () => {
        const pack = makePack(
            [
                makeTarget('ALPHA', [0, 1, 2, 3, 4]),
                makeTarget('BETA', [0, 1, 2, 3, 4]),
                makeTarget('GAMMA', [0, 1, 2, 3, 4]),
            ],
            'Multi',
            [0, 1, 2, 3, 4]
        );
        const html = buildHtmlForPack(pack, 2);
        const targetIds = [
            ...html.matchAll(
                /data-assessment-snapshot-target-thread[^>]*data-target-id="([^"]+)"/g
            ),
        ].map((match) => match[1]);
        expect(new Set(targetIds).size).toBe(3);
        expect(targetIds).toEqual(['ALPHA', 'BETA', 'GAMMA']);
    });

    it('embeds no external stylesheet, script, or http(s) asset URLs', () => {
        const pack = makePack([makeTarget('T1', [0, 1])], 'Offline', [0, 1]);
        const html = buildHtmlForPack(pack, 1);

        expect(html).not.toMatch(/<link\s[^>]*rel=["']stylesheet["']/i);
        expect(html).not.toMatch(/<script\s[^>]*src=/i);
        expect(html).not.toMatch(/https?:\/\//i);
        expect(html).toContain('<style>');
    });

    it('omits §4.2 interpretive / movement / coverage chrome', () => {
        const pack = makePack([makeTarget('T1', [0, 1, 2, 3, 4])], 'Evidence', [0, 1, 2, 3, 4]);
        const html = buildHtmlForPack(pack, 3).toLowerCase();

        expect(html).not.toContain('coverage');
        expect(html).not.toContain('recommendation');
        expect(html).not.toContain('movement');
        expect(html).not.toContain('domain competency');
        expect(html).not.toContain('percent');
    });

    it('G8: reflects frozen pack_snapshot scale, not live pack', () => {
        const frozenSnapshot = makePack(
            [makeTarget('T1', [0, 0.5, 1])],
            'Frozen Pack',
            [0, 0.5, 1]
        );
        const livePack = makePack([makeTarget('T1', [0, 1, 2, 3, 4])], 'Live Pack', [
            0, 1, 2, 3, 4,
        ]);

        const html = buildHtmlForPack(frozenSnapshot, 0.5);
        const frozenEffective = resolveEffectiveScoring(
            frozenSnapshot.domains[0].targets[0],
            frozenSnapshot
        );
        const liveEffective = resolveEffectiveScoring(
            livePack.domains[0].targets[0],
            livePack
        );

        expect(frozenEffective.maxScore).toBe(1);
        expect(liveEffective.maxScore).toBe(4);
        expect(html).toContain('data-raw-score="0.5"');
        expect(html).toContain('0.5/1');
        expect(html).not.toContain('0.5/4');
    });

    it('completes HTML download even when audit logging fails', () => {
        vi.spyOn(auditService, 'log').mockImplementation(() => {
            throw new Error('audit unavailable');
        });

        const click = vi.fn();
        const remove = vi.fn();
        const anchor = {
            click,
            remove,
            href: '',
            download: '',
            rel: '',
        };
        const createObjectURL = vi.fn(() => 'blob:mock');
        const revokeObjectURL = vi.fn();
        const appendChild = vi.fn((node: unknown) => node);

        vi.stubGlobal('URL', {
            createObjectURL,
            revokeObjectURL,
        });
        vi.stubGlobal('document', {
            createElement: (tag: string) => {
                if (tag === 'a') {
                    return anchor;
                }
                throw new Error(`unexpected createElement(${tag})`);
            },
            body: { appendChild },
        });

        const pack = makePack([makeTarget('T1', [0, 1])], 'AuditFail', [0, 1]);
        const html = buildHtmlForPack(pack, 1);

        expect(() => {
            downloadSnapshotExportHtml(html, 'test.html');
            logClinicalExportAudit({
                orgId: 'org-1',
                userId: 'user-1',
                assessmentId: 'assess-1',
                artifact: 'snapshot',
                channel: 'export',
                mode: 'full',
                event: 'html_export',
            });
        }).not.toThrow();

        expect(createObjectURL).toHaveBeenCalled();
        expect(click).toHaveBeenCalled();
        expect(remove).toHaveBeenCalled();

        vi.unstubAllGlobals();
    });
});
