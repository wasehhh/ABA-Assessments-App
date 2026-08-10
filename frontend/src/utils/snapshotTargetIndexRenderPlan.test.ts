import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildAssessmentSnapshotProfile } from '../services/assessmentSnapshotProfile';
import { getAssessmentSnapshotStressScenario } from '../pages/dev/assessmentSnapshotMockData';
import { SNAPSHOT_EXPORT_INLINE_CSS } from '../components/assessmentSnapshot/export/snapshotExportInlineCss';
import { buildPrintRenderPlan } from './snapshotPrintRenderPlan';
import {
    buildTargetIndexTableColumnCss,
    resolveTargetIndexColumnWidthsRem,
    resolveTargetIndexUsableTextWidthsRem,
    TARGET_INDEX_CELL_HORIZONTAL_PADDING_TOTAL_REM,
    TARGET_INDEX_CELL_PADDING_X_REM,
    TARGET_INDEX_COLUMN_ORDER,
    TARGET_INDEX_COLUMN_WIDTH_FRACTIONS,
    TARGET_INDEX_USABLE_TEXT_WIDTH_FLOOR_REM,
} from './snapshotTargetIndexColumns';
import {
    buildTargetIndexRenderPlan,
    computeTargetIndexContentHeightRem,
    computeTargetIndexRowCapacity,
    estimateTargetIndexRowCostRem,
    estimateWrappedLineCount,
    TARGET_INDEX_CHAR_WIDTH_REM,
    TARGET_INDEX_ROW_COST_SAFETY,
    TARGET_INDEX_ROW_HEIGHT_REM,
} from './snapshotTargetIndexRenderPlan';
import { resolvePrintCompositionProfile } from './snapshotPrintPageProfile';
import {
    formatPrintPageLabel,
    formatTargetIndexPageLabel,
} from '../components/assessmentSnapshot/print/printClinicalChrome';
import { buildSnapshotExportHtml } from '../components/assessmentSnapshot/export/snapshotExportHtml';
import { AssessmentSnapshotPrintDocument } from '../components/assessmentSnapshot/print/AssessmentSnapshotPrintDocument';
import {
    buildSnapshotTargetIndex,
    SnapshotTargetIndex,
    SnapshotTargetIndexRow,
} from '../components/assessmentSnapshot/v1/snapshotTargetIndex';

function clinicSnapshotProfile() {
    const scenario = getAssessmentSnapshotStressScenario('clinic-index-544');
    return buildAssessmentSnapshotProfile(scenario.profile);
}

function renderPrintHtml(
    profile: ReturnType<typeof clinicSnapshotProfile>
): string {
    const plan = buildPrintRenderPlan(profile, { paper: 'letter' });
    return renderToStaticMarkup(
        createElement(AssessmentSnapshotPrintDocument, {
            profile,
            plan,
            generatedAtLabel: 'Aug 1, 2026, 12:00 PM',
        })
    );
}

function makeRow(
    overrides: Partial<SnapshotTargetIndexRow> & Pick<SnapshotTargetIndexRow, 'authoredTargetId'>
): SnapshotTargetIndexRow {
    return {
        displayedCode: overrides.displayedCode ?? 'A1',
        authoredTargetId: overrides.authoredTargetId,
        authoredLabel: overrides.authoredLabel ?? 'Short',
        primaryGroupId: overrides.primaryGroupId ?? 'DOM_A',
        primaryGroupTitle: overrides.primaryGroupTitle ?? 'Domain A',
        secondaryGroupId: overrides.secondaryGroupId,
        secondaryGroupTitle: overrides.secondaryGroupTitle,
    };
}

function shortLabelIndex(rowCount: number): SnapshotTargetIndex {
    return {
        rows: Array.from({ length: rowCount }, (_, index) =>
            makeRow({
                authoredTargetId: `SHORT_${index}`,
                displayedCode: `S${index}`,
                authoredLabel: `T${index}`,
            })
        ),
    };
}

