import { ContentPackData, Domain, Target } from '../types';
import {
    DisplayTargetGroup,
    groupTargetsForDisplay,
    ResolvedTargetScoring,
} from './assessmentPackStructure';
import {
    deriveScaleBoundsFromResolved,
    resolveEffectiveScoring,
} from './effectiveScoring';

/**
 * Matrix display helpers. Scoring-definition attributes must come from Effective Scoring
 * (resolveEffectiveScoring / deriveScaleBoundsFromResolved) — never local fallbacks.
 */

export function getMatrixDisplaySections(domain: Domain): DisplayTargetGroup[] {
    return groupTargetsForDisplay(domain);
}

/** Flat target list in Matrix display order (stable for modal navigation). */
export function flattenMatrixDisplayTargets(domain: Domain): Target[] {
    return getMatrixDisplaySections(domain).flatMap((section) => section.targets);
}

export function filterMatrixDisplaySections(
    sections: DisplayTargetGroup[],
    predicate: (target: Target) => boolean
): DisplayTargetGroup[] {
    return sections
        .map((section) => ({
            ...section,
            targets: section.targets.filter(predicate),
        }))
        .filter((section) => section.targets.length > 0);
}

export function findMatrixSecondaryGroupTitle(
    domain: Domain,
    targetId: string
): string | undefined {
    for (const section of getMatrixDisplaySections(domain)) {
        if (!section.targets.some((target) => target.target_id === targetId)) {
            continue;
        }

        if (section.secondary_group_id || section.title === 'Ungrouped') {
            return section.title;
        }

        return undefined;
    }

    return undefined;
}

/** Score button copy: numeric value on the button; criterion label in title when present. */
export function formatMatrixScoreButtonLabel(
    value: number,
    scaleLabels: Record<number, string> | undefined
): { text: string; title: string } {
    const label = scaleLabels?.[value]?.trim();
    if (!label) {
        return { text: String(value), title: String(value) };
    }

    return { text: String(value), title: `${value} — ${label}` };
}

/**
 * Allowed values for Matrix controls from ResolvedTargetScoring.
 * Delegates to the shared Effective Scoring bound derivation (single fallback policy).
 */
export function getResolvedScaleValues(scoring: ResolvedTargetScoring): number[] {
    return deriveScaleBoundsFromResolved(scoring).allowedValues;
}

/** Find a target by id within a pack snapshot. */
export function findPackTarget(
    pack: ContentPackData | null | undefined,
    targetId: string
): Target | undefined {
    if (!pack) {
        return undefined;
    }
    for (const domain of pack.domains) {
        const target = domain.targets.find((entry) => entry.target_id === targetId);
        if (target) {
            return target;
        }
    }
    return undefined;
}

/** Effective allowed values for Matrix controls (pack context required). */
export function getEffectiveScaleValuesForTarget(
    target: Target,
    pack: ContentPackData
): number[] {
    return resolveEffectiveScoring(target, pack).allowedValues;
}
