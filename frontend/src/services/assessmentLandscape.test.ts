import { describe, it, expect } from 'vitest';
import { DomainProfile } from './domainProfile';
import {
    buildAssessmentLandscapeRollup,
    formatComparisonContext,
    sortDomainProfiles,
} from './assessmentLandscape';

const EMPTY_STATE = {
    unscored: 0,
    not_yet: 0,
    in_progress: 0,
    at_maximum: 0,
    showsInProgressBucket: true,
};

function makeProfile(
    overrides: Partial<DomainProfile> & Pick<DomainProfile, 'domainId' | 'title'>
): DomainProfile {
    return {
        coverage: { scored: 0, total: 10 },
        pointsCaptured: { earned: 0, available: 10, percentage: 0 },
        stateDistribution: { ...EMPTY_STATE },
        cycleDelta: null,
        sequence: [],
        ...overrides,
    };
}

describe('sortDomainProfiles', () => {
    const profiles: DomainProfile[] = [
        makeProfile({
            domainId: 'A',
            title: 'Domain A',
            coverage: { scored: 5, total: 10 },
            pointsCaptured: { earned: 20, available: 40, percentage: 50 },
        }),
        makeProfile({
            domainId: 'B',
            title: 'Domain B',
            coverage: { scored: 2, total: 10 },
            pointsCaptured: { earned: 10, available: 40, percentage: 25 },
        }),
        makeProfile({
            domainId: 'C',
            title: 'Domain C',
            coverage: { scored: 8, total: 10 },
            pointsCaptured: { earned: 30, available: 40, percentage: 75 },
        }),
    ];

    it('preserves pack order without mutating the input', () => {
        const input = [...profiles];
        const sorted = sortDomainProfiles(input, 'pack_order');

        expect(sorted.map((p) => p.domainId)).toEqual(['A', 'B', 'C']);
        expect(input.map((p) => p.domainId)).toEqual(['A', 'B', 'C']);
        expect(sorted).not.toBe(input);
    });

    it('sorts by coverage ascending and descending', () => {
        expect(sortDomainProfiles(profiles, 'coverage_asc').map((p) => p.domainId)).toEqual([
            'B',
            'A',
            'C',
        ]);
        expect(sortDomainProfiles(profiles, 'coverage_desc').map((p) => p.domainId)).toEqual([
            'C',
            'A',
            'B',
        ]);
    });

    it('sorts by points captured ascending and descending', () => {
        expect(sortDomainProfiles(profiles, 'points_asc').map((p) => p.domainId)).toEqual([
            'B',
            'A',
            'C',
        ]);
        expect(sortDomainProfiles(profiles, 'points_desc').map((p) => p.domainId)).toEqual([
            'C',
            'A',
            'B',
        ]);
    });

    it('preserves original order for ties', () => {
        const tiedProfiles: DomainProfile[] = [
            makeProfile({
                domainId: 'FIRST',
                title: 'First',
                coverage: { scored: 5, total: 10 },
                pointsCaptured: { earned: 5, available: 10, percentage: 50 },
            }),
            makeProfile({
                domainId: 'SECOND',
                title: 'Second',
                coverage: { scored: 5, total: 10 },
                pointsCaptured: { earned: 5, available: 10, percentage: 50 },
            }),
        ];

        expect(sortDomainProfiles(tiedProfiles, 'coverage_asc').map((p) => p.domainId)).toEqual([
            'FIRST',
            'SECOND',
        ]);
        expect(sortDomainProfiles(tiedProfiles, 'points_asc').map((p) => p.domainId)).toEqual([
            'FIRST',
            'SECOND',
        ]);
    });
});

