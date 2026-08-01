import { Target, TargetScoring } from '../types';

/** Dense authoring fallback used only when a surface still expects target-local scoring. */
export const DENSE_TARGET_SCORING_FALLBACK: TargetScoring = {
    type: 'numeric',
    scale: [0, 1, 2, 3, 4],
    scale_labels: {},
    no_opportunity_allowed: false,
};

/**
 * Read target scoring for dense authoring surfaces (Builder, CSV, materialize).
 * Runtime scoring meaning must use resolveEffectiveScoring — not this helper.
 *
 * Until sparse Builder authoring ships, authored packs remain dense; this satisfies
 * TypeScript now that Target.scoring is optional for Inherited targets.
 */
export function denseTargetScoring(target: Target): TargetScoring {
    return target.scoring ?? DENSE_TARGET_SCORING_FALLBACK;
}

/**
 * Ensure a mutable target has a scoring object for dense authoring edits.
 * Does not invent clinical meaning for runtime inheritance — Builder-only.
 */
export function ensureDenseTargetScoring(target: Target): TargetScoring {
    if (!target.scoring) {
        target.scoring = { ...DENSE_TARGET_SCORING_FALLBACK, scale_labels: {} };
    }
    return target.scoring;
}
