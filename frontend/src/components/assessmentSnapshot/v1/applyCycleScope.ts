import {
    LearnerMapCycleSummary,
    LearnerMapDomain,
    LearnerMapTarget,
} from '../../../services/learnerMapProfile';
import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';

/**
 * Structurally omit non-selected cycles from the Snapshot profile.
 * Cells for omitted cycles are removed — not CSS-hidden (contract §5.3).
 * Target rows remain even when all of a target's scores fall outside the selection.
 */
export function applyCycleScopeToProfile(
    profile: AssessmentSnapshotProfile,
    includedCycleIds: readonly string[]
): AssessmentSnapshotProfile {
    const included = new Set(includedCycleIds);
    const cycles = profile.cycles.filter((cycle) => included.has(cycle.cycleId));
    const domains = profile.domains.map((domain) => scopeDomain(domain, included));

    return {
        ...profile,
        cycles,
        domains,
    };
}

function scopeDomain(domain: LearnerMapDomain, included: ReadonlySet<string>): LearnerMapDomain {
    const targets = domain.targets.map((target) => scopeTarget(target, included));
    const targetsById = new Map(targets.map((target) => [target.targetId, target]));

    return {
        ...domain,
        targets,
        targetSections: domain.targetSections?.map((section) => ({
            ...section,
            targets: section.targets
                .map((target) => targetsById.get(target.targetId))
                .filter((target): target is LearnerMapTarget => target !== undefined),
        })),
    };
}

function scopeTarget(target: LearnerMapTarget, included: ReadonlySet<string>): LearnerMapTarget {
    return {
        ...target,
        cells: target.cells.filter((cell) => included.has(cell.cycleId)),
    };
}

export function includedCyclesFromIds(
    assessmentCycles: readonly LearnerMapCycleSummary[],
    includedCycleIds: readonly string[]
): LearnerMapCycleSummary[] {
    const included = new Set(includedCycleIds);
    return assessmentCycles.filter((cycle) => included.has(cycle.cycleId));
}
