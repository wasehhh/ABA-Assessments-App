import type { SnapshotLayoutTier } from './snapshotLayoutEngine';

/**
 * PR13.6B/D — Explicit print page-composition profiles.
 *
 * Models printable sheet geometry for {@link buildPrintRenderPlan}. Capacities are
 * estimates (tier-based furniture); the browser still performs physical rasterization.
 *
 * Units: CSS rem at a 16px root, where 1in = 96px = 6rem.
 */

export type PrintPageProfileId = 'letter' | 'a4';

/** 1in = 96px = 6rem. */
export const PRINT_IN_TO_REM = 6;

/** Reserved page margin per side (Chrome "Default" ≈ 0.5in). */
export const PRINT_PAGE_MARGIN_REM = 0.5 * PRINT_IN_TO_REM; // 3rem

/**
 * Document header block on page 1: assessment title, learner/pack metadata,
 * Cycle Reference and legend. Consumes vertical space above the first columns.
 */
export const PRINT_DOCUMENT_HEADER_REM = 11;

/** Lighter running context repeated at the top of a continuation page. */
export const PRINT_CONTINUATION_CONTEXT_REM = 3;

/** Grouped chapter title band (full-width) when a chapter opens a page. */
export const PRINT_CHAPTER_HEADER_REM = 2.5;

/** Per-column furniture: domain title + target range + repeated cycle axis. */
export const PRINT_SEGMENT_HEADER_REM = 4;

/**
 * Compact repeated page-footer chrome (PR13.6C). Not subtracted from column
 * capacity estimates — intentional estimator conservatism.
 */
export const PRINT_FOOTER_REM = 2.5;

/** Inter-column gutter — matches the screen domain gap for visual consistency. */
export const PRINT_COLUMN_GAP_REM = 1.25;

/** Estimated rendered height of a single thread row per tier (bead + print row gap). */
const THREAD_ROW_HEIGHT_REM: Record<SnapshotLayoutTier, number> = {
    compact: 1.45,
    standard: 1.45,
    dense: 1.25,
};

export function estimateThreadRowHeightRem(tier: SnapshotLayoutTier): number {
    return THREAD_ROW_HEIGHT_REM[tier];
}

export interface PrintCompositionProfile {
    id: PrintPageProfileId;
    label: string;
    pageWidthRem: number;
    pageHeightRem: number;
    /** Margin per side. */
    marginRem: number;
    usableWidthRem: number;
    usableHeightRem: number;
    documentHeaderRem: number;
    continuationContextRem: number;
    chapterHeaderRem: number;
    segmentHeaderRem: number;
    footerRem: number;
    columnGapRem: number;
}

function buildProfile(
    id: PrintPageProfileId,
    label: string,
    widthIn: number,
    heightIn: number
): PrintCompositionProfile {
    const pageWidthRem = widthIn * PRINT_IN_TO_REM;
    const pageHeightRem = heightIn * PRINT_IN_TO_REM;
    return Object.freeze({
        id,
        label,
        pageWidthRem,
        pageHeightRem,
        marginRem: PRINT_PAGE_MARGIN_REM,
        usableWidthRem: pageWidthRem - 2 * PRINT_PAGE_MARGIN_REM,
        usableHeightRem: pageHeightRem - 2 * PRINT_PAGE_MARGIN_REM,
        documentHeaderRem: PRINT_DOCUMENT_HEADER_REM,
        continuationContextRem: PRINT_CONTINUATION_CONTEXT_REM,
        chapterHeaderRem: PRINT_CHAPTER_HEADER_REM,
        segmentHeaderRem: PRINT_SEGMENT_HEADER_REM,
        footerRem: PRINT_FOOTER_REM,
        columnGapRem: PRINT_COLUMN_GAP_REM,
    });
}

/** Frozen source-of-truth profiles. Consumers get clones via {@link resolvePrintCompositionProfile}. */
export const PRINT_COMPOSITION_PROFILES: Record<PrintPageProfileId, PrintCompositionProfile> = {
    letter: buildProfile('letter', 'Letter', 8.5, 11),
    a4: buildProfile('a4', 'A4', 8.27, 11.69),
};

export const DEFAULT_PRINT_PAGE_PROFILE_ID: PrintPageProfileId = 'letter';

/** Returns an immutable clone so callers cannot mutate the shared profile. */
export function resolvePrintCompositionProfile(
    id: PrintPageProfileId = DEFAULT_PRINT_PAGE_PROFILE_ID
): PrintCompositionProfile {
    return { ...PRINT_COMPOSITION_PROFILES[id] };
}

/**
 * How many fixed-width columns fit side by side within the usable page width,
 * accounting for inter-column gutters. `n` columns need
 * `n * columnWidth + (n - 1) * gutter <= usableWidth`.
 */
export function computeColumnsPerPage(
    profile: PrintCompositionProfile,
    columnWidthRem: number
): number {
    if (columnWidthRem <= 0) {
        return 1;
    }
    const count = Math.floor(
        (profile.usableWidthRem + profile.columnGapRem) /
            (columnWidthRem + profile.columnGapRem)
    );
    return Math.max(1, count);
}

/** Page header contexts, each with a distinct vertical furniture allowance. */
export type PrintPageHeaderMode = 'document' | 'document-chapter' | 'chapter' | 'continuation';

export function resolvePageHeaderReserveRem(
    profile: PrintCompositionProfile,
    headerMode: PrintPageHeaderMode
): number {
    switch (headerMode) {
        case 'document':
            return profile.documentHeaderRem;
        case 'document-chapter':
            return profile.documentHeaderRem + profile.chapterHeaderRem;
        case 'chapter':
            return profile.chapterHeaderRem;
        case 'continuation':
        default:
            return profile.continuationContextRem;
    }
}

/**
 * Estimated number of target rows a single column can hold on a page with the
 * given header context. The footer is deliberately excluded (rendered once at
 * document end), keeping pages well-utilized per §10.
 */
export function computeColumnRowCapacity(
    profile: PrintCompositionProfile,
    tier: SnapshotLayoutTier,
    headerMode: PrintPageHeaderMode
): number {
    const usable =
        profile.usableHeightRem -
        resolvePageHeaderReserveRem(profile, headerMode) -
        profile.segmentHeaderRem;
    return Math.max(1, Math.floor(usable / estimateThreadRowHeightRem(tier)));
}

export interface PrintColumnCapacities {
    /** Columns on the very first document page (document header present). */
    firstPageRows: number;
    /** Columns on a later continuation page (light running context). */
    continuationRows: number;
    /** Columns on a grouped chapter's opening page (chapter title band). */
    chapterStartRows: number;
}

export function computeColumnCapacities(
    profile: PrintCompositionProfile,
    tier: SnapshotLayoutTier
): PrintColumnCapacities {
    return {
        firstPageRows: computeColumnRowCapacity(profile, tier, 'document'),
        continuationRows: computeColumnRowCapacity(profile, tier, 'continuation'),
        chapterStartRows: computeColumnRowCapacity(profile, tier, 'chapter'),
    };
}
