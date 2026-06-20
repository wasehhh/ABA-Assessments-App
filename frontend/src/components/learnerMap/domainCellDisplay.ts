import {
    LearnerMapCell,
    LearnerMapDomain,
    LearnerMapMovement,
} from '../../services/learnerMapProfile';
import { CompetencyState } from '../../utils/scoreInterpretation';
import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';

export interface DomainCellDistributionSegment {
    key: CompetencyState;
    label: string;
    segmentClass: string;
    count: number;
}

export interface DomainCellMovementCounts {
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
    movement: DomainCellMovementCounts;
}

export function collectDomainCells(domain: LearnerMapDomain): LearnerMapCell[] {
    return domain.targets.flatMap((target) => target.cells);
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

    const movement: DomainCellMovementCounts = {
        up: countMovement(cells, 'up'),
        flat: countMovement(cells, 'flat'),
        down: countMovement(cells, 'down'),
        new: countMovement(cells, 'new'),
        none: countMovement(cells, 'none'),
    };

    return {
        targetCount: domain.targets.length,
        totalCells,
        scoredCells,
        coveragePercent,
        distribution,
        movement,
    };
}

function countMovement(cells: LearnerMapCell[], movement: LearnerMapMovement): number {
    return cells.filter((cell) => cell.movementFromPrevious === movement).length;
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
