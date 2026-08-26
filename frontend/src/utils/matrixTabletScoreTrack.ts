import { ContentPackData, Domain, Target } from '../types';
import { resolveEffectiveScoring } from './effectiveScoring';

/** Matches TargetScoreControls compact buttons: h-11 min-w-11 → 44 CSS px. */
export const SCORE_BUTTON_SIZE_PX = 44;

/** Matches TargetScoreControls numeric/checkbox path: gap-1.5 → 6 CSS px. */
export const SCORE_BUTTON_GAP_NUMERIC_PX = 6;

/** Matches TargetScoreControls yes/no path: gap-2 → 8 CSS px. */
export const SCORE_BUTTON_GAP_YES_NO_PX = 8;

/** Desktop score column when viewport allows 5-across with slack (§2.3). */
export const DESKTOP_SCORE_COLUMN_PREFERRED_PX = 260;

/** Tablet track is never narrower than the desktop column for the same content. */
export const TABLET_SCORE_TRACK_WIDTH_FLOOR_PX = DESKTOP_SCORE_COLUMN_PREFERRED_PX;

/**
 * Minimum identity column width before the score group moves to a second row.
 * Proposed default for SPM confirmation — see Builder report.
 * Rationale: preserve mono target_id (~48px) plus ~14 characters of title at text-sm
 * so a therapist can tell which target they are scoring without opening View.
 */
export const MIN_TABLET_IDENTITY_WIDTH_PX = 160;

/** Contract §2.3.4: Matrix main content at 768 after page padding. */
export const TABLET_MATRIX_CONTENT_WIDTH_PX = 720;

/** Tablet target row uses px-4 horizontal padding (16px × 2). */
export const TABLET_ROW_HORIZONTAL_PADDING_PX = 32;

/** View control budget: min-h-11 min-w-11 with px-2 label padding (~56px). */
export const TABLET_VIEW_CONTROL_WIDTH_PX = 56;

/** Two gap-4 (16px) gutters between identity | score | View. */
export const TABLET_ROW_COLUMN_GAPS_PX = 32;

/** Content width for n score buttons on one row — must stay in sync with button/gap classes. */
export function scoreGroupContentWidth(buttonCount: number, gapPx: number): number {
    if (buttonCount <= 0) {
        return 0;
    }
    if (buttonCount === 1) {
        return SCORE_BUTTON_SIZE_PX;
    }
    return buttonCount * SCORE_BUTTON_SIZE_PX + (buttonCount - 1) * gapPx;
}

export function scoreGroupGapPxForType(scoringType: string): number {
    return scoringType === 'yes_no' ? SCORE_BUTTON_GAP_YES_NO_PX : SCORE_BUTTON_GAP_NUMERIC_PX;
}

export function scoreGroupContentWidthForTarget(target: Target, pack: ContentPackData): number {
    const effective = resolveEffectiveScoring(target, pack);
    const buttonCount =
        effective.allowedValues.length > 0
            ? effective.allowedValues.length
            : effective.type === 'yes_no'
              ? 2
              : 0;
    return scoreGroupContentWidth(buttonCount, scoreGroupGapPxForType(effective.type));
}

export function maxScoreGroupContentWidthInDomain(domain: Domain, pack: ContentPackData): number {
    let maxWidth = 0;
    for (const target of domain.targets) {
        maxWidth = Math.max(maxWidth, scoreGroupContentWidthForTarget(target, pack));
    }
    return maxWidth;
}

/** Track width with floor slack — never exactly equal to content when floor applies. */
export function computeTabletScoreTrackWidth(contentWidthPx: number): number {
    return Math.max(TABLET_SCORE_TRACK_WIDTH_FLOOR_PX, contentWidthPx);
}

export function tabletRowIdentityBudgetPx(trackWidthPx: number): number {
    const rowInnerWidth = TABLET_MATRIX_CONTENT_WIDTH_PX - TABLET_ROW_HORIZONTAL_PADDING_PX;
    return rowInnerWidth - trackWidthPx - TABLET_VIEW_CONTROL_WIDTH_PX - TABLET_ROW_COLUMN_GAPS_PX;
}

/** Rule 2: wrap scores to a second row when widening the track would starve identity. */
export function shouldUseTabletScoreWrapLayout(trackWidthPx: number): boolean {
    return tabletRowIdentityBudgetPx(trackWidthPx) < MIN_TABLET_IDENTITY_WIDTH_PX;
}

export function resolveTabletScoreTrackLayout(domain: Domain, pack: ContentPackData): {
    maxContentWidthPx: number;
    trackWidthPx: number;
    useWrapLayout: boolean;
    identityBudgetPx: number;
} {
    const maxContentWidthPx = maxScoreGroupContentWidthInDomain(domain, pack);
    const trackWidthPx = computeTabletScoreTrackWidth(maxContentWidthPx);
    const identityBudgetPx = tabletRowIdentityBudgetPx(trackWidthPx);
    const useWrapLayout = shouldUseTabletScoreWrapLayout(trackWidthPx);
    return { maxContentWidthPx, trackWidthPx, useWrapLayout, identityBudgetPx };
}
