import { describe, expect, it } from 'vitest';
import { LEARNER_MAP_MOCK_SCENARIOS } from '../../../pages/dev/learnerMapMockData';
import {
    deriveAssessmentCoverageSummary,
    deriveAssessmentTargetMovementSummary,
    deriveDomainCellStats,
} from '../domainCellDisplay';
import { resolveAppendixDomains } from '../export/learnerMapExportMode';

const MOVEMENT_KEYS = ['up', 'flat', 'down', 'new', 'none'] as const;

describe('learnerMap export validation (mock scenarios)', () => {
    for (const scenario of LEARNER_MAP_MOCK_SCENARIOS) {
        describe(scenario.label, () => {
            const { profile } = scenario;

            it('keeps assessment coverage within valid bounds', () => {
                const coverage = deriveAssessmentCoverageSummary(profile.domains);

                expect(coverage.targetsAssessed).toBeGreaterThanOrEqual(0);
                expect(coverage.targetsAssessed).toBeLessThanOrEqual(coverage.totalTargets);
                expect(coverage.totalTargets).toBe(profile.totals.totalTargets);
                expect(coverage.coveragePercent).toBeGreaterThanOrEqual(0);
                expect(coverage.coveragePercent).toBeLessThanOrEqual(100);
            });

            it('keeps domain distribution counts aligned with target totals', () => {
                for (const domain of profile.domains) {
                    const stats = deriveDomainCellStats(domain);
                    const distributionTotal = stats.distribution.reduce(
                        (sum, segment) => sum + segment.count,
                        0
                    );
                    const movementTotal = MOVEMENT_KEYS.reduce(
                        (sum, key) => sum + stats.movement[key],
                        0
                    );

                    expect(stats.targetCount).toBe(domain.targets.length);
                    expect(stats.targetsAssessed).toBeLessThanOrEqual(stats.targetCount);
                    expect(distributionTotal).toBe(stats.targetCount);
                    expect(movementTotal).toBe(stats.targetCount);
                    expect(stats.coveragePercent).toBeGreaterThanOrEqual(0);
                    expect(stats.coveragePercent).toBeLessThanOrEqual(100);
                }
            });

            it('keeps assessment-wide movement counts aligned with total targets', () => {
                const movementSummary = deriveAssessmentTargetMovementSummary(profile.domains);
                const movementTotal = MOVEMENT_KEYS.reduce(
                    (sum, key) => sum + movementSummary.movement[key],
                    0
                );

                expect(movementSummary.totalTargets).toBe(profile.totals.totalTargets);
                expect(movementTotal).toBe(profile.totals.totalTargets);
            });

            it('filters selected appendix domains without changing assessment order', () => {
                const selectedIds = profile.domains.slice(0, 2).map((domain) => domain.domainId);
                const appendixDomains = resolveAppendixDomains(
                    profile.domains,
                    'selected-domains',
                    selectedIds
                );

                expect(appendixDomains.map((domain) => domain.domainId)).toEqual(selectedIds);
            });

            it('includes every domain in full export appendix', () => {
                const appendixDomains = resolveAppendixDomains(profile.domains, 'full');

                expect(appendixDomains).toHaveLength(profile.domains.length);
                expect(appendixDomains.map((domain) => domain.domainId)).toEqual(
                    profile.domains.map((domain) => domain.domainId)
                );
            });
        });
    }
});
