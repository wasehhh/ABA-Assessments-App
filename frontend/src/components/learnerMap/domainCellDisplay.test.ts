import { describe, expect, it } from 'vitest';
import { LearnerMapCell, LearnerMapDomain, LearnerMapTarget } from '../../services/learnerMapProfile';
import { CompetencyState } from '../../utils/scoreInterpretation';
import {
    deriveAssessmentCoverageSummary,
    deriveAssessmentTargetMovementSummary,
    deriveDomainCellStats,
    deriveTargetMovementCounts,
    domainHasAnyScoredTargets,
    resolveTargetLatestCompetencyState,
    resolveTargetLatestMovement,
    targetCoveragePercent,
    targetMovementPercent,
} from './domainCellDisplay';

function makeCell(
    cycleId: string,
    cycleNumber: number,
    movement: LearnerMapCell['movementFromPrevious'],
    isUnscored = false,
    competencyState: CompetencyState = isUnscored ? 'unscored' : 'in_progress'
): LearnerMapCell {
    return {
        cycleId,
        cycleNumber,
        rawScore: isUnscored ? null : 2,
        displayScoreWithMax: isUnscored ? '—' : '2/4',
        competencyState,
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

    it('aggregates assessment-wide movement from domain target counts', () => {
        const domainA = makeDomain([
            makeTarget('T1', [makeCell('c1', 1, 'up')]),
            makeTarget('T2', [makeCell('c1', 1, 'up')]),
            makeTarget('T3', [makeCell('c1', 1, 'none', true)]),
        ]);
        const domainB = makeDomain([
            makeTarget('T4', [makeCell('c1', 1, 'down')]),
            makeTarget('T5', [makeCell('c1', 1, 'flat')]),
        ]);
        domainB.domainId = 'DOM_2';
        domainB.title = 'Domain 2';

        const summary = deriveAssessmentTargetMovementSummary([domainA, domainB]);
        const bucketTotal = MOVEMENT_KEYS.reduce(
            (sum, key) => sum + summary.movement[key],
            0
        );

        expect(summary.totalTargets).toBe(5);
        expect(bucketTotal).toBe(summary.totalTargets);
        expect(summary.movement.up).toBe(2);
        expect(summary.movement.down).toBe(1);
        expect(summary.movement.flat).toBe(1);
        expect(summary.movement.none).toBe(1);
        expect(targetMovementPercent(summary.movement.up, summary.totalTargets)).toBe(40);
    });

    it('detects domains with no scored targets for appendix empty states', () => {
        const emptyDomain = makeDomain([
            makeTarget('T1', [makeCell('c1', 1, 'none', true)]),
        ]);
        const scoredDomain = makeDomain([makeTarget('T2', [makeCell('c1', 1, 'up')])]);

        expect(domainHasAnyScoredTargets(emptyDomain)).toBe(false);
        expect(domainHasAnyScoredTargets(scoredDomain)).toBe(true);
    });

    it('calculates coverage from unique assessed targets, not scored cells', () => {
        const domain = makeDomain([
            makeTarget('T1', [
                makeCell('c1', 1, 'up'),
                makeCell('c2', 2, 'flat'),
                makeCell('c3', 3, 'down'),
            ]),
            makeTarget('T2', [makeCell('c1', 1, 'none', true)]),
            makeTarget('T3', [makeCell('c1', 1, 'none', true)]),
        ]);

        const stats = deriveDomainCellStats(domain);

        expect(stats.targetsAssessed).toBe(1);
        expect(stats.targetCount).toBe(3);
        expect(stats.coveragePercent).toBe(33);
        expect(stats.scoredCells).toBe(3);
        expect(stats.totalCells).toBe(5);
    });

    it('derives assessment-wide targets assessed and coverage', () => {
        const domainA = makeDomain([
            makeTarget('T1', [makeCell('c1', 1, 'up')]),
            makeTarget('T2', [makeCell('c1', 1, 'none', true)]),
        ]);
        const domainB = makeDomain([
            makeTarget('T3', [makeCell('c1', 1, 'flat')]),
            makeTarget('T4', [makeCell('c1', 1, 'none', true)]),
            makeTarget('T5', [makeCell('c1', 1, 'none', true)]),
        ]);
        domainB.domainId = 'DOM_2';

        expect(deriveAssessmentCoverageSummary([domainA, domainB])).toEqual({
            targetsAssessed: 2,
            totalTargets: 5,
            coveragePercent: 40,
        });
        expect(targetCoveragePercent(2, 5)).toBe(40);
    });

    describe('L1 latest target score distribution', () => {
        function distributionCount(
            stats: ReturnType<typeof deriveDomainCellStats>,
            key: CompetencyState
        ): number {
            return stats.distribution.find((segment) => segment.key === key)?.count ?? 0;
        }

        it('shows zero unscored when every target has at least one score despite historical unscored cells', () => {
            const domain = makeDomain([
                makeTarget('T1', [
                    makeCell('c1', 1, 'none', true),
                    makeCell('c2', 2, 'new', false, 'in_progress'),
                ]),
                makeTarget('T2', [
                    makeCell('c1', 1, 'none', true),
                    makeCell('c2', 2, 'flat', false, 'at_maximum'),
                ]),
            ]);

            const stats = deriveDomainCellStats(domain);

            expect(stats.coveragePercent).toBe(100);
            expect(distributionCount(stats, 'unscored')).toBe(0);
            expect(distributionCount(stats, 'in_progress')).toBe(1);
            expect(distributionCount(stats, 'at_maximum')).toBe(1);
        });

        it('counts never-scored targets as unscored in distribution', () => {
            const domain = makeDomain([
                makeTarget('T1', [makeCell('c1', 1, 'up', false, 'in_progress')]),
                makeTarget('T2', [makeCell('c1', 1, 'none', true)]),
                makeTarget('T3', [makeCell('c1', 1, 'none', true)]),
            ]);

            const stats = deriveDomainCellStats(domain);

            expect(stats.coveragePercent).toBe(33);
            expect(distributionCount(stats, 'unscored')).toBe(2);
            expect(distributionCount(stats, 'in_progress')).toBe(1);
        });

        it('uses the latest scored competency state for each target', () => {
            const target = makeTarget('T1', [
                makeCell('c1', 1, 'none', false, 'not_yet'),
                makeCell('c2', 2, 'up', false, 'in_progress'),
                makeCell('c3', 3, 'up', false, 'at_maximum'),
            ]);

            expect(resolveTargetLatestCompetencyState(target)).toBe('at_maximum');

            const stats = deriveDomainCellStats(makeDomain([target]));

            expect(distributionCount(stats, 'at_maximum')).toBe(1);
            expect(distributionCount(stats, 'unscored')).toBe(0);
            expect(distributionCount(stats, 'not_yet')).toBe(0);
        });

        it('does not inflate unscored percentage from earlier unscored cycle cells', () => {
            const domain = makeDomain(
                Array.from({ length: 4 }, (_, index) =>
                    makeTarget(`T${index + 1}`, [
                        makeCell('c1', 1, 'none', true),
                        makeCell('c2', 2, 'new', false, 'in_progress'),
                        makeCell('c3', 3, 'flat', false, 'in_progress'),
                    ])
                )
            );

            const stats = deriveDomainCellStats(domain);

            expect(stats.coveragePercent).toBe(100);
            expect(stats.totalCells).toBe(12);
            expect(stats.scoredCells).toBe(8);
            expect(distributionCount(stats, 'unscored')).toBe(0);
            expect(distributionCount(stats, 'in_progress')).toBe(4);
        });
    });
});
