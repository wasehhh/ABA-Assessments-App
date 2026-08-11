import type {
    SnapshotTargetIndex,
    SnapshotTargetIndexRow,
} from '../components/assessmentSnapshot/v1/snapshotTargetIndex';
import {
    resolveTargetIndexColumnWidthsRem,
    resolveTargetIndexUsableTextWidthsRem,
    TargetIndexColumnKey,
} from './snapshotTargetIndexColumns';
import {
    DEFAULT_PRINT_PAGE_PROFILE_ID,
    PrintCompositionProfile,
    PrintPageProfileId,
    resolvePrintCompositionProfile,
} from './snapshotPrintPageProfile';

/**
 * PR14A-4 — Explicit Target Index print pagination.
 *
 * Parallel to {@link buildPrintRenderPlan}: imposes a height budget from the same
 * page-profile furniture rather than observing CSS flow. Row cost is variable —
 * cells wrap within fixed column widths from {@link snapshotTargetIndexColumns} —
 * so sheets fill by accumulating estimated wrap height. Never mutates or feeds
 * the evidence planner (INV-I6).
 */

/**
 * Estimated height of one wrapped text line in an index table body cell
 * (8px type + cell padding share + hairline). Matches print table chrome.
 */
export const TARGET_INDEX_ROW_HEIGHT_REM = 1;

/** "Target index" section title on the first index sheet only. */
export const TARGET_INDEX_SECTION_TITLE_REM = 1.5;

/** Repeated column-header row on every index sheet. */
export const TARGET_INDEX_TABLE_HEAD_REM = 1;

/**
 * Approximate average glyph width at print table 8px type.
 * Slightly wide → fewer characters per line → more conservative wrap estimates.
 */
export const TARGET_INDEX_CHAR_WIDTH_REM = 0.28;

/**
 * Multiplier on estimated row height. Under-filling a sheet is harmless;
 * over-filling clips past the footer onto unnumbered sheets.
 */
export const TARGET_INDEX_ROW_COST_SAFETY = 1.15;

export interface TargetIndexPagePlan {
    /** 1-based page number within the index appendix only. */
    pageNumber: number;
    rows: SnapshotTargetIndexRow[];
    /** Inclusive start into the full index row list. */
    rowStartIndex: number;
    /** Exclusive end into the full index row list. */
    rowEndIndex: number;
    /** Section title only on the first index sheet. */
    showSectionTitle: boolean;
    /** Summed estimated row cost for this sheet (after safety margin). */
    estimatedContentCostRem: number;
}

export interface TargetIndexRenderPlan {
    profileId: PrintPageProfileId;
    profile: PrintCompositionProfile;
    /** Per-column rem widths (full column box) from shared fractions × usableWidth. */
    columnWidthsRem: Record<TargetIndexColumnKey, number>;
    /** Per-column content-box rem widths after shared horizontal padding. */
    usableTextWidthsRem: Record<TargetIndexColumnKey, number>;
    /** Usable content height on the first index sheet. */
    contentHeightFirstPageRem: number;
    /** Usable content height on continuation index sheets. */
    contentHeightContinuationRem: number;
    /**
     * Theoretical max rows if every row were a single unwrapped line
     * (diagnostic / short-label ceiling — not used for packing).
     */
    singleLineRowsPerFirstPage: number;
    singleLineRowsPerContinuationPage: number;
    pages: TargetIndexPagePlan[];
    totalPages: number;
    totalRows: number;
}

export interface BuildTargetIndexRenderPlanOptions {
    paper?: PrintPageProfileId;
}

function formatGroupContextForEstimate(id: string, title: string): string {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle === id) {
        return id;
    }
    return `${id} · ${trimmedTitle}`;
}

/**
 * How many wrapped lines `text` needs in a column of the given width.
 * Line count is rounded UP. Empty text counts as one line.
 */
export function estimateWrappedLineCount(
    text: string,
    columnWidthRem: number
): number {
    const trimmed = text.trim();
    if (!trimmed) {
        return 1;
    }
    const charsPerLine = Math.max(
        1,
        Math.floor(columnWidthRem / TARGET_INDEX_CHAR_WIDTH_REM)
    );
    return Math.max(1, Math.ceil(trimmed.length / charsPerLine));
}

/**
 * Estimated vertical cost of one index row after wrap + safety margin.
 * Each cell is costed against its OWN usable text width (column − padding);
 * the row takes the max line count.
 */
