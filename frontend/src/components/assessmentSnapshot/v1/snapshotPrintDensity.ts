import { SnapshotLayoutMode } from '../../../utils/snapshotLayoutEngine';
import { ThreadsLayoutTier, ThreadsLayoutTokens } from './threadsLayout';

/** Screen code→bead gap (Tailwind gap-1 = 0.25rem). */
export const SNAPSHOT_SCREEN_THREAD_GAP_REM = 0.25;

/** Print code→bead gap — closer grouping without crowding long IDs. */
export const SNAPSHOT_PRINT_THREAD_GAP_REM = 0.125;

/** Screen standard/compact row pitch (space-y-1). */
export const SNAPSHOT_SCREEN_ROW_GAP_REM = 0.25;

/** Print row pitch — ~20% tighter than screen standard. */
export const SNAPSHOT_PRINT_ROW_GAP_REM = 0.2;

/** Dense print row pitch. */
export const SNAPSHOT_PRINT_DENSE_ROW_GAP_REM = 0.125;

/** Print label column — still fits AFLS_205 / L1-LR-1 / X250. */
export const SNAPSHOT_PRINT_LABEL_WIDTH_REM = 2.75;

/** Screen label column. */
export const SNAPSHOT_SCREEN_LABEL_WIDTH_REM = 3;

/** Arrow→max gap in rem (≈6px at 16px root). Keep within 4–6px print target. */
export const SNAPSHOT_PRINT_ARROW_TO_MAX_GAP_REM = 0.3125;

/** Explicit print green for hollow maximum outline (Tailwind green-700). */
export const SNAPSHOT_PRINT_MAX_RING_BORDER = '#15803d';

export function printThreadGapClass(): string {
    return 'gap-0.5';
}

export function screenThreadGapClass(): string {
    return 'gap-1';
}

export function printRowGapClass(tier: ThreadsLayoutTier): string {
    if (tier === 'dense') {
        return 'space-y-0.5';
    }
    return 'space-y-[0.2rem]';
}

export function printLabelWidthClass(): string {
    return 'w-11';
}

export function printLabelOffsetClass(): string {
    return 'pl-[calc(2.75rem+0.125rem)]';
}

/**
 * Apply print-only density overrides on top of screen tier tokens.
 * Screen callers must pass mode 'screen' (or omit) to leave tokens unchanged.
 */
export function applySnapshotPrintDensity(
    tokens: ThreadsLayoutTokens,
    mode: SnapshotLayoutMode
): ThreadsLayoutTokens {
    if (mode !== 'print') {
        return {
            ...tokens,
            threadGapClass: tokens.threadGapClass ?? screenThreadGapClass(),
        };
    }

    const dense = tokens.tier === 'dense';

    return {
        ...tokens,
        labelWidthClass: printLabelWidthClass(),
        labelOffsetClass: printLabelOffsetClass(),
        threadGapClass: printThreadGapClass(),
        threadRowGapClass: printRowGapClass(tokens.tier),
        // Match bead and max sizes so centers share one baseline in print.
        beadSizeLatest: tokens.beadSizeDefault,
        maxRingSize: dense
            ? 'h-[1.125rem] w-[1.125rem] min-h-[1.125rem] min-w-[1.125rem] text-[8px]'
            : 'h-5 w-5 min-h-[1.25rem] min-w-[1.25rem] text-[9px]',
        domainGapClass: dense ? 'gap-x-3 gap-y-2' : 'gap-x-4 gap-y-3',
        domainZoneClass: dense ? 'py-0' : 'py-0.5',
    };
}

export function resolvePrintArrowToMaxGapRem(mode: SnapshotLayoutMode): number {
    return mode === 'print' ? SNAPSHOT_PRINT_ARROW_TO_MAX_GAP_REM : 0.375;
}

export function assertPrintDensityTighterThanScreen(): boolean {
    return (
        SNAPSHOT_PRINT_ROW_GAP_REM < SNAPSHOT_SCREEN_ROW_GAP_REM &&
        SNAPSHOT_PRINT_THREAD_GAP_REM < SNAPSHOT_SCREEN_THREAD_GAP_REM &&
        SNAPSHOT_PRINT_LABEL_WIDTH_REM < SNAPSHOT_SCREEN_LABEL_WIDTH_REM
    );
}

/** Pure geometry check: bead and max share a row centerline within tolerance. */
export function assertBeadMaxVerticalAlignment(
    beadCenterY: number,
    maxCenterY: number,
    tolerancePx = 1
): boolean {
    return Math.abs(beadCenterY - maxCenterY) <= tolerancePx;
}

export function assertArrowToMaxGapVisible(
    gapPx: number,
    minPx = 4,
    maxPx = 8
): boolean {
    return gapPx >= minPx && gapPx <= maxPx;
}
