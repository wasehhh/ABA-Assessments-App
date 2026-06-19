import { AssessmentCycle, AssessmentScore, ContentPackData } from '../types';
import {
    CompetencyState,
    interpretTargetScore,
    TargetScoreInterpretation,
} from '../utils/scoreInterpretation';

export type LearnerMapMovement = 'up' | 'down' | 'flat' | 'new' | 'none';

export interface LearnerMapMetadata {
    assessmentId: string;
    packTitle: string;
    packVersion: string;
    generatedAt: string;
}

export interface LearnerMapCycleSummary {
    cycleId: string;
    cycleNumber: number;
    cycleStatus: string | null;
}

export interface LearnerMapCell {
    cycleId: string;
    cycleNumber: number;
    rawScore: number | null;
    displayScoreWithMax: string;
    competencyState: CompetencyState;
    normalizedRatio: number | null;
    isUnscored: boolean;
    movementFromPrevious: LearnerMapMovement;
}

export interface LearnerMapTarget {
    targetId: string;
    title: string;
    cells: LearnerMapCell[];
}

export interface LearnerMapDomain {
    domainId: string;
    title: string;
    targets: LearnerMapTarget[];
}

export interface LearnerMapTotals {
    totalDomains: number;
    totalTargets: number;
    totalCycles: number;
    totalCells: number;
    scoredCells: number;
}

export interface LearnerMapProfile {
    metadata: LearnerMapMetadata;
    cycles: LearnerMapCycleSummary[];
    domains: LearnerMapDomain[];
    totals: LearnerMapTotals;
}

export interface LearnerMapCycleInput {
    cycle: Pick<AssessmentCycle, 'id' | 'cycle_number' | 'status'>;
    scores: AssessmentScore[];
}

export interface BuildLearnerMapProfileInput {
    assessment: {
        id: string;
        pack_snapshot: ContentPackData;
    };
    cycles: LearnerMapCycleInput[];
    generatedAt?: Date;
}

function scoreRowByTargetId(
    scores: AssessmentScore[],
    targetId: string
): AssessmentScore | null {
    return scores.find((row) => row.target_id === targetId) ?? null;
}

function sortCycles(cycles: LearnerMapCycleInput[]): LearnerMapCycleInput[] {
    return [...cycles].sort((a, b) => {
        if (a.cycle.cycle_number !== b.cycle.cycle_number) {
            return a.cycle.cycle_number - b.cycle.cycle_number;
        }
        return a.cycle.id.localeCompare(b.cycle.id);
    });
}

function resolveMovementFromPrevious(
    current: TargetScoreInterpretation,
    previous: TargetScoreInterpretation | null,
    hasPriorCycle: boolean
): LearnerMapMovement {
    if (!hasPriorCycle) {
        return 'none';
    }

    if (current.isUnscored) {
        return 'none';
    }

    if (!previous || previous.isUnscored) {
        return 'new';
    }

    const currentScore = current.rawScore!;
    const previousScore = previous.rawScore!;

    if (currentScore > previousScore) return 'up';
    if (currentScore < previousScore) return 'down';
    return 'flat';
}

function buildTotals(
    domains: LearnerMapDomain[],
    cycleCount: number
): LearnerMapTotals {
    const totalDomains = domains.length;
    const totalTargets = domains.reduce((sum, domain) => sum + domain.targets.length, 0);
    const totalCells = totalTargets * cycleCount;
    const scoredCells = domains.reduce(
        (sum, domain) =>
            sum +
            domain.targets.reduce(
                (targetSum, target) =>
                    targetSum + target.cells.filter((cell) => !cell.isUnscored).length,
                0
            ),
        0
    );

    return {
        totalDomains,
        totalTargets,
        totalCycles: cycleCount,
        totalCells,
        scoredCells,
    };
}

/**
 * Builds an assessment-agnostic Learner Map data profile from pack snapshot and
 * caller-supplied cycle score groups. Pure composition — no fetches.
 */
export function buildLearnerMapProfile(input: BuildLearnerMapProfileInput): LearnerMapProfile {
    const generatedAt = input.generatedAt ?? new Date();
    const sortedCycles = sortCycles(input.cycles);
    const scoresByCycleId = new Map(
        sortedCycles.map(({ cycle, scores }) => [cycle.id, scores])
    );

    const domains: LearnerMapDomain[] = input.assessment.pack_snapshot.domains.map((domain) => ({
        domainId: domain.domain_id,
        title: domain.title,
        targets: domain.targets.map((target) => {
            const cells: LearnerMapCell[] = sortedCycles.map(({ cycle }, cycleIndex) => {
                const scores = scoresByCycleId.get(cycle.id) ?? [];
                const interpretation = interpretTargetScore(
                    target,
                    scoreRowByTargetId(scores, target.target_id)
                );

                let previousInterpretation: TargetScoreInterpretation | null = null;
                if (cycleIndex > 0) {
                    const previousCycle = sortedCycles[cycleIndex - 1].cycle;
                    const previousScores = scoresByCycleId.get(previousCycle.id) ?? [];
                    previousInterpretation = interpretTargetScore(
                        target,
                        scoreRowByTargetId(previousScores, target.target_id)
                    );
                }

                return {
                    cycleId: cycle.id,
                    cycleNumber: cycle.cycle_number,
                    rawScore: interpretation.rawScore,
                    displayScoreWithMax: interpretation.displayScoreWithMax,
                    competencyState: interpretation.competencyState,
                    normalizedRatio: interpretation.normalizedRatio,
                    isUnscored: interpretation.isUnscored,
                    movementFromPrevious: resolveMovementFromPrevious(
                        interpretation,
                        previousInterpretation,
                        cycleIndex > 0
                    ),
                };
            });

            return {
                targetId: target.target_id,
                title: target.title,
                cells,
            };
        }),
    }));

    return {
        metadata: {
            assessmentId: input.assessment.id,
            packTitle: input.assessment.pack_snapshot.title,
            packVersion: input.assessment.pack_snapshot.version,
            generatedAt: generatedAt.toISOString(),
        },
        cycles: sortedCycles.map(({ cycle }) => ({
            cycleId: cycle.id,
            cycleNumber: cycle.cycle_number,
            cycleStatus: cycle.status ?? null,
        })),
        domains,
        totals: buildTotals(domains, sortedCycles.length),
    };
}
