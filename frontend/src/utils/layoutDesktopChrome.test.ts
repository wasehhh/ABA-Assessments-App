import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    LAYOUT_ACCOUNT_TRIGGER_WIDTH_PX,
    LAYOUT_VIEWPORT_LG_PX,
    adminScrollWidthAtLgPx,
    accountTriggerRightEdgePx,
    desktopHeaderRowContentWidthPx,
    fitsLayoutViewportAtLg,
    qaBaselineAdminScrollWidthPx,
} from './layoutDesktopChrome';

const layoutSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../components/Layout.tsx'),
    'utf8'
);

describe('layoutDesktopChrome geometry at 1024', () => {
    it('reproduces the QA-measured 13px overflow before the lg spacing fix', () => {
        const baselineScroll = qaBaselineAdminScrollWidthPx();
        expect(baselineScroll).toBeGreaterThan(LAYOUT_VIEWPORT_LG_PX);
        expect(baselineScroll - LAYOUT_VIEWPORT_LG_PX).toBeGreaterThanOrEqual(13);
    });

    it('fits admin chrome within the viewport after lg spacing and padding', () => {
        const scrollWidth = adminScrollWidthAtLgPx();
        expect(fitsLayoutViewportAtLg(scrollWidth)).toBe(true);
        expect(scrollWidth).toBeLessThanOrEqual(LAYOUT_VIEWPORT_LG_PX);
    });

    it('keeps the Account trigger right edge inside the 1024 viewport', () => {
        const rowWidth = desktopHeaderRowContentWidthPx({
            navGapPx: 16,
            accountGapPx: 8,
            profileNameWidthPx: 112,
            accountTriggerWidthPx: LAYOUT_ACCOUNT_TRIGGER_WIDTH_PX,
        });
        const rightEdge = accountTriggerRightEdgePx(24, rowWidth);
        expect(rightEdge).toBeLessThanOrEqual(LAYOUT_VIEWPORT_LG_PX);
    });

    it('fails if nav gap reverts to gap-6 at lg without compensating padding', () => {
        const rowWidth = desktopHeaderRowContentWidthPx({
            navGapPx: 24,
            accountGapPx: 12,
            profileNameWidthPx: 112,
            accountTriggerWidthPx: LAYOUT_ACCOUNT_TRIGGER_WIDTH_PX,
        });
        const scrollWidth = 32 + rowWidth;
        expect(fitsLayoutViewportAtLg(scrollWidth)).toBe(false);
    });
});

describe('Layout.tsx lg spacing bindings', () => {
    it('uses tighter lg-only nav and account gaps plus capped profile width', () => {
        expect(layoutSource).toMatch(
            /hidden lg:flex items-center gap-4 xl:gap-6 shrink-0" data-layout-desktop-nav/
        );
        expect(layoutSource).toMatch(
            /hidden lg:flex items-center gap-2 xl:gap-3 shrink-0" data-layout-desktop-account/
        );
        expect(layoutSource).toContain('max-w-[7rem]');
        expect(layoutSource).toMatch(/lg:px-6 xl:px-8/);
    });
});