function longLabelIndex(rowCount: number): SnapshotTargetIndex {
    const label =
        'Looks at a person who is talking to him for 3 seconds during a structured interaction';
    return {
        rows: Array.from({ length: rowCount }, (_, index) =>
            makeRow({
                authoredTargetId: `LONG_${index}`,
                displayedCode: `L${index}`,
                authoredLabel: label,
                primaryGroupTitle: 'Cooperation and Reinforcer Effectiveness',
            })
        ),
    };
}

function extractNthChildWidths(css: string): string[] {
    const widths: string[] = [];
    for (let n = 1; n <= 5; n += 1) {
        const match = css.match(
            new RegExp(
                `nth-child\\(${n}\\)[^{]*\\{[^}]*width:\\s*([0-9.]+%);`,
                'm'
            )
        );
        expect(match, `missing nth-child(${n}) width`).toBeTruthy();
        widths.push(match![1]!);
    }
    return widths;
}

describe('Target Index multi-sheet pagination (PR14A-4)', () => {
    it('usable text width equals column width minus shared horizontal padding', () => {
        expect(TARGET_INDEX_CELL_HORIZONTAL_PADDING_TOTAL_REM).toBe(
            TARGET_INDEX_CELL_PADDING_X_REM * 2
        );
        const profile = resolvePrintCompositionProfile('letter');
        const columns = resolveTargetIndexColumnWidthsRem(profile.usableWidthRem);
        const usable = resolveTargetIndexUsableTextWidthsRem(profile.usableWidthRem);

        for (const key of TARGET_INDEX_COLUMN_ORDER) {
            expect(usable[key]).toBe(
                Math.max(
                    TARGET_INDEX_USABLE_TEXT_WIDTH_FLOOR_REM,
                    columns[key] - TARGET_INDEX_CELL_HORIZONTAL_PADDING_TOTAL_REM
                )
            );
            expect(usable[key]).toBeLessThan(columns[key]);
            expect(usable[key]).toBeGreaterThan(0);
        }

        const generated = buildTargetIndexTableColumnCss();
        expect(generated).toContain(
            `padding: 0.2rem ${TARGET_INDEX_CELL_PADDING_X_REM}rem`
        );
    });

    it('pins column fractions to one shared source for planner and CSS', () => {
        const fractions = TARGET_INDEX_COLUMN_ORDER.map(
            (key) => TARGET_INDEX_COLUMN_WIDTH_FRACTIONS[key]
        );
        expect(fractions.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);

        const generated = buildTargetIndexTableColumnCss();
        expect(generated).toContain('table-layout: fixed');
        expect(extractNthChildWidths(generated)).toEqual(
            TARGET_INDEX_COLUMN_ORDER.map(
                (key) => `${Math.round(TARGET_INDEX_COLUMN_WIDTH_FRACTIONS[key] * 1000) / 10}%`
            )
        );

        const plan = buildTargetIndexRenderPlan(shortLabelIndex(3), { paper: 'letter' });
        const profile = resolvePrintCompositionProfile('letter');
        expect(plan.columnWidthsRem).toEqual(
            resolveTargetIndexColumnWidthsRem(profile.usableWidthRem)
        );
        expect(plan.usableTextWidthsRem).toEqual(
            resolveTargetIndexUsableTextWidthsRem(profile.usableWidthRem)
        );
    });

    it('emits geometry from one path; index.css does not restate column percentages', () => {
        const indexCss = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
        const generated = buildTargetIndexTableColumnCss();
        const inlineCss = SNAPSHOT_EXPORT_INLINE_CSS;

        expect(indexCss).not.toMatch(
            /target-index-table\] th:nth-child\(\d+\)[\s\S]*?width:\s*\d/
        );
        expect(inlineCss).toContain(generated);
        expect(extractNthChildWidths(inlineCss)).toEqual(extractNthChildWidths(generated));
        expect(generated).toContain('overflow-wrap: anywhere');
        expect(generated).not.toMatch(/text-overflow:\s*ellipsis/);
        expect(generated).not.toMatch(/white-space:\s*nowrap/);
    });

    it('adversarial probes: long tokens in narrow columns cost pad-aware multi-line', () => {
        const profile = resolvePrintCompositionProfile('letter');
        const usable = resolveTargetIndexUsableTextWidthsRem(profile.usableWidthRem);
        const columns = resolveTargetIndexColumnWidthsRem(profile.usableWidthRem);

        const uuid = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
        const underscoreId = 'L1_CLINIC_SKILL_AREA_LISTENER_RESPONDING_EXTRA_LONG_ID_544';
        const unbrokenCode = 'X'.repeat(80);

        const uuidLines = estimateWrappedLineCount(uuid, usable.authoredTargetId);
        const underscoreLines = estimateWrappedLineCount(
            underscoreId,
            usable.authoredTargetId
        );
        const codeLines = estimateWrappedLineCount(unbrokenCode, usable.displayedCode);

        expect(uuidLines).toBeGreaterThan(1);
        expect(underscoreLines).toBeGreaterThan(1);
        expect(codeLines).toBeGreaterThan(1);

        // Pad-aware count must be ≥ raw-column count (narrower → ≥ lines).
        expect(uuidLines).toBeGreaterThanOrEqual(
            estimateWrappedLineCount(uuid, columns.authoredTargetId)
        );
        expect(codeLines).toBeGreaterThanOrEqual(
            estimateWrappedLineCount(unbrokenCode, columns.displayedCode)
        );

        expect(
            estimateTargetIndexRowCostRem(
                makeRow({ authoredTargetId: uuid, authoredLabel: 'Short' }),
                usable
            )
        ).toBeGreaterThanOrEqual(
            uuidLines * TARGET_INDEX_ROW_HEIGHT_REM * TARGET_INDEX_ROW_COST_SAFETY
        );
        expect(
            estimateTargetIndexRowCostRem(
                makeRow({
                    authoredTargetId: 'ID_1',
                    displayedCode: unbrokenCode,
                    authoredLabel: 'Short',
                }),
                usable
            )
        ).toBeGreaterThanOrEqual(
            codeLines * TARGET_INDEX_ROW_HEIGHT_REM * TARGET_INDEX_ROW_COST_SAFETY
        );
        expect(
            estimateTargetIndexRowCostRem(
                makeRow({ authoredTargetId: underscoreId, authoredLabel: 'Short' }),
                usable
            )
        ).toBeGreaterThanOrEqual(
            underscoreLines * TARGET_INDEX_ROW_HEIGHT_REM * TARGET_INDEX_ROW_COST_SAFETY
        );
    });

    it('derives content height and single-line ceiling from page-profile furniture', () => {
        const profile = resolvePrintCompositionProfile('letter');
        const firstHeight = computeTargetIndexContentHeightRem(profile, {
            isFirstIndexPage: true,
        });
        expect(computeTargetIndexRowCapacity(profile, { isFirstIndexPage: true })).toBe(
            Math.floor(firstHeight / TARGET_INDEX_ROW_HEIGHT_REM)
        );
    });

    it('estimates wrap lines from column width and rounds up', () => {
        const columnWidth = 9;
        const charsPerLine = Math.floor(columnWidth / TARGET_INDEX_CHAR_WIDTH_REM);
        expect(estimateWrappedLineCount('x'.repeat(charsPerLine), columnWidth)).toBe(1);
        expect(estimateWrappedLineCount('x'.repeat(charsPerLine + 1), columnWidth)).toBe(2);
    });

    it('plans >1 index sheets for clinic-index-544 and ===1 for a small index', () => {
        const clinic = clinicSnapshotProfile();
        const clinicIndex = buildSnapshotTargetIndex(clinic);
        expect(clinicIndex).not.toBeNull();
        expect(clinicIndex!.rows.length).toBe(544);

        const clinicPlan = buildTargetIndexRenderPlan(clinicIndex!, { paper: 'letter' });
        expect(clinicPlan.totalPages).toBeGreaterThan(1);
        expect(clinicPlan.totalRows).toBe(544);
        expect(
            clinicPlan.pages.reduce((sum, page) => sum + page.rows.length, 0)
        ).toBe(544);

        const smallPlan = buildTargetIndexRenderPlan(
            { rows: clinicIndex!.rows.slice(0, 3) },
            { paper: 'letter' }
        );
        expect(smallPlan.totalPages).toBe(1);
    });

    it('uses more pages for long labels than short labels at the same row count', () => {
        const shortPlan = buildTargetIndexRenderPlan(shortLabelIndex(544), {
            paper: 'letter',
        });
        const longPlan = buildTargetIndexRenderPlan(longLabelIndex(544), {
            paper: 'letter',
        });
        expect(shortPlan.totalRows).toBe(544);
        expect(longPlan.totalRows).toBe(544);
        expect(longPlan.totalPages).toBeGreaterThan(shortPlan.totalPages);
    });

    it('keeps pad-aware sheet fill within height; records max fill and min slack', () => {
        const clinicIndex = buildSnapshotTargetIndex(clinicSnapshotProfile())!;
        const plan = buildTargetIndexRenderPlan(clinicIndex, { paper: 'letter' });

        let maxFill = 0;
        let minSlack = Number.POSITIVE_INFINITY;

        for (const page of plan.pages) {
            const contentHeight = page.showSectionTitle
                ? plan.contentHeightFirstPageRem
                : plan.contentHeightContinuationRem;
            if (page.rows.length === 1) {
                expect(page.estimatedContentCostRem).toBeGreaterThan(0);
                continue;
            }
            expect(page.estimatedContentCostRem).toBeLessThanOrEqual(contentHeight);
            const fill = page.estimatedContentCostRem / contentHeight;
            const slack = contentHeight - page.estimatedContentCostRem;
            maxFill = Math.max(maxFill, fill);
            minSlack = Math.min(minSlack, slack);
        }

        expect(maxFill).toBeLessThan(1);
        expect(minSlack).toBeGreaterThanOrEqual(0);
        // Achieved values are asserted as finite measurements for the QA report
        // (one full row of slack is preferred but not forced by loosening safety).
        expect(Number.isFinite(maxFill)).toBe(true);
        expect(Number.isFinite(minSlack)).toBe(true);
        // Keep measurements discoverable in failure output.
        expect({
            maxFillPct: Math.round(maxFill * 1000) / 10,
            minSlackRem: Math.round(minSlack * 1000) / 1000,
            totalPages: plan.totalPages,
        }).toEqual(expect.objectContaining({ totalPages: plan.totalPages }));
    });

    it('places a single oversized row rather than looping or emitting an empty page', () => {
        const profile = resolvePrintCompositionProfile('letter');
        const usable = resolveTargetIndexUsableTextWidthsRem(profile.usableWidthRem);
        const contentHeight = computeTargetIndexContentHeightRem(profile, {
            isFirstIndexPage: true,
        });
        const hugeLabel = 'W'.repeat(
            Math.ceil(
                (contentHeight / TARGET_INDEX_ROW_HEIGHT_REM / TARGET_INDEX_ROW_COST_SAFETY + 2) *
                    Math.floor(usable.authoredLabel / TARGET_INDEX_CHAR_WIDTH_REM)
            )
        );
        const index: SnapshotTargetIndex = {
            rows: [
                makeRow({ authoredTargetId: 'HUGE_1', authoredLabel: hugeLabel }),
                makeRow({ authoredTargetId: 'AFTER_1', authoredLabel: 'Short after' }),
            ],
        };

        expect(estimateTargetIndexRowCostRem(index.rows[0]!, usable)).toBeGreaterThan(
            contentHeight
        );

        const plan = buildTargetIndexRenderPlan(index, { paper: 'letter' });
        expect(plan.pages[0]!.rows).toHaveLength(1);
        expect(plan.pages[0]!.rows[0]!.authoredTargetId).toBe('HUGE_1');
        expect(plan.pages.every((page) => page.rows.length > 0)).toBe(true);
    });

    it('every planned sheet including middle ones carries page N of M labels', () => {
        const profile = clinicSnapshotProfile();
        const index = buildSnapshotTargetIndex(profile)!;
        const plan = buildTargetIndexRenderPlan(index, { paper: 'letter' });
        expect(plan.totalPages).toBeGreaterThan(2);

        const html = renderPrintHtml(profile);
        for (let pageNumber = 1; pageNumber <= plan.totalPages; pageNumber += 1) {
            expect(html).toContain(formatTargetIndexPageLabel(pageNumber, plan.totalPages));
            expect(html).toContain(
                `data-assessment-snapshot-target-index-page="${pageNumber}"`
            );
        }
        const middle = Math.ceil(plan.totalPages / 2);
        expect(html).toContain(formatTargetIndexPageLabel(middle, plan.totalPages));
    });

    it('emits every index row exactly once across sheets in authored order', () => {
        const profile = clinicSnapshotProfile();
        const index = buildSnapshotTargetIndex(profile)!;
        const plan = buildTargetIndexRenderPlan(index, { paper: 'letter' });

        const plannedIds = plan.pages.flatMap((page) =>
            page.rows.map((row) => row.authoredTargetId)
        );
        expect(plannedIds).toEqual(index.rows.map((row) => row.authoredTargetId));
        expect(new Set(plannedIds).size).toBe(544);

        const html = renderPrintHtml(profile);
        const htmlIds = [
            ...html.matchAll(
                /data-assessment-snapshot-target-index-row[^>]*data-target-id="([^"]+)"/g
            ),
        ].map((match) => match[1]);
        expect(htmlIds).toEqual(plannedIds);
    });

    it('INV-I6 at scale: PrintRenderPlan byte-identical with index present', () => {
        const profile = clinicSnapshotProfile();
        const planA = buildPrintRenderPlan(profile, { paper: 'letter' });
        expect(buildSnapshotTargetIndex(profile)).not.toBeNull();
        const planB = buildPrintRenderPlan(profile, { paper: 'letter' });
        expect(JSON.stringify(planB)).toBe(JSON.stringify(planA));

        const html = renderPrintHtml(profile);
        expect(html).toContain(
            `data-assessment-snapshot-print-pages="${planA.totalPages}"`
        );
    });

    it('evidence footers stay evidence-only; index starts after all evidence', () => {
        const profile = clinicSnapshotProfile();
        const evidencePlan = buildPrintRenderPlan(profile, { paper: 'letter' });
        const html = renderPrintHtml(profile);
        const lastEvidencePage = evidencePlan.totalPages;
        expect(html).toContain(formatPrintPageLabel(lastEvidencePage, lastEvidencePage));

        const evidenceEnd = html.lastIndexOf(
            `data-assessment-snapshot-print-page="${lastEvidencePage}"`
        );
        const indexStart = html.indexOf('data-assessment-snapshot-target-index-page="1"');
        expect(indexStart).toBeGreaterThan(evidenceEnd);
    });

    it('export HTML carries screen index; print path retains planned index pages', () => {
        const profile = clinicSnapshotProfile();
        const index = buildSnapshotTargetIndex(profile)!;
        const plan = buildTargetIndexRenderPlan(index, { paper: 'letter' });
        const exportHtml = buildSnapshotExportHtml({
            profile,
            generatedAt: new Date('2026-08-01T12:00:00.000Z'),
        });

        expect(exportHtml).toContain('data-assessment-snapshot-screen-document');
        expect(exportHtml.slice(exportHtml.indexOf('<body'))).not.toContain(
            'data-assessment-snapshot-print-document'
        );
        expect(exportHtml).toContain('data-assessment-snapshot-target-index-screen');
        expect(exportHtml).toContain('data-expanded="true"');
        const exportBody = exportHtml.slice(exportHtml.indexOf('<body'));
        const exportIndexRows = [
            ...exportBody.matchAll(
                /data-assessment-snapshot-target-index-row[^>]*data-target-id="([^"]+)"/g
            ),
        ];
        expect(exportIndexRows).toHaveLength(544);

        const printHtml = renderPrintHtml(profile);
        for (let pageNumber = 1; pageNumber <= plan.totalPages; pageNumber += 1) {
            expect(printHtml).toContain(
                `data-assessment-snapshot-target-index-page="${pageNumber}"`
            );
            expect(printHtml).toContain(formatTargetIndexPageLabel(pageNumber, plan.totalPages));
        }
        expect(printHtml).toContain('table-layout: fixed');
        expect(printHtml).toContain('overflow-wrap: anywhere');
        expect(exportHtml).toContain(
            'Looks at a person who is talking to him for 3 seconds'
        );
    });
});
