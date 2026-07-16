import { describe, expect, it } from 'vitest';
import {
    buildSnapshotScreenPlanConfig,
    pixelsToRem,
    resolveMeasuredScreenViewportRem,
} from './snapshotViewport';
import { SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM } from '../utils/snapshotLayoutEngine';

describe('snapshotViewport', () => {
    it('converts pixels to rem', () => {
        expect(pixelsToRem(960, 16)).toBe(60);
        expect(pixelsToRem(0)).toBe(0);
    });

    it('falls back before first measurement', () => {
        expect(
            resolveMeasuredScreenViewportRem({
                measuredRem: null,
                previousRem: null,
            })
        ).toBe(SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM);
    });

    it('ignores sub-threshold jitter', () => {
        expect(
            resolveMeasuredScreenViewportRem({
                measuredRem: 60.2,
                previousRem: 60,
                thresholdRem: 0.5,
            })
        ).toBe(60);
    });

    it('accepts meaningful width changes', () => {
        expect(
            resolveMeasuredScreenViewportRem({
                measuredRem: 56,
                previousRem: 60,
                thresholdRem: 0.5,
            })
        ).toBe(56);
    });

    it('builds screen plan config with measured width', () => {
        expect(buildSnapshotScreenPlanConfig(48)).toEqual({
            mode: 'screen',
            viewportWidthRem: 48,
        });
    });
});
