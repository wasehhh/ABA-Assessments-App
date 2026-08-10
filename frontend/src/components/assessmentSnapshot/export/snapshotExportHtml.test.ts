import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ContentPackData, Target } from '../../../types';
import { buildLearnerMapProfile } from '../../../services/learnerMapProfile';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { resolveEffectiveScoring } from '../../../utils/effectiveScoring';
import { SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM } from '../../../utils/snapshotLayoutEngine';
import { buildTargetIndexScreenTableColumnCss } from '../../../utils/snapshotTargetIndexColumns';
import { auditService } from '../../../services/audit';
import { logClinicalExportAudit } from '../../../clinicalExport/clinicalExportAudit';
import { getAssessmentSnapshotStressScenario } from '../../../pages/dev/assessmentSnapshotMockData';
import { buildSnapshotTargetIndex } from '../v1/snapshotTargetIndex';
import { SNAPSHOT_EXPORT_INLINE_CSS } from './snapshotExportInlineCss';
import * as snapshotExportHtmlModule from './snapshotExportHtml';
import {
    buildSnapshotExportHtml,
    downloadSnapshotExportHtml,
    downloadSnapshotHtmlChannel,
    SNAPSHOT_HTML_EXPORT_VIEWPORT_REM,
} from './snapshotExportHtml';

/**
 * Structural class hooks used for DOM / data pairing without dedicated CSS rules.
 * Appearance still comes from sibling Tailwind utilities on the same elements.
 */
const SNAPSHOT_EXPORT_STRUCTURAL_CLASS_ALLOWLIST = new Set([
    'assessment-snapshot-domain-grid',
    'assessment-snapshot-primary-chapter',
    'assessment-snapshot-domain-zone-header',
    'assessment-snapshot-count-band',
    'assessment-snapshot-count-band--compact',
    'assessment-snapshot-count-band--standard',
    'assessment-snapshot-count-band--dense',
    'assessment-snapshot-cycle-band',
    'assessment-snapshot-cycle-band--compact',
    'assessment-snapshot-cycle-band--standard',
    'assessment-snapshot-cycle-band--dense',
    'assessment-snapshot-title-band--compact',
    'assessment-snapshot-title-band--standard',
    'assessment-snapshot-title-band--dense',
]);

function escapeCssIdent(ident: string): string {
    return ident.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}

function cssHasClassSelector(css: string, className: string): boolean {
    const token = `.${escapeCssIdent(className)}`;
    let start = 0;
    while (start < css.length) {
        const index = css.indexOf(token, start);
        if (index === -1) {
            return false;
        }
        const next = css[index + token.length];
        if (next === undefined || !/[a-zA-Z0-9_-]/.test(next)) {
            return true;
        }
        start = index + 1;
    }
    return false;
}

function extractExportClassNames(html: string): string[] {
    const classes = new Set<string>();
    for (const match of html.matchAll(/\bclass="([^"]*)"/g)) {
        for (const token of match[1].split(/\s+/).filter(Boolean)) {
            classes.add(token);
        }
    }
    return [...classes].sort();
}

function extractInlineStylesheet(html: string): string {
    const match = html.match(/<style>([\s\S]*?)<\/style>/i);
    expect(match).not.toBeNull();
    return match![1];
}

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

/** Strip inline scripts to simulate mail-gateway / JS-disabled reading. */
function htmlWithoutScripts(html: string): string {
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}

function clinicExportInput() {
    const scenario = getAssessmentSnapshotStressScenario('clinic-index-544');
    const profile = buildAssessmentSnapshotProfile(scenario.profile);
    return {
        profile,
        generatedAt: new Date('2026-08-01T12:00:00.000Z'),
        assessmentId: 'clinic-index-544',
    };
}

function assertIndexRowsVisibleWithoutScript(html: string, expectedIds: string[]) {
    const degraded = htmlWithoutScripts(html);
    const body = degraded.slice(degraded.indexOf('<body'));

    expect(body).toContain('data-expanded="true"');
    expect(body).not.toMatch(
        /data-assessment-snapshot-target-index-panel[^>]*\bhidden\b/
    );
    expect(body).not.toMatch(
        /data-assessment-snapshot-target-index-panel[^>]*aria-hidden=["']true["']/
    );
    expect(body).not.toMatch(
        /data-assessment-snapshot-target-index-panel[^>]*style=["'][^"']*display\s*:\s*none/
    );

    const indexIds = [
        ...body.matchAll(
            /data-assessment-snapshot-target-index-row[^>]*data-target-id="([^"]+)"/g
        ),
    ].map((match) => match[1]);
    expect(indexIds).toHaveLength(expectedIds.length);
    expect(indexIds).toEqual(expectedIds);
}

