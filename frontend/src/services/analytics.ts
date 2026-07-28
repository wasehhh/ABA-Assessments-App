import { AssessmentScore, ContentPackData } from '../types';
import { coerceStoredScore } from '../utils/scoreInterpretation';
import { getEffectiveMaxScore } from '../utils/effectiveScoring';

export interface DomainStat {
    domainId: string;
    title: string;
    totalScore: number;
    maxScore: number;
    percentage: number;
    targetCount: number;
    scoredCount: number;
}

export interface CycleStat {
    totalScore: number;
    maxTotalScore: number;
    percentage: number;
    targetsMastered: number; // Count of targets > 0 (or meeting criteria)
}

export const analyticsService = {
    /**
     * Calculates statistics for each domain based on the provided scores and pack structure.
     */
    calculateDomainStats(pack: ContentPackData, scores: AssessmentScore[]): DomainStat[] {
        // Map scores for O(1) lookup
        const scoreMap = new Map<string, number>();
        scores.forEach(s => {
            if (s.score !== null) {
                scoreMap.set(s.target_id, s.score);
            }
        });

        return pack.domains.map(domain => {
            let totalScore = 0;
            let maxScore = 0;
            let scoredCount = 0;

            domain.targets.forEach(target => {
                const targetMax = getEffectiveMaxScore(target, pack);
                maxScore += targetMax;

                const val = scoreMap.get(target.target_id);
                if (val !== undefined && val !== null) {
                    const stored = coerceStoredScore(val);
                    if (stored !== null) {
                        totalScore += stored;
                        scoredCount++;
                    }
                }
            });

            return {
                domainId: domain.domain_id,
                title: domain.title,
                totalScore,
                maxScore,
                percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
                targetCount: domain.targets.length,
                scoredCount
            };
        });
    },

    /**
     * Calculates overall cycle statistics.
     */
    calculateCycleStats(domainStats: DomainStat[]): CycleStat {
        const totalScore = domainStats.reduce((sum, d) => sum + d.totalScore, 0);
        const maxTotalScore = domainStats.reduce((sum, d) => sum + d.maxScore, 0);

        // Approximate "mastered" calculation based on aggregate scores is risky if we don't look at targets.
        // So distinct calculation is better if we want strict "targets mastered" count.
        // For now, let's trust the Caller to provide raw scores if we need granular counts, 
        // but here we can just sum the pre-calc stats.

        return {
            totalScore,
            maxTotalScore,
            percentage: maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0,
            targetsMastered: 0 // Placeholder, requires raw score iteration
        };
    },

    /**
     * Identifies targets that have been "acquired" (moved from 0 or null to > 0) 
     * OR simply exist in current but have score > 0.
     * A strict "Acquisition" requires comparing Prev vs Current.
     */
    calculateAcquisition(
        pack: ContentPackData,
        currentScores: AssessmentScore[],
        prevScores: AssessmentScore[]
    ): { targetId: string; title: string; domainTitle: string; prevScore: number | null; currentScore: number }[] {

        const prevMap = new Map<string, number | null>();
        prevScores.forEach(s => prevMap.set(s.target_id, s.score));

        const acquired: any[] = [];

        // Iterate through all targets in pack to ensure we have titles
        pack.domains.forEach(domain => {
            domain.targets.forEach(target => {
                const currentScoreObj = currentScores.find(s => s.target_id === target.target_id);
                const currentVal = currentScoreObj?.score;
                const prevVal = prevMap.get(target.target_id);

                // Definition of acquisition:
                // 1. Current score > 0
                // 2. Previous score was 0 OR Previous score was null/undefined (newly scored)
                // 3. Current score must be greater than previous score (progression)

                if (
                    currentVal !== undefined &&
                    currentVal !== null &&
                    currentVal > 0
                ) {
                    const prevSafe = prevVal || 0;
                    if (currentVal > prevSafe) {
                        acquired.push({
                            targetId: target.target_id,
                            title: target.title,
                            domainTitle: domain.title,
                            prevScore: prevVal ?? 0,
                            currentScore: currentVal
                        });
                    }
                }
            });
        });

        return acquired;
    },

    /**
     * Identifies improvement or regression trend for a target.
     */
    calculateTrend(currentScore: number | null, prevScore: number | null): 'up' | 'down' | 'flat' | 'new' {
        if (currentScore === null) return 'flat';
        if (prevScore === null) return 'new';
        if (currentScore > prevScore) return 'up';
        if (currentScore < prevScore) return 'down';
        return 'flat';
    },

    /**
     * Generates a simple rule-based narrative summary.
     */
    generateNarrative(domainStats: DomainStat[]): { strengths: string[], areasForAttention: string[] } {
        // Sort by percentage descending
        const sorted = [...domainStats].sort((a, b) => b.percentage - a.percentage);

        const strengths = sorted
            .filter(d => d.percentage >= 80)
            .slice(0, 3)
            .map(d => d.title);

        const areasForAttention = sorted
            .filter(d => d.percentage < 50 && d.scoredCount > 0) // Low score but attempting
            .reverse() // Lowest first
            .slice(0, 3)
            .map(d => d.title);

        if (strengths.length === 0 && sorted.length > 0) {
            strengths.push(sorted[0].title); // Best performer
        }

        return { strengths, areasForAttention };
    },

    /**
     * Calculates data quality metrics for the current assessment cycle.
     */
    calculateDataQuality(pack: ContentPackData, scores: AssessmentScore[]) {
        let totalTargets = 0;
        let scoredCount = 0;
        let lastUpdated: string | null = null;
        let lastScorerId: string | null = null;
        const unscoredDomains: { id: string, title: string }[] = [];

        pack.domains.forEach(domain => {
            let domainScoredCount = 0;
            totalTargets += domain.targets.length;

            domain.targets.forEach(target => {
                const score = scores.find(s => s.target_id === target.target_id);
                if (score?.score !== null && score?.score !== undefined) {
                    scoredCount++;
                    domainScoredCount++;

                    if (!lastUpdated || (score.updated_at && new Date(score.updated_at) > new Date(lastUpdated))) {
                        lastUpdated = score.updated_at;
                        lastScorerId = score.assessor_user_id;
                    } else if (!lastUpdated && score.created_at) { // Fallback to created_at
                        if (!lastUpdated || new Date(score.created_at) > new Date(lastUpdated)) {
                            lastUpdated = score.created_at;
                            lastScorerId = score.assessor_user_id;
                        }
                    }
                }
            });

            if (domainScoredCount === 0 && domain.targets.length > 0) {
                unscoredDomains.push({ id: domain.domain_id, title: domain.title });
            }
        });

        return {
            scoredCount,
            totalTargets,
            completionPercentage: totalTargets > 0 ? Math.round((scoredCount / totalTargets) * 100) : 0,
            lastUpdated,
            lastScorerId,
            unscoredDomains
        };
    },

    /**
     * Compares current cycle stats with previous cycle stats.
     */
    calculateCycleComparison(
        currentStats: CycleStat,
        prevStats: CycleStat | null,
        currentScores: AssessmentScore[],
        prevScores: AssessmentScore[]
    ) {
        if (!prevStats) return null;

        const totalScoreDelta = currentStats.totalScore - prevStats.totalScore;
        const percentageDelta = currentStats.percentage - prevStats.percentage;

        let regressionList: { targetId: string, title: string, prev: number, current: number }[] = [];

        // Map scores for O(1)
        const prevMap = new Map<string, number>();
        prevScores.forEach(s => {
            if (s.score !== null) prevMap.set(s.target_id, s.score);
        });

        currentScores.forEach(curr => {
            if (curr.score !== null) {
                const prevVal = prevMap.get(curr.target_id);
                if (prevVal !== undefined && curr.score < prevVal) {
                    // Need title, but score doesn't have it. 
                    // In a real app we'd map this from the pack or ensure score has metadata.
                    // For now we will rely on UI to fetch title or pass pack, 
                    // BUT to keep signature simple, let's return just IDs and current/prev values
                    // and let UI map to Config if needed, OR we can pass pack here too.
                    // Actually, let's keep it simple: We return IDs. 
                    // Wait, we can't easily get titles here without Pack. 
                    // Let's rely on the caller to have titles or just show ID for MVP debug?
                    // NO, clinical grade needs titles. 
                    // We'll calculate regressions inside calculateAcquisition-like logic 
                    // OR just rely on the fact that we can't get titles easily without Pack.
                    regressionList.push({
                        targetId: curr.target_id,
                        title: '', // Pending pack lookup
                        prev: prevVal,
                        current: curr.score
                    });
                }
            }
        });

        return {
            totalScoreDelta,
            percentageDelta,
            regressionList
        };
    },

    /**
     * Helper to add titles to regressions if pack is available
     */
    enrichRegressions(regressions: any[], pack: ContentPackData) {
        return regressions.map(r => {
            let title = r.targetId;
            // Find title
            for (const d of pack.domains) {
                const t = d.targets.find(t => t.target_id === r.targetId);
                if (t) {
                    title = t.title;
                    break;
                }
            }
            return { ...r, title };
        });
    },

    /**
     * Generates simple clinical insights.
     */
    calculateInsights(domainStats: DomainStat[]) {
        // Sort by percentage desc
        const sorted = [...domainStats].sort((a, b) => b.percentage - a.percentage);

        const strengths = sorted
            .filter(d => d.percentage > 0) // Must have some progress
            .slice(0, 3); // Top 3

        // Needs: Scored but low percentage, OR just lowest percentage?
        // Usually "Needs" implies "Should work on". 
        // Let's define Needs as: Lowest percentage domains that HAVE meaningful target counts (not empty)
        // We reverse list.
        const needs = [...sorted]
            .reverse()
            .filter(d => d.targetCount > 0) // Ignore empty domains
            .slice(0, 3);

        return {
            strengths,
            needs
        };
    }
};
