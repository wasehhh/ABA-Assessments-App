import {
    LearnerMapCell,
    LearnerMapDomain,
    LearnerMapMovement,
    LearnerMapTarget,
} from '../../services/learnerMapProfile';
import { CompetencyState } from '../../utils/scoreInterpretation';
import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';

export interface DomainCellDistributionSegment {
    key: CompetencyState;
    label: string;
    segmentClass: string;
    count: number;
}

export interface DomainTargetMovementCounts {
    up: number;
    flat: number;
    down: number;
    new: number;
    none: number;
}

export interface DomainCellDisplayStats {
    targetCount: number;
    targetsAssessed: number;
    totalCells: number;
    scoredCells: number;
    coveragePercent: number;
    distribution: DomainCellDistributionSegment[];
    movement: DomainTargetMovementCounts;
}

export function targetHasBeenScored(target: LearnerMapTarget): boolean {
    return target.cells.some((cell) => !cell.isUnscored);
}

export function countTargetsAssessed(targets: LearnerMapTarget[]): number {
    return targets.filter(targetHasBeenScored).length;
}

export function targetCoveragePercent(targetsAssessed: number, totalTargets: number): number {
    if (totalTargets === 0) {
        return 0;
    }

    return Math.round((targetsAssessed / totalTargets) * 100);
}

export interface AssessmentCoverageSummary {
    targetsAssessed: number;
    totalTargets: number;
    coveragePercent: number;
}

export function deriveAssessmentCoverageSummary(
    domains: LearnerMapDomain[]
): AssessmentCoverageSummary {
    let targetsAssessed = 0;
    let totalTargets = 0;

    for (const domain of domains) {
        totalTargets += domain.targets.length;
        targetsAssessed += countTargetsAssessed(domain.targets);
    }

    return {
        targetsAssessed,
        totalTargets,
        coveragePercent: targetCoveragePercent(targetsAssessed, totalTargets),
    };
}

export function collectDomainCells(domain: LearnerMapDomain): LearnerMapCell[] {
    return domain.targets.flatMap((target) => target.cells);
}

/**
 * L1 uses each target's latest scored cell movement status.
 * Targets without a valid comparison resolve to none (Not Compared).
 * Compares against the immediately prior cycle per profile rules.
 */
export function resolveTargetLatestMovement(target: LearnerMapTarget): LearnerMapMovement {
    const scoredCells = target.cells.filter((cell) => !cell.isUnscored);
    if (scoredCells.length === 0) {
        return 'none';
    }

    return scoredCells[scoredCells.length - 1].movementFromPrevious;
}

/**
 * L1 score distribution uses each target's latest scored competency state.
 * Targets with no scored cycles remain Unscored.
 */
export function resolveTargetLatestCompetencyState(target: LearnerMapTarget): CompetencyState {
    const scoredCells = target.cells.filter((cell) => !cell.isUnscored);
    if (scoredCells.length === 0) {
        return 'unscored';
    }

    return scoredCells[scoredCells.length - 1].competencyState;
}

export function deriveLatestTargetStateDistribution(
    domain: LearnerMapDomain
): DomainCellDistributionSegment[] {
    return STATE_BUCKET_DISPLAY.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        segmentClass: bucket.segmentClass,
        count: domain.targets.filter(
            (target) => resolveTargetLatestCompetencyState(target) === bucket.key
        ).length,
    }));
}

export function deriveTargetMovementCounts(domain: LearnerMapDomain): DomainTargetMovementCounts {
    const movement: DomainTargetMovementCounts = {
        up: 0,
        flat: 0,
        down: 0,
        new: 0,
        none: 0,
    };

    for (const target of domain.targets) {
        movement[resolveTargetLatestMovement(target)] += 1;
    }

    return movement;
}

export interface AssessmentTargetMovementSummary {
    movement: DomainTargetMovementCounts;
    totalTargets: number;
}

export function deriveAssessmentTargetMovementSummary(
    domains: LearnerMapDomain[]
): AssessmentTargetMovementSummary {
    const movement: DomainTargetMovementCounts = {
        up: 0,
        flat: 0,
        down: 0,
        new: 0,
        none: 0,
    };

    let totalTargets = 0;

    for (const domain of domains) {
        const domainMovement = deriveTargetMovementCounts(domain);
        totalTargets += domain.targets.length;
        movement.up += domainMovement.up;
        movement.flat += domainMovement.flat;
        movement.down += domainMovement.down;
        movement.new += domainMovement.new;
        movement.none += domainMovement.none;
    }

    return { movement, totalTargets };
}

export function targetMovementPercent(count: number, totalTargets: number): number {
    if (totalTargets === 0) {
        return 0;
    }

    return Math.round((count / totalTargets) * 100);
}

/**
 * Largest-remainder allocation so segment bar widths sum to 100% when any targets exist.
 * Prevents visual gaps from independent Math.round on each bucket.
 */
export function computeRoundedPercentWidths(counts: number[], total: number): number[] {
    if (total <= 0 || counts.length === 0) {
        return counts.map(() => 0);
    }

    const exactPercents = counts.map((count) => (count / total) * 100);
    const widths = exactPercents.map((percent) => Math.floor(percent));
    let remainder = 100 - widths.reduce((sum, width) => sum + width, 0);

    const rankedByFraction = exactPercents
        .map((percent, index) => ({
            index,
            fraction: percent - Math.floor(percent),
            count: counts[index],
        }))
        .filter((entry) => entry.count > 0)
        .sort((left, right) => {
            if (right.fraction !== left.fraction) {
                return right.fraction - left.fraction;
            }

            return left.index - right.index;
        });

    for (let slot = 0; slot < remainder && rankedByFraction.length > 0; slot += 1) {
        widths[rankedByFraction[slot % rankedByFraction.length].index] += 1;
    }

    return widths;
}

export function distributionSegmentDisplayPercent(count: number, total: number): number {
    if (total === 0 || count === 0) {
        return 0;
    }

    const rounded = Math.round((count / total) * 100);
    return rounded === 0 ? 1 : rounded;
}

export function deriveDomainCellStats(domain: LearnerMapDomain): DomainCellDisplayStats {
    const cells = collectDomainCells(domain);
    const totalCells = cells.length;
    const scoredCells = cells.filter((cell) => !cell.isUnscored).length;
    const targetCount = domain.targets.length;
    const targetsAssessed = countTargetsAssessed(domain.targets);
    const coveragePercent = targetCoveragePercent(targetsAssessed, targetCount);

    const distribution = deriveLatestTargetStateDistribution(domain);

    return {
        targetCount,
        targetsAssessed,
        totalCells,
        scoredCells,
        coveragePercent,
        distribution,
        movement: deriveTargetMovementCounts(domain),
    };
}

export function domainHasAnyScoredTargets(domain: LearnerMapDomain): boolean {
    return domain.targets.some((target) =>
        target.cells.some((cell) => !cell.isUnscored)
    );
}

export function cycleRowCoverage(
    domain: LearnerMapDomain,
    cycleId: string
): { scored: number; total: number } {
    const rowCells = domain.targets.map(
        (target) => target.cells.find((cell) => cell.cycleId === cycleId) ?? null
    );
    const total = rowCells.length;
    const scored = rowCells.filter((cell) => cell !== null && !cell.isUnscored).length;
    return { scored, total };
}
