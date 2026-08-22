import {
    ContentPackData,
    Domain,
    PackDefaultScoring,
    Target,
    TargetScoring,
} from '../types';
import { clonePackDefaultScoring, omitTargetScoring } from './assessmentPackCanonical';
import {
    EffectiveScoringDefinition,
    hasTargetScoringOverride,
    resolveEffectiveScoring,
} from './effectiveScoring';

/**
 * Seed a Custom override from the pack default at the moment of Customize.
 * Founder lock: deep copy of current `default_scoring`, not blank.
 */
export function scoringOverrideFromPackDefault(
    defaultScoring: PackDefaultScoring
): TargetScoring {
    const cloned = clonePackDefaultScoring(defaultScoring);
    return {
        type: cloned.type,
        ...(cloned.scale_id ? { scale_id: cloned.scale_id } : {}),
        ...(cloned.scale ? { scale: [...cloned.scale] } : {}),
        scale_labels: { ...(cloned.scale_labels ?? {}) },
        ...(cloned.task_steps ? { task_steps: [...cloned.task_steps] } : {}),
        no_opportunity_allowed: Boolean(cloned.no_opportunity_allowed),
    };
}

/** Create an Override blob on a target; leaves other targets untouched. */
export function applyCustomizeOverride(
    domains: Domain[],
    domainIndex: number,
    targetIndex: number,
    defaultScoring: PackDefaultScoring
): Domain[] {
    return domains.map((domain, dIndex) => {
        if (dIndex !== domainIndex) {
            return domain;
        }
        return {
            ...domain,
            targets: domain.targets.map((target, tIndex) => {
                if (tIndex !== targetIndex) {
                    return target;
                }
                return {
                    ...target,
                    scoring: scoringOverrideFromPackDefault(defaultScoring),
                };
            }),
        };
    });
}

/** Remove override storage — target becomes Inherited. */
export function applyRevertToInherited(
    domains: Domain[],
    domainIndex: number,
    targetIndex: number
): Domain[] {
    return domains.map((domain, dIndex) => {
        if (dIndex !== domainIndex) {
            return domain;
        }
        return {
            ...domain,
            targets: domain.targets.map((target, tIndex) =>
                tIndex === targetIndex ? omitTargetScoring(target) : target
            ),
        };
    });
}

/**
 * Mutate an existing Override scoring blob only.
 * Never attaches scoring to an Inherited target (B3 §7.3).
 */
export function withExistingOverrideScoring(
    target: Target,
    mutate: (scoring: TargetScoring) => void
): boolean {
    if (!hasTargetScoringOverride(target) || !target.scoring) {
        return false;
    }
    mutate(target.scoring);
    return true;
}

/** Clinician-facing summary of Effective Scoring for Inherited display. */
export function formatEffectiveScoringSummary(
    effective: EffectiveScoringDefinition
): string {
    const typeLabel =
        effective.type === 'yes_no'
            ? 'Yes/No'
            : effective.type === 'checkbox'
              ? 'Task analysis'
              : effective.type === 'text'
                ? 'Text'
                : effective.type === 'numeric'
                  ? 'Numeric'
                  : 'Unknown';

    const parts = [typeLabel];

    if (effective.allowedValues.length > 0) {
        parts.push(`scale ${effective.allowedValues.join(',')}`);
    }
    parts.push(`max ${effective.maxScore}`);

    if (effective.taskSteps && effective.taskSteps.length > 0) {
        parts.push(`${effective.taskSteps.length} steps`);
    }

    const labels = Object.entries(effective.scaleLabels)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([value, label]) => `${value}=${label}`)
        .filter((entry) => !entry.endsWith('='));
    if (labels.length > 0) {
        parts.push(labels.join(', '));
    }

    return parts.join(' · ');
}

/** Resolve Effective Scoring for a Builder working-copy pack. */
export function resolveTargetEffectiveInWorkingPack(
    target: Target,
    workingPack: ContentPackData
): EffectiveScoringDefinition {
    return resolveEffectiveScoring(target, workingPack);
}
