import { DomainProfile } from './domainProfile';

export type AssessmentLandscapeSortKey =
    | 'pack_order'
    | 'coverage_asc'
    | 'coverage_desc'
    | 'points_asc'
    | 'points_desc';

export interface AssessmentLandscapeRollup {
    totalDomains: number;
    incompleteDomains: number;
    scoredTargets: number;
    totalTargets: number;
    coveragePercentage: number;
    pointsCapturedPercentage: number;
}

export interface ComparisonContext {
    currentCycleLabel: string;
    baselineCycleLabel: string | null;
    hasBaseline: boolean;
    isExplicitComparison: boolean;
    displayText: string;
}

function coveragePercentage(profile: DomainProfile): number {
    if (profile.coverage.total <= 0) {
        return 0;
    }
    return Math.round((profile.coverage.scored / profile.coverage.total) * 100);
}

/**
 * Returns a sorted copy of domain profiles for Assessment Landscape views.
 * Does not mutate the input array.
 */
export function sortDomainProfiles(
    profiles: DomainProfile[],
    sortKey: AssessmentLandscapeSortKey
): DomainProfile[] {
    if (sortKey === 'pack_order') {
        return [...profiles];
    }

    const indexed = profiles.map((profile, index) => ({ profile, index }));

    indexed.sort((a, b) => {
        let comparison = 0;

        switch (sortKey) {
            case 'coverage_asc':
                comparison = coveragePercentage(a.profile) - coveragePercentage(b.profile);
                break;
            case 'coverage_desc':
                comparison = coveragePercentage(b.profile) - coveragePercentage(a.profile);
                break;
            case 'points_asc':
                comparison =
                    a.profile.pointsCaptured.percentage - b.profile.pointsCaptured.percentage;
                break;
            case 'points_desc':
                comparison =
                    b.profile.pointsCaptured.percentage - a.profile.pointsCaptured.percentage;
                break;
            default:
                break;
        }

        if (comparison === 0) {
            return a.index - b.index;
        }
        return comparison;
    });

    return indexed.map(({ profile }) => profile);
}

/**
 * Aggregates assessment-level rollups from already-built domain profiles.
 */
export function buildAssessmentLandscapeRollup(
    profiles: DomainProfile[]
): AssessmentLandscapeRollup {
    if (profiles.length === 0) {
        return {
            totalDomains: 0,
            incompleteDomains: 0,
            scoredTargets: 0,
            totalTargets: 0,
            coveragePercentage: 0,
            pointsCapturedPercentage: 0,
        };
    }

    const scoredTargets = profiles.reduce((sum, profile) => sum + profile.coverage.scored, 0);
    const totalTargets = profiles.reduce((sum, profile) => sum + profile.coverage.total, 0);
    const earnedPoints = profiles.reduce(
        (sum, profile) => sum + profile.pointsCaptured.earned,
        0
    );
    const availablePoints = profiles.reduce(
        (sum, profile) => sum + profile.pointsCaptured.available,
        0
    );
    const incompleteDomains = profiles.filter(
        (profile) => profile.coverage.scored < profile.coverage.total
    ).length;

    return {
        totalDomains: profiles.length,
        incompleteDomains,
        scoredTargets,
        totalTargets,
        coveragePercentage:
            totalTargets > 0 ? Math.round((scoredTargets / totalTargets) * 100) : 0,
        pointsCapturedPercentage:
            availablePoints > 0 ? Math.round((earnedPoints / availablePoints) * 100) : 0,
    };
}

/**
 * Formats cycle comparison labels for Assessment Landscape context display.
 */
export function formatComparisonContext(params: {
    currentCycleNumber?: number | null;
    baselineCycleNumber?: number | null;
    isExplicitComparison?: boolean;
}): ComparisonContext {
    const { currentCycleNumber, baselineCycleNumber, isExplicitComparison = false } = params;

    if (currentCycleNumber == null) {
        return {
            currentCycleLabel: '—',
            baselineCycleLabel: null,
            hasBaseline: false,
            isExplicitComparison: false,
            displayText: 'No active cycle selected',
        };
    }

    const currentCycleLabel = `Cycle ${currentCycleNumber}`;
    const hasBaseline = baselineCycleNumber != null;
    const baselineCycleLabel = hasBaseline ? `Cycle ${baselineCycleNumber}` : null;

    let displayText: string;
    if (!hasBaseline) {
        displayText = `${currentCycleLabel} · No prior cycle to compare`;
    } else if (isExplicitComparison) {
        displayText = `${currentCycleLabel} · Compared to ${baselineCycleLabel} (selected)`;
    } else {
        displayText = `${currentCycleLabel} · Compared to ${baselineCycleLabel}`;
    }

    return {
        currentCycleLabel,
        baselineCycleLabel,
        hasBaseline,
        isExplicitComparison: hasBaseline && isExplicitComparison,
        displayText,
    };
}
