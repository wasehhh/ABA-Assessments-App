import { SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM } from '../utils/snapshotLayoutEngine';

/**
 * Convert CSS pixels to rem using the root font size (defaults to 16).
 * Pure helper — unit-testable without DOM.
 */
export function pixelsToRem(widthPx: number, rootFontSizePx = 16): number {
    if (!Number.isFinite(widthPx) || widthPx <= 0) {
        return 0;
    }

    const root = rootFontSizePx > 0 ? rootFontSizePx : 16;
    return widthPx / root;
}

/**
 * Resolve the screen viewport width for Snapshot packing.
 * Ignores sub-threshold jitter so ResizeObserver noise does not thrash RenderPlan rebuilds.
 */
export function resolveMeasuredScreenViewportRem(options: {
    measuredRem: number | null;
    previousRem: number | null;
    fallbackRem?: number;
    /** Minimum change (rem) before accepting a new measurement. */
    thresholdRem?: number;
}): number {
    const fallback = options.fallbackRem ?? SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM;
    const threshold = options.thresholdRem ?? 0.5;
    const measured = options.measuredRem;

    if (measured === null || measured <= 0) {
        return options.previousRem && options.previousRem > 0 ? options.previousRem : fallback;
    }

    if (
        options.previousRem !== null &&
        options.previousRem > 0 &&
        Math.abs(measured - options.previousRem) < threshold
    ) {
        return options.previousRem;
    }

    return measured;
}

export function buildSnapshotScreenPlanConfig(viewportWidthRem: number) {
    return {
        mode: 'screen' as const,
        viewportWidthRem,
    };
}
