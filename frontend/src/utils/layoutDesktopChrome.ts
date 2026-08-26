/**
 * Desktop Layout chrome width model at the lg breakpoint (1024px viewport).
 * Used to guard §3.3 in-viewport guarantee — spacing constants must match Layout.tsx.
 */

export const LAYOUT_VIEWPORT_LG_PX = 1024;

/** Nav shell horizontal padding at lg: lg:px-6 → 24px each side. */
export const LAYOUT_NAV_SHELL_PADDING_LG_PX = 24;

/** Nav shell horizontal padding at xl: xl:px-8 → 32px each side. */
export const LAYOUT_NAV_SHELL_PADDING_XL_PX = 32;

/** Pre-fix shell padding (lg:px-8) — caused 13px overflow with gap-6 nav. */
export const LAYOUT_NAV_SHELL_PADDING_PRE_FIX_LG_PX = 32;

/** Inter-nav-item gap at lg: lg:gap-4. */
export const LAYOUT_DESKTOP_NAV_GAP_LG_PX = 16;

/** Inter-nav-item gap pre-fix / xl: gap-6. */
export const LAYOUT_DESKTOP_NAV_GAP_XL_PX = 24;

/** Gap between profile block and Account trigger at lg: lg:gap-2. */
export const LAYOUT_DESKTOP_ACCOUNT_GAP_LG_PX = 8;

/** Gap pre-fix / xl: gap-3. */
export const LAYOUT_DESKTOP_ACCOUNT_GAP_XL_PX = 12;

/** Profile name cap on lg: max-w-[7rem]. */
export const LAYOUT_PROFILE_NAME_MAX_LG_PX = 112;

/** Logo cluster: w-8 icon + mr-2 + “Evalis” text-xl. */
export const LAYOUT_LOGO_CLUSTER_PX = 100;

/**
 * Sum of seven admin nav item widths (icon + label), calibrated to QA scrollWidth 1037
 * with gap-6 nav and xl padding before the spacing fix.
 */
export const LAYOUT_ADMIN_NAV_ITEMS_SUM_PX = 515;

/** QA-measured Account trigger width with visible label at 1024. */
export const LAYOUT_ACCOUNT_TRIGGER_WIDTH_PX = 122.6;

const LAYOUT_ADMIN_NAV_ITEM_COUNT = 7;

export function navClusterWidthPx(itemsSumPx: number, gapPx: number): number {
    return itemsSumPx + gapPx * (LAYOUT_ADMIN_NAV_ITEM_COUNT - 1);
}

export function accountClusterWidthPx(
    profileNameWidthPx: number,
    accountGapPx: number,
    triggerWidthPx: number
): number {
    return profileNameWidthPx + accountGapPx + triggerWidthPx;
}

export function desktopHeaderRowContentWidthPx(options: {
    navGapPx: number;
    accountGapPx: number;
    profileNameWidthPx: number;
    accountTriggerWidthPx: number;
}): number {
    return (
        LAYOUT_LOGO_CLUSTER_PX +
        navClusterWidthPx(LAYOUT_ADMIN_NAV_ITEMS_SUM_PX, options.navGapPx) +
        accountClusterWidthPx(
            options.profileNameWidthPx,
            options.accountGapPx,
            options.accountTriggerWidthPx
        )
    );
}

/** Document scrollWidth when the header row overflows (left shell pad + row width). */
export function layoutHeaderScrollWidthPx(
    shellPaddingLeftPx: number,
    rowContentWidthPx: number
): number {
    return shellPaddingLeftPx + rowContentWidthPx;
}

export function accountTriggerRightEdgePx(
    shellPaddingLeftPx: number,
    rowContentWidthPx: number
): number {
    return shellPaddingLeftPx + rowContentWidthPx;
}

/** QA baseline before lg spacing fix — reproduces measured 13px overflow. */
export function qaBaselineAdminScrollWidthPx(): number {
    const rowWidth = desktopHeaderRowContentWidthPx({
        navGapPx: LAYOUT_DESKTOP_NAV_GAP_XL_PX,
        accountGapPx: LAYOUT_DESKTOP_ACCOUNT_GAP_XL_PX,
        profileNameWidthPx: LAYOUT_PROFILE_NAME_MAX_LG_PX,
        accountTriggerWidthPx: LAYOUT_ACCOUNT_TRIGGER_WIDTH_PX,
    });
    return layoutHeaderScrollWidthPx(LAYOUT_NAV_SHELL_PADDING_PRE_FIX_LG_PX, rowWidth);
}

/** Post-fix lg chrome — must fit within 1024 with Account fully in-viewport. */
export function adminScrollWidthAtLgPx(): number {
    const rowWidth = desktopHeaderRowContentWidthPx({
        navGapPx: LAYOUT_DESKTOP_NAV_GAP_LG_PX,
        accountGapPx: LAYOUT_DESKTOP_ACCOUNT_GAP_LG_PX,
        profileNameWidthPx: LAYOUT_PROFILE_NAME_MAX_LG_PX,
        accountTriggerWidthPx: LAYOUT_ACCOUNT_TRIGGER_WIDTH_PX,
    });
    return layoutHeaderScrollWidthPx(LAYOUT_NAV_SHELL_PADDING_LG_PX, rowWidth);
}

export function fitsLayoutViewportAtLg(scrollWidthPx: number): boolean {
    return scrollWidthPx <= LAYOUT_VIEWPORT_LG_PX;
}