describe('buildAssessmentLandscapeRollup', () => {
    it('returns zeros for empty profiles', () => {
        expect(buildAssessmentLandscapeRollup([])).toEqual({
            totalDomains: 0,
            incompleteDomains: 0,
            scoredTargets: 0,
            totalTargets: 0,
            coveragePercentage: 0,
            pointsCapturedPercentage: 0,
        });
    });

    it('aggregates coverage and incomplete domain counts', () => {
        const rollup = buildAssessmentLandscapeRollup([
            makeProfile({
                domainId: 'A',
                title: 'A',
                coverage: { scored: 10, total: 10 },
                pointsCaptured: { earned: 4, available: 10, percentage: 40 },
            }),
            makeProfile({
                domainId: 'B',
                title: 'B',
                coverage: { scored: 3, total: 10 },
                pointsCaptured: { earned: 2, available: 10, percentage: 20 },
            }),
            makeProfile({
                domainId: 'C',
                title: 'C',
                coverage: { scored: 0, total: 10 },
                pointsCaptured: { earned: 0, available: 10, percentage: 0 },
            }),
        ]);

        expect(rollup.totalDomains).toBe(3);
        expect(rollup.incompleteDomains).toBe(2);
        expect(rollup.scoredTargets).toBe(13);
        expect(rollup.totalTargets).toBe(30);
        expect(rollup.coveragePercentage).toBe(43);
    });

    it('uses weighted points captured percentage, not a simple average', () => {
        const rollup = buildAssessmentLandscapeRollup([
            makeProfile({
                domainId: 'HEAVY',
                title: 'Heavy',
                coverage: { scored: 1, total: 100 },
                pointsCaptured: { earned: 1, available: 100, percentage: 1 },
            }),
            makeProfile({
                domainId: 'LIGHT',
                title: 'Light',
                coverage: { scored: 9, total: 10 },
                pointsCaptured: { earned: 9, available: 10, percentage: 90 },
            }),
        ]);

        const simpleAverage = Math.round((1 + 90) / 2);
        expect(rollup.pointsCapturedPercentage).toBe(9);
        expect(rollup.pointsCapturedPercentage).not.toBe(simpleAverage);
    });

    it('handles zero available points safely', () => {
        const rollup = buildAssessmentLandscapeRollup([
            makeProfile({
                domainId: 'EMPTY',
                title: 'Empty',
                coverage: { scored: 0, total: 0 },
                pointsCaptured: { earned: 0, available: 0, percentage: 0 },
            }),
        ]);

        expect(rollup.pointsCapturedPercentage).toBe(0);
        expect(rollup.coveragePercentage).toBe(0);
    });
});

describe('formatComparisonContext', () => {
    it('formats immediate prior baseline comparison', () => {
        expect(
            formatComparisonContext({
                currentCycleNumber: 3,
                baselineCycleNumber: 2,
            })
        ).toEqual({
            currentCycleLabel: 'Cycle 3',
            baselineCycleLabel: 'Cycle 2',
            hasBaseline: true,
            isExplicitComparison: false,
            displayText: 'Cycle 3 · Compared to Cycle 2',
        });
    });

    it('formats explicit selected comparison', () => {
        expect(
            formatComparisonContext({
                currentCycleNumber: 3,
                baselineCycleNumber: 1,
                isExplicitComparison: true,
            })
        ).toEqual({
            currentCycleLabel: 'Cycle 3',
            baselineCycleLabel: 'Cycle 1',
            hasBaseline: true,
            isExplicitComparison: true,
            displayText: 'Cycle 3 · Compared to Cycle 1 (selected)',
        });
    });

    it('formats first cycle with no baseline', () => {
        expect(
            formatComparisonContext({
                currentCycleNumber: 1,
                baselineCycleNumber: null,
            })
        ).toEqual({
            currentCycleLabel: 'Cycle 1',
            baselineCycleLabel: null,
            hasBaseline: false,
            isExplicitComparison: false,
            displayText: 'Cycle 1 · No prior cycle to compare',
        });
    });

    it('handles missing current cycle safely', () => {
        expect(formatComparisonContext({})).toEqual({
            currentCycleLabel: '—',
            baselineCycleLabel: null,
            hasBaseline: false,
            isExplicitComparison: false,
            displayText: 'No active cycle selected',
        });
    });
});
