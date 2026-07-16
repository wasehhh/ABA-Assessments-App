import { RefObject, useEffect, useState } from 'react';
import {
    pixelsToRem,
    resolveMeasuredScreenViewportRem,
} from './snapshotViewport';
import { SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM } from '../utils/snapshotLayoutEngine';

/**
 * Observe an element's content width and return it in rem for Snapshot packing.
 * Debounces via a rem threshold — does not schedule profile rebuild loops.
 */
export function useContainerWidthRem(
    ref: RefObject<HTMLElement | null>,
    options?: {
        fallbackRem?: number;
        thresholdRem?: number;
    }
): number {
    const fallback = options?.fallbackRem ?? SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM;
    const thresholdRem = options?.thresholdRem ?? 0.5;
    const [widthRem, setWidthRem] = useState(fallback);

    useEffect(() => {
        const element = ref.current;
        if (!element || typeof ResizeObserver === 'undefined') {
            return;
        }

        let previous: number | null = null;

        const update = () => {
            const rootFontSize = Number.parseFloat(
                window.getComputedStyle(document.documentElement).fontSize
            );
            const measured = pixelsToRem(element.clientWidth, rootFontSize || 16);
            const next = resolveMeasuredScreenViewportRem({
                measuredRem: measured,
                previousRem: previous,
                fallbackRem: fallback,
                thresholdRem,
            });
            previous = next;
            setWidthRem((current) => (current === next ? current : next));
        };

        update();

        const observer = new ResizeObserver(() => {
            update();
        });
        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [ref, fallback, thresholdRem]);

    return widthRem;
}
