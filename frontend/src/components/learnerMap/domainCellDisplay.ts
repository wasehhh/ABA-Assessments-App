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
    totalCells: number;
    scoredCells: number;
    coveragePercent: number;
    distribution: DomainCellDistributionSegment[];
    movement: DomainTargetMovementCounts;
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

export function deriveDomainCellStats(domain: LearnerMapDomain): DomainCellDisplayStats {
    const cells = collectDomainCells(domain);
    const totalCells = cells.length;
    const scoredCells = cells.filter((cell) => !cell.isUnscored).length;
    const coveragePercent =
        totalCells === 0 ? 0 : Math.round((scoredCells / totalCells) * 100);

    const distribution = STATE_BUCKET_DISPLAY.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        segmentClass: bucket.segmentClass,
        count: cells.filter((cell) => cell.competencyState === bucket.key).length,
    }));

    return {
        targetCount: domain.targets.length,
        totalCells,
        scoredCells,
        coveragePercent,
        distribution,
        movement: deriveTargetMovementCounts(domain),
    };
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
