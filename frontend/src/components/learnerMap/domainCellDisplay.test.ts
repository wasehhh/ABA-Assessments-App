import { describe, expect, it } from 'vitest';
import { LearnerMapCell, LearnerMapDomain, LearnerMapTarget } from '../../services/learnerMapProfile';
import {
    deriveDomainCellStats,
    deriveTargetMovementCounts,
    resolveTargetLatestMovement,
} from './domainCellDisplay';

function makeCell(
    cycleId: string,
    cycleNumber: number,
    movement: LearnerMapCell['movementFromPrevious'],
    isUnscored = false
): LearnerMapCell {
    return {
        cycleId,
        cycleNumber,
        rawScore: isUnscored ? null : 2,
        displayScoreWithMax: isUnscored ? '—' : '2/4',
        competencyState: isUnscored ? 'unscored' : 'in_progress',
        normalizedRatio: isUnscored ? null : 0.5,
        isUnscored,
        movementFromPrevious: movement,
    };
}

function makeTarget(targetId: string, cells: LearnerMapCell[]): LearnerMapTarget {
    return {
        targetId,
        title: targetId,
        cells,
    };
}

function makeDomain(targets: LearnerMapTarget[]): LearnerMapDomain {
    return {
        domainId: 'DOM_1',
        title: 'Domain 1',
        targets,
    };
}

const MOVEMENT_KEYS = ['up', 'flat', 'down', 'new', 'none'] as const;

function movementPercent(count: number, totalTargets: number): number {
    if (totalTargets === 0) {
        return 0;
    }
    return Math.round((count / totalTargets) * 100);
}

function makeLargeDomainTargets(): LearnerMapTarget[] {
    const latestMovementByTarget: LearnerMapCell['movementFromPrevious'][] = [
        ...Array.from({ length: 7 }, () => 'up' as const),
        ...Array.from({ length: 5 }, () => 'down' as const),
        ...Array.from({ length: 8 }, () => 'flat' as const),
        ...Array.from({ length: 6 }, () => 'new' as const),
        ...Array.from({ length: 9 }, () => 'none' as const),
    ];

    return latestMovementByTarget.map((latestMovement, index) => {
        const targetNumber = index + 1;

        if (latestMovement === 'none') {
            return makeTarget(`T${targetNumber}`, [
                makeCell('c1', 1, 'none', true),
                makeCell('c2', 2, 'none', true),
                makeCell('c3', 3, 'none', true),
                makeCell('c4', 4, 'none', true),
            ]);
        }

        return makeTarget(`T${targetNumber}`, [
            makeCell('c1', 1, 'none', true),
            makeCell('c2', 2, 'new'),
            makeCell('c3', 3, 'flat'),
            makeCell('c4', 4, latestMovement),
        ]);
    });
}

describe('domainCellDisplay target movement', () => {
    it('uses the latest scored cycle movement for each target', () => {
        const target = makeTarget('T1', [
            makeCell('c1', 1, 'none', true),
            makeCell('c2', 2, 'new'),
            makeCell('c3', 3, 'up'),
            makeCell('c4', 4, 'flat', true),
        ]);

        expect(resolveTargetLatestMovement(target)).toBe('up');
    });

    it('classifies unscored targets as not compared', () => {
        const target = makeTarget('T1', [
            makeCell('c1', 1, 'none', true),
            makeCell('c2', 2, 'none', true),
        ]);

        expect(resolveTargetLatestMovement(target)).toBe('none');
    });

    it('counts each target in exactly one movement bucket', () => {
        const domain = makeDomain([
            makeTarget('T1', [makeCell('c1', 1, 'up')]),
            makeTarget('T2', [makeCell('c1', 1, 'down')]),
            makeTarget('T3', [makeCell('c1', 1, 'flat')]),
            makeTarget('T4', [makeCell('c1', 1, 'new')]),
            makeTarget('T5', [makeCell('c1', 1, 'none', true)]),
        ]);

        expect(deriveTargetMovementCounts(domain)).toEqual({
            up: 1,
            down: 1,
            flat: 1,
            new: 1,
            none: 1,
        });
    });

    it('derives movement percentages from target count, not cell count', () => {
        const domain = makeDomain([
            makeTarget('T1', [
                makeCell('c1', 1, 'up'),
                makeCell('c2', 2, 'flat'),
                makeCell('c3', 3, 'down'),
            ]),
            makeTarget('T2', [makeCell('c1', 1, 'none', true)]),
        ]);

        const stats = deriveDomainCellStats(domain);

        expect(stats.targetCount).toBe(2);
        expect(stats.totalCells).toBe(4);
        expect(stats.movement.down).toBe(1);
        expect(stats.movement.none).toBe(1);
    });

    it('classifies a first-cycle-only scored target as none (Not Compared)', () => {
        const target = makeTarget('T1', [makeCell('c1', 1, 'none')]);

        expect(resolveTargetLatestMovement(target)).toBe('none');
    });

    it('aggregates a 35-target domain with one bucket per target', () => {
        const domain = makeDomain(makeLargeDomainTargets());
        const stats = deriveDomainCellStats(domain);
        const movement = stats.movement;
        const bucketTotal = MOVEMENT_KEYS.reduce((sum, key) => sum + movement[key], 0);

        expect(domain.targets).toHaveLength(35);
        expect(stats.targetCount).toBe(35);
        expect(stats.totalCells).toBe(140);
        expect(bucketTotal).toBe(stats.targetCount);
        expect(movement.up).toBe(7);
        expect(movement.down).toBe(5);
        expect(movement.flat).toBe(8);
        expect(movement.new).toBe(6);
        expect(movement.none).toBe(9);
        expect(movementPercent(movement.up, stats.targetCount)).toBe(20);
        expect(movementPercent(movement.none, stats.totalCells)).not.toBe(
            movementPercent(movement.none, stats.targetCount)
        );
    });
});