export function estimateTargetIndexRowCostRem(
    row: SnapshotTargetIndexRow,
    usableTextWidthsRem: Record<TargetIndexColumnKey, number>
): number {
    const cellEstimates: Array<{ text: string; widthRem: number }> = [
        { text: row.displayedCode, widthRem: usableTextWidthsRem.displayedCode },
        { text: row.authoredTargetId, widthRem: usableTextWidthsRem.authoredTargetId },
        { text: row.authoredLabel, widthRem: usableTextWidthsRem.authoredLabel },
        {
            text: formatGroupContextForEstimate(row.primaryGroupId, row.primaryGroupTitle),
            widthRem: usableTextWidthsRem.primaryGroup,
        },
    ];
    if (row.secondaryGroupId) {
        cellEstimates.push({
            text: formatGroupContextForEstimate(
                row.secondaryGroupId,
                row.secondaryGroupTitle ?? row.secondaryGroupId
            ),
            widthRem: usableTextWidthsRem.secondaryGroup,
        });
    }

    const lines = Math.max(
        1,
        ...cellEstimates.map(({ text, widthRem }) =>
            estimateWrappedLineCount(text, widthRem)
        )
    );
    return lines * TARGET_INDEX_ROW_HEIGHT_REM * TARGET_INDEX_ROW_COST_SAFETY;
}

/**
 * Vertical space available for index table body rows on a sheet.
 *
 * Uses the same Letter/A4 usable height, continuation header, and footer
 * furniture as the evidence profile. Index sheets always render a footer —
 * so footerRem is subtracted (same reservation as evidence column capacity).
 */
export function computeTargetIndexContentHeightRem(
    profile: PrintCompositionProfile,
    options: { isFirstIndexPage: boolean }
): number {
    const titleRem = options.isFirstIndexPage ? TARGET_INDEX_SECTION_TITLE_REM : 0;
    return Math.max(
        TARGET_INDEX_ROW_HEIGHT_REM,
        profile.usableHeightRem -
            profile.continuationContextRem -
            titleRem -
            TARGET_INDEX_TABLE_HEAD_REM -
            profile.footerRem
    );
}

/**
 * Theoretical single-line row capacity (every row height = 1rem, no wrap).
 * Kept for diagnostics and short-label ceilings — packing uses variable cost.
 */
export function computeTargetIndexRowCapacity(
    profile: PrintCompositionProfile,
    options: { isFirstIndexPage: boolean }
): number {
    return Math.max(
        1,
        Math.floor(
            computeTargetIndexContentHeightRem(profile, options) /
                TARGET_INDEX_ROW_HEIGHT_REM
        )
    );
}

/**
 * Chunk index rows into explicit print pages by accumulating variable wrap cost.
 * Empty index → empty plan (caller omits the appendix when the index is null).
 *
 * Guard: a single row whose cost exceeds the sheet height is still placed alone
 * (one-row minimum) so packing cannot loop or emit an empty page.
 */
export function buildTargetIndexRenderPlan(
    index: SnapshotTargetIndex,
    options: BuildTargetIndexRenderPlanOptions = {}
): TargetIndexRenderPlan {
    const profileId = options.paper ?? DEFAULT_PRINT_PAGE_PROFILE_ID;
    const profile = resolvePrintCompositionProfile(profileId);
    const columnWidthsRem = resolveTargetIndexColumnWidthsRem(profile.usableWidthRem);
    const usableTextWidthsRem = resolveTargetIndexUsableTextWidthsRem(
        profile.usableWidthRem
    );
    const contentHeightFirstPageRem = computeTargetIndexContentHeightRem(profile, {
        isFirstIndexPage: true,
    });
    const contentHeightContinuationRem = computeTargetIndexContentHeightRem(profile, {
        isFirstIndexPage: false,
    });
    const singleLineRowsPerFirstPage = computeTargetIndexRowCapacity(profile, {
        isFirstIndexPage: true,
    });
    const singleLineRowsPerContinuationPage = computeTargetIndexRowCapacity(profile, {
        isFirstIndexPage: false,
    });

    const allRows = index.rows;
    const rowCosts = allRows.map((row) =>
        estimateTargetIndexRowCostRem(row, usableTextWidthsRem)
    );

    const pages: TargetIndexPagePlan[] = [];
    let cursor = 0;
    let pageNumber = 1;

    while (cursor < allRows.length) {
        const isFirst = pageNumber === 1;
        const contentHeight = isFirst
            ? contentHeightFirstPageRem
            : contentHeightContinuationRem;
        const rowStartIndex = cursor;
        const pageRows: SnapshotTargetIndexRow[] = [];
        let used = 0;

        while (cursor < allRows.length) {
            const cost = rowCosts[cursor]!;
            if (pageRows.length > 0 && used + cost > contentHeight) {
                break;
            }
            pageRows.push(allRows[cursor]!);
            used += cost;
            cursor += 1;
            // First row on a sheet always lands, even when cost > contentHeight.
        }

        pages.push({
            pageNumber,
            rows: pageRows,
            rowStartIndex,
            rowEndIndex: cursor,
            showSectionTitle: isFirst,
            estimatedContentCostRem: used,
        });
        pageNumber += 1;
    }

    return {
        profileId,
        profile,
        columnWidthsRem,
        usableTextWidthsRem,
        contentHeightFirstPageRem,
        contentHeightContinuationRem,
        singleLineRowsPerFirstPage,
        singleLineRowsPerContinuationPage,
        pages,
        totalPages: pages.length,
        totalRows: allRows.length,
    };
}