function captureHtmlDownload(run: () => string): string {
    let captured = '';
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
        styleSheets: [
            // Simulate live stylesheets that omit screen index geometry —
            // download must ignore these and use inlined constants.
            {
                cssRules: [
                    {
                        cssText:
                            '.assessment-snapshot-print { color: #000; } /* live, incomplete */',
                    },
                ],
            },
        ],
    });

    try {
        captured = run();
        expect(createObjectURL).toHaveBeenCalled();
        expect(click).toHaveBeenCalled();
    } finally {
        vi.unstubAllGlobals();
    }

    return captured;
}

describe('snapshotExportHtml Target Threads geometry', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('serializes screen document Target Threads at frozen viewport, not print plan', () => {
        const pack = makePack(
            [makeTarget('T1', [0, 0.5, 1]), makeTarget('T2', [0, 0.5, 1])],
            'Threads Pack',
            [0, 0.5, 1]
        );
        const html = buildHtmlForPack(pack, 0.5);

        expect(SNAPSHOT_HTML_EXPORT_VIEWPORT_REM).toBe(SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM);
        expect(html).toContain('data-assessment-snapshot-screen-document');
        expect(html).toContain(
            `data-assessment-snapshot-screen-viewport-rem="${SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM}"`
        );
        expect(html).toContain('data-assessment-snapshot-target-thread');
        expect(html).toContain('data-assessment-snapshot-evidence-bead');
        expect(html).toContain('data-assessment-snapshot-legend');
        expect(html).toContain('data-export-mode="full"');
        expect(html).toContain('data-export-channel="html"');
        const body = html.slice(html.indexOf('<body'));
        expect(body).not.toContain('data-assessment-snapshot-print-document');
        expect(body).not.toContain('data-assessment-snapshot-print-page');
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

    it('is self-contained: no external script/stylesheet/http(s) assets; inline script permitted', () => {
        const pack = makePack([makeTarget('T1', [0, 1])], 'Offline', [0, 1]);
        const html = buildHtmlForPack(pack, 1);

        expect(html).not.toMatch(/<link\s[^>]*rel=["']stylesheet["']/i);
        expect(html).not.toMatch(/<script\s[^>]*src=/i);
        expect(html).not.toMatch(/https?:\/\//i);
        expect(html).toContain('<style>');
        const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(
            (match) => match[1] ?? ''
        );
        expect(inlineScripts.length).toBeGreaterThan(0);
        expect(inlineScripts.some((script) => script.includes('evidence-bead'))).toBe(true);
    });

    it('inlines screen index geometry CSS (no live stylesheet collection)', () => {
        const { profile, generatedAt } = clinicExportInput();
        const html = buildSnapshotExportHtml({ profile, generatedAt });
        const screenCss = buildTargetIndexScreenTableColumnCss();

        expect(SNAPSHOT_EXPORT_INLINE_CSS).toContain(screenCss);
        expect(html).toContain(screenCss);
        expect(html).toContain('table-layout: fixed');
        expect(html).toContain('overflow-wrap: anywhere');
        expect(html).toContain(
            '.assessment-snapshot-export-html [data-assessment-snapshot-target-index-table]'
        );
    });

    it('inlines compiled Tailwind layout utilities used by the screen document', () => {
        const { profile, generatedAt } = clinicExportInput();
        const css = extractInlineStylesheet(
            buildSnapshotExportHtml({ profile, generatedAt })
        );

        // Legend: flex flex-wrap items-center gap-x-4
        expect(css).toMatch(/\.flex\s*\{/);
        expect(css).toMatch(/\.flex-wrap\s*\{/);
        expect(css).toMatch(/\.items-center\s*\{/);
        expect(css).toContain('.gap-x-4');

        // Domain / thread rows: items-baseline gap-x-3 space-y-10 mb-4 text-base
        expect(css).toMatch(/\.items-baseline\s*\{/);
        expect(css).toContain('.gap-x-3');
        expect(css).toContain('.space-y-10');
        expect(css).toMatch(/\.mb-4\s*\{/);
        expect(css).toMatch(/\.text-base\s*\{/);
    });

    it('class-coverage: every markup class has a matching inlined CSS rule (except structural allowlist)', () => {
        const { profile, generatedAt } = clinicExportInput();
        const html = buildSnapshotExportHtml({ profile, generatedAt });
        const css = extractInlineStylesheet(html);
        const classNames = extractExportClassNames(html);

        expect(classNames.length).toBeGreaterThan(50);

        const uncovered = classNames.filter(
            (className) =>
                !SNAPSHOT_EXPORT_STRUCTURAL_CLASS_ALLOWLIST.has(className) &&
                !cssHasClassSelector(css, className)
        );

        expect(uncovered).toEqual([]);
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

    it('degrades without scripts: clinic index rows and bead scores remain readable', () => {
        const { profile, generatedAt } = clinicExportInput();
        const index = buildSnapshotTargetIndex(profile);
        expect(index).not.toBeNull();
        expect(index!.rows.length).toBe(544);

        const html = buildSnapshotExportHtml({ profile, generatedAt });
        const degraded = htmlWithoutScripts(html);
        const degradedBody = degraded.slice(degraded.indexOf('<body'));

        expect(degraded).not.toMatch(/<script\b/i);
        assertIndexRowsVisibleWithoutScript(
            html,
            index!.rows.map((row) => row.authoredTargetId)
        );

        const evidenceIds = [
            ...degradedBody.matchAll(
                /data-assessment-snapshot-target-thread[^>]*data-target-id="([^"]+)"/g
            ),
        ].map((match) => match[1]);
        expect(evidenceIds).toHaveLength(544);
        expect(new Set(evidenceIds).size).toBe(544);
        expect(degradedBody).toMatch(/data-assessment-snapshot-evidence-bead[^>]*>[^<]+</);
        expect(degradedBody).toContain('data-raw-score');
    });

    it('download path ignores collapsed preview DOM: all 544 index rows stay visible without script', () => {
        const { profile, generatedAt, assessmentId } = clinicExportInput();
        const index = buildSnapshotTargetIndex(profile)!;
        expect(index.rows).toHaveLength(544);

        // What the live preview would look like after collapse (old mounted path
        // would bake this into the download via outerHTML).
        const collapsedPreviewOuterHtml = `
          <div data-assessment-snapshot-screen-document>
            <div data-assessment-snapshot-target-index-screen data-expanded="false">
              <button data-assessment-snapshot-target-index-heading aria-expanded="false">Target index</button>
              <div data-assessment-snapshot-target-index-panel hidden aria-hidden="true" style="display:none"></div>
            </div>
          </div>
        `;
        expect(collapsedPreviewOuterHtml).toMatch(
            /data-assessment-snapshot-target-index-panel[^>]*\bhidden\b/
        );

        // Real export-page download entry — must not read the collapsed preview.
        const exported = captureHtmlDownload(() =>
            downloadSnapshotHtmlChannel({ profile, generatedAt }, assessmentId)
        );

        assertIndexRowsVisibleWithoutScript(
            exported,
            index.rows.map((row) => row.authoredTargetId)
        );
        expect(exported).not.toContain('data-expanded="false"');
        expect(exported).not.toContain(collapsedPreviewOuterHtml.trim());
        // Guard: incomplete live stylesheets must not become the export stylesheet.
        expect(exported).not.toContain('live, incomplete');
        expect(exported).toContain(buildTargetIndexScreenTableColumnCss());
    });

    it('exported HTML is byte-identical across repeats and independent of live UI state', () => {
        const { profile, generatedAt, assessmentId } = clinicExportInput();
        const input = { profile, generatedAt };

        const a = buildSnapshotExportHtml(input);
        const b = buildSnapshotExportHtml(input);
        expect(a).toBe(b);

        const afterCollapseSim = captureHtmlDownload(() =>
            downloadSnapshotHtmlChannel(input, assessmentId)
        );
        const afterAgain = captureHtmlDownload(() =>
            downloadSnapshotHtmlChannel(input, assessmentId)
        );
        expect(afterCollapseSim).toBe(a);
        expect(afterAgain).toBe(a);
    });

    it('buildSnapshotExportHtmlFromMountedRoot and collectAccessibleStylesheetText no longer exist', () => {
        expect(
            Object.prototype.hasOwnProperty.call(
                snapshotExportHtmlModule,
                'buildSnapshotExportHtmlFromMountedRoot'
            )
        ).toBe(false);
        expect(
            Object.prototype.hasOwnProperty.call(
                snapshotExportHtmlModule,
                'collectAccessibleStylesheetText'
            )
        ).toBe(false);

        const moduleSource = readFileSync(
            resolve(__dirname, './snapshotExportHtml.ts'),
            'utf8'
        );
        const pageSource = readFileSync(
            resolve(__dirname, '../../../pages/AssessmentSnapshotExport.tsx'),
            'utf8'
        );
        expect(moduleSource).not.toContain('buildSnapshotExportHtmlFromMountedRoot');
        expect(moduleSource).not.toContain('collectAccessibleStylesheetText');
        expect(pageSource).not.toContain('buildSnapshotExportHtmlFromMountedRoot');
        expect(pageSource).toContain('downloadSnapshotHtmlChannel');
    });

    it('completes HTML download even when audit logging fails', () => {
        vi.spyOn(auditService, 'log').mockImplementation(() => {
            throw new Error('audit unavailable');
        });

        const pack = makePack([makeTarget('T1', [0, 1])], 'AuditFail', [0, 1]);
        const html = buildHtmlForPack(pack, 1);

        expect(() => {
            captureHtmlDownload(() => {
                downloadSnapshotExportHtml(html, 'test.html');
                return html;
            });
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
    });
});
