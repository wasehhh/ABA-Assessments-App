/**
 * Shared Target Index print column geometry (PR14A-4).
 *
 * Single source of truth for:
 * - wrap-cost estimation in {@link buildTargetIndexRenderPlan}
 * - `<colgroup>` widths on the print table
 * - print CSS emitted into SNAPSHOT_EXPORT_INLINE_CSS and injected for live print
 *
 * Fractions sum to 1. Authored label is widest (full clinical titles wrap here);
 * displayed code is narrowest.
 */

export const TARGET_INDEX_COLUMN_COUNT = 5;

/**
 * Width fractions of usable table width, in table column order:
 * displayed code · authored id · authored label · primary group · secondary group
 */
export const TARGET_INDEX_COLUMN_WIDTH_FRACTIONS = {
    displayedCode: 0.1,
    authoredTargetId: 0.16,
    authoredLabel: 0.38,
    primaryGroup: 0.18,
    secondaryGroup: 0.18,
} as const;

export type TargetIndexColumnKey = keyof typeof TARGET_INDEX_COLUMN_WIDTH_FRACTIONS;

/** Column order matching AssessmentSnapshotTargetIndexTable. */
export const TARGET_INDEX_COLUMN_ORDER: readonly TargetIndexColumnKey[] = [
    'displayedCode',
    'authoredTargetId',
    'authoredLabel',
    'primaryGroup',
    'secondaryGroup',
] as const;

/** Vertical cell padding — matches emitted print CSS. */
export const TARGET_INDEX_CELL_PADDING_Y_REM = 0.2;

/** Horizontal cell padding per side — matches emitted print CSS. */
export const TARGET_INDEX_CELL_PADDING_X_REM = 0.35;

/** Total horizontal padding removed from the content box (left + right). */
export const TARGET_INDEX_CELL_HORIZONTAL_PADDING_TOTAL_REM =
    TARGET_INDEX_CELL_PADDING_X_REM * 2;

/**
 * Floor for usable text width after padding subtraction.
 * Prevents zero/negative divisors on degenerate narrow columns.
 */
export const TARGET_INDEX_USABLE_TEXT_WIDTH_FLOOR_REM = 0.5;

/**
 * Bottom border only on index cells. Under `border-collapse: collapse` with no
 * left/right borders, horizontal content-box width is not reduced by the border —
 * only padding is. Documented so planners do not double-count.
 */
export const TARGET_INDEX_CELL_BORDER_BOTTOM = '1px solid #9ca3af';

function fractionPercent(fraction: number): string {
    // Avoid float noise (0.1 → 10%, 0.38 → 38%).
    return `${Math.round(fraction * 1000) / 10}%`;
}

export function resolveTargetIndexColumnWidthsRem(
    usableWidthRem: number
): Record<TargetIndexColumnKey, number> {
    return {
        displayedCode:
            usableWidthRem * TARGET_INDEX_COLUMN_WIDTH_FRACTIONS.displayedCode,
        authoredTargetId:
            usableWidthRem * TARGET_INDEX_COLUMN_WIDTH_FRACTIONS.authoredTargetId,
        authoredLabel:
            usableWidthRem * TARGET_INDEX_COLUMN_WIDTH_FRACTIONS.authoredLabel,
        primaryGroup:
            usableWidthRem * TARGET_INDEX_COLUMN_WIDTH_FRACTIONS.primaryGroup,
        secondaryGroup:
            usableWidthRem * TARGET_INDEX_COLUMN_WIDTH_FRACTIONS.secondaryGroup,
    };
}

/**
 * Content-box width available for wrapping text = column width − horizontal padding.
 * Clamped to a positive floor so estimation never divides by ≤0.
 */
