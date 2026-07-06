import { Domain, Target } from '../types';

export interface TargetIndexEntry {
    target: Target;
    index: number;
}

function defaultTargetScoring(scale: number[]): Target['scoring'] {
    return {
        type: 'numeric',
        scale,
        scale_labels: {},
        no_opportunity_allowed: true,
    };
}

/** Creates a new target for Builder authoring without mutating the domain. */
export function createBuilderTarget(
    domain: Domain,
    defaultScale: number[],
    secondaryGroupId?: string
): Target {
    return {
        target_id: `${domain.domain_id}${domain.targets.length + 1}`,
        title: '',
        description: '',
        success_criteria: '',
        materials: '',
        examples: '',
        instructions: '',
        notes: '',
        scoring: defaultTargetScoring(defaultScale),
        ...(secondaryGroupId ? { secondary_group_id: secondaryGroupId } : {}),
    };
}

/** Appends a target to domain.targets[]; optional secondary_group_id for grouped authoring. */
export function appendTargetToDomain(
    domain: Domain,
    defaultScale: number[],
    secondaryGroupId?: string
): Domain {
    return {
        ...domain,
        targets: [...domain.targets, createBuilderTarget(domain, defaultScale, secondaryGroupId)],
    };
}

/** Updates only target.secondary_group_id for a target at the given flat index. */
export function moveTargetSecondaryGroup(
    domain: Domain,
    targetIndex: number,
    secondaryGroupId: string | undefined
): Domain {
    const targets = domain.targets.map((target, index) => {
        if (index !== targetIndex) {
            return target;
        }

        if (!secondaryGroupId?.trim()) {
            const { secondary_group_id: _removed, ...rest } = target;
            return rest;
        }

        return { ...target, secondary_group_id: secondaryGroupId };
    });

    return { ...domain, targets };
}

/** Non-mutating view of targets belonging to a secondary group. */
export function getTargetsForSecondaryGroup(
    domain: Domain,
    secondaryGroupId: string
): TargetIndexEntry[] {
    return domain.targets
        .map((target, index) => ({ target, index }))
        .filter(({ target }) => target.secondary_group_id === secondaryGroupId);
}

/** Non-mutating view of targets without secondary_group_id. */
export function getUngroupedTargetEntries(domain: Domain): TargetIndexEntry[] {
    return domain.targets
        .map((target, index) => ({ target, index }))
        .filter(({ target }) => !target.secondary_group_id?.trim());
}
