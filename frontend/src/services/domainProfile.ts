import { AssessmentScore, ContentPackData, Target } from '../types';
import {
    interpretTargetScore,
    TargetScoreInterpretation,
} from '../utils/scoreInterpretation';
import { analyticsService } from './analytics';

export type DomainProfileTrend = 'up' | 'down' | 'flat' | 'new';

export interface StateDistribution {
    unscored: number;
    not_yet: number;
    in_progress: number;
    at_maximum: number;
    showsInProgressBucket: boolean;
}

export interface DomainCycleDelta {
    atMaximumDelta: number;
    newlyScoredDelta: number;
    pointsCapturedDelta: number;
    hasBaseline: boolean;
}

export interface DomainProfileTarget {
    target: Target;
    interpretation: TargetScoreInterpretation;
    previousInterpretation: TargetScoreInterpretation | null;
    trend: DomainProfileTrend;
}

export interface DomainProfile {
    domainId: string;
    title: string;
    coverage: {
        scored: number;
        total: number;
    };
    pointsCaptured: {
        earned: number;
        available: number;
        percentage: number;
    };
    stateDistribution: StateDistribution;
    cycleDelta: DomainCycleDelta | null;
    sequence: DomainProfileTarget[];
}

function scoreRowByTargetId(
    scores: AssessmentScore[],
    targetId: string
): AssessmentScore | null {
    return scores.find((s) => s.target_id === targetId) ?? null;
}

function emptyStateDistribution(): Omit<StateDistribution, 'showsInProgressBucket'> {
    return {
        unscored: 0,
        not_yet: 0,
        in_progress: 0,
        at_maximum: 0,
    };
}

function incrementState(
    distribution: Omit<StateDistribution, 'showsInProgressBucket'>,
    competencyState: TargetScoreInterpretation['competencyState']
): void {
    distribution[competencyState]++;
}

function resolveTrend(
    current: TargetScoreInterpretation,
    previous: TargetScoreInterpretation | null
): DomainProfileTrend {
    if (current.isUnscored) {
        return 'flat';
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

function buildCycleDelta(
    pack: ContentPackData,
    domainTargets: Target[],
    currentScores: AssessmentScore[],
    previousScores: AssessmentScore[],
    currentPercentage: number,
    previousPercentage: number
): DomainCycleDelta {
    let atMaximumDelta = 0;
    let newlyScoredDelta = 0;

    domainTargets.forEach((target) => {
        const currentInterpretation = interpretTargetScore(
            target,
            scoreRowByTargetId(currentScores, target.target_id),
            pack
        );
        const previousInterpretation = interpretTargetScore(
            target,
            scoreRowByTargetId(previousScores, target.target_id),
            pack
        );

        if (
            currentInterpretation.competencyState === 'at_maximum' &&
            previousInterpretation.competencyState !== 'at_maximum'
        ) {
            atMaximumDelta++;
        }

        if (!currentInterpretation.isUnscored && previousInterpretation.isUnscored) {
            newlyScoredDelta++;
        }
    });

    return {
        atMaximumDelta,
        newlyScoredDelta,
        pointsCapturedDelta: currentPercentage - previousPercentage,
        hasBaseline: true,
    };
}

/**
 * Aggregates pack snapshot and cycle scores into per-domain profile data
 * for future Domain Profile visualizations.
 */
export function buildDomainProfiles(
    pack: ContentPackData,
    currentScores: AssessmentScore[],
    previousScores?: AssessmentScore[]
): DomainProfile[] {
    const currentDomainStats = analyticsService.calculateDomainStats(pack, currentScores);
    const hasPreviousBaseline = previousScores != null && previousScores.length > 0;
    const previousDomainStats = hasPreviousBaseline
        ? analyticsService.calculateDomainStats(pack, previousScores!)
        : [];

    const previousStatByDomainId = new Map(
        previousDomainStats.map((stat) => [stat.domainId, stat])
    );

    return pack.domains.map((domain, domainIndex) => {
        const domainStat = currentDomainStats[domainIndex];
        const previousStat = previousStatByDomainId.get(domain.domain_id);

        const stateCounts = emptyStateDistribution();
        let showsInProgressBucket = false;
        const sequence: DomainProfileTarget[] = [];

        domain.targets.forEach((target) => {
            const interpretation = interpretTargetScore(
                target,
                scoreRowByTargetId(currentScores, target.target_id),
                pack
            );
            const previousInterpretation = hasPreviousBaseline
                ? interpretTargetScore(
                    target,
                    scoreRowByTargetId(previousScores!, target.target_id),
                    pack
                )
                : null;

            incrementState(stateCounts, interpretation.competencyState);

            if (interpretation.supportsInProgress) {
                showsInProgressBucket = true;
            }

            sequence.push({
                target,
                interpretation,
                previousInterpretation,
                trend: resolveTrend(interpretation, previousInterpretation),
            });
        });

        const cycleDelta = hasPreviousBaseline
            ? buildCycleDelta(
                pack,
                domain.targets,
                currentScores,
                previousScores!,
                domainStat.percentage,
                previousStat?.percentage ?? 0
            )
            : null;

        return {
            domainId: domain.domain_id,
            title: domain.title,
            coverage: {
                scored: domainStat.scoredCount,
                total: domainStat.targetCount,
            },
            pointsCaptured: {
                earned: domainStat.totalScore,
                available: domainStat.maxScore,
                percentage: domainStat.percentage,
            },
            stateDistribution: {
                ...stateCounts,
                showsInProgressBucket,
            },
            cycleDelta,
            sequence,
        };
    });
}