export function resolveTargetIndexUsableTextWidthsRem(
    usableWidthRem: number
): Record<TargetIndexColumnKey, number> {
    const columns = resolveTargetIndexColumnWidthsRem(usableWidthRem);
    const result = {} as Record<TargetIndexColumnKey, number>;
    for (const key of TARGET_INDEX_COLUMN_ORDER) {
        result[key] = Math.max(
            TARGET_INDEX_USABLE_TEXT_WIDTH_FLOOR_REM,
            columns[key] - TARGET_INDEX_CELL_HORIZONTAL_PADDING_TOTAL_REM
        );
    }
    return result;
}

/**
 * Full print CSS for index table geometry + cell chrome.
 * Single emit path for export fallback and live/print injection.
 * Wraps within columns — no truncation, ellipsis, or overflow clipping.
 */
export function buildTargetIndexTableColumnCss(): string {
    const widths = TARGET_INDEX_COLUMN_ORDER.map(
        (key) => fractionPercent(TARGET_INDEX_COLUMN_WIDTH_FRACTIONS[key])
    );

    const nthRules = widths
        .map(
            (width, index) => `.assessment-snapshot-print [data-assessment-snapshot-target-index-table] th:nth-child(${index + 1}),
.assessment-snapshot-print [data-assessment-snapshot-target-index-table] td:nth-child(${index + 1}) {
  width: ${width};
  overflow-wrap: anywhere;
  word-break: break-word;
}`
        )
        .join('\n');

    return `.assessment-snapshot-print [data-assessment-snapshot-target-index-table] {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
${nthRules}
.assessment-snapshot-print [data-assessment-snapshot-target-index-table] th,
.assessment-snapshot-print [data-assessment-snapshot-target-index-table] td {
  border-bottom: ${TARGET_INDEX_CELL_BORDER_BOTTOM};
  padding: ${TARGET_INDEX_CELL_PADDING_Y_REM}rem ${TARGET_INDEX_CELL_PADDING_X_REM}rem;
  text-align: left;
  vertical-align: top;
}
.assessment-snapshot-print [data-assessment-snapshot-target-index-table] th {
  font-weight: 600;
}
.assessment-snapshot-print [data-assessment-snapshot-target-index-row] {
  break-inside: avoid;
  page-break-inside: avoid;
}`;
}

/**
 * Same geometry/chrome for HTML-channel / screen-document index tables.
 * Kept separate so print CSS emission stays byte-stable with PR14A-4.
 */
export function buildTargetIndexScreenTableColumnCss(): string {
    const widths = TARGET_INDEX_COLUMN_ORDER.map(
        (key) => fractionPercent(TARGET_INDEX_COLUMN_WIDTH_FRACTIONS[key])
    );
    const roots = [
        '.assessment-snapshot-export-html',
        '[data-assessment-snapshot-screen-document]',
    ];

    const tableSelectors = roots
        .map((root) => `${root} [data-assessment-snapshot-target-index-table]`)
        .join(',\n');

    const nthRules = widths
        .map((width, index) => {
            const cellSelectors = roots
                .map(
                    (root) =>
                        `${root} [data-assessment-snapshot-target-index-table] th:nth-child(${index + 1}),\n${root} [data-assessment-snapshot-target-index-table] td:nth-child(${index + 1})`
                )
                .join(',\n');
            return `${cellSelectors} {
  width: ${width};
  overflow-wrap: anywhere;
  word-break: break-word;
}`;
        })
        .join('\n');

    const thTdSelectors = roots
        .map(
            (root) =>
                `${root} [data-assessment-snapshot-target-index-table] th,\n${root} [data-assessment-snapshot-target-index-table] td`
        )
        .join(',\n');

    const thSelectors = roots
        .map((root) => `${root} [data-assessment-snapshot-target-index-table] th`)
        .join(',\n');

    return `${tableSelectors} {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
${nthRules}
${thTdSelectors} {
  border-bottom: ${TARGET_INDEX_CELL_BORDER_BOTTOM};
  padding: ${TARGET_INDEX_CELL_PADDING_Y_REM}rem ${TARGET_INDEX_CELL_PADDING_X_REM}rem;
  text-align: left;
  vertical-align: top;
}
${thSelectors} {
  font-weight: 600;
}`;
}
