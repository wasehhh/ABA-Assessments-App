import { Domain, Target } from '../types';
import {
    DisplayTargetGroup,
    groupTargetsForDisplay,
    ResolvedTargetScoring,
} from './assessmentPackStructure';

/**
 * Future work: when all consumers have migrated to the universal pack architecture,
 * score interpretation should consistently resolve scoring through resolveTargetScoring()
 * rather than assuming inline materialized scoring.
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

/** Score button copy: short labels on the button, numeric value preserved in title. */
export function formatMatrixScoreButtonLabel(
    value: number,
    scaleLabels: Record<number, string> | undefined
): { text: string; title: string } {
    const label = scaleLabels?.[value]?.trim();
    if (!label) {
        return { text: String(value), title: String(value) };
    }

    const title = `${value} — ${label}`;
    if (label.length <= 8) {
        return { text: label, title };
    }

    return { text: String(value), title };
}

export function getResolvedScaleValues(scoring: ResolvedTargetScoring): number[] {
    const scoringType = scoring.type as string;

    if (scoringType === 'yes_no' || scoringType === 'yesno') {
        return [0, 1];
    }

    if (scoringType === 'checkbox') {
        if (scoring.scale && scoring.scale.length > 0) {
            return [...scoring.scale];
        }

        const stepCount = scoring.task_steps?.length ?? 0;
        return Array.from({ length: stepCount + 1 }, (_, index) => index);
    }

    if (scoring.scale && scoring.scale.length > 0) {
        return [...scoring.scale];
    }

    return [0, 1, 2, 3, 4];
}
