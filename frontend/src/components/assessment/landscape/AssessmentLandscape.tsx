import { useMemo } from 'react';
import { DomainStat, CycleStat } from '../../services/analytics';
import { DomainProfile } from '../../../services/domainProfile';
import {
    AssessmentLandscapeSortKey,
    buildAssessmentLandscapeRollup,
    sortDomainProfiles,
} from '../../../services/assessmentLandscape';
import { AssessmentExecutiveDashboard } from '../AssessmentExecutiveDashboard';
import { AssessmentLandscapeRow } from './AssessmentLandscapeRow';

interface Props {
    profiles: DomainProfile[];
    domainStats: DomainStat[];
    cycleStats: CycleStat;
    acquisitionCount: number;
    hasComparisonBaseline: boolean;
    sortKey?: AssessmentLandscapeSortKey;
    onSelectDomain?: (domainId: string) => void;
}

export function AssessmentLandscape({
    profiles,
    domainStats,
    cycleStats,
    acquisitionCount,
    hasComparisonBaseline,
    sortKey = 'pack_order',
    onSelectDomain,
}: Props) {
    const rollup = useMemo(() => buildAssessmentLandscapeRollup(profiles), [profiles]);
    const sortedProfiles = useMemo(
        () => sortDomainProfiles(profiles, sortKey),
        [profiles, sortKey]
    );

    if (profiles.length === 0) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
                No domains available.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <AssessmentExecutiveDashboard
                domainStats={domainStats}
                cycleStats={cycleStats}
                acquisitionCount={acquisitionCount}
                hasComparisonBaseline={hasComparisonBaseline}
            />

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                <p className="font-medium text-gray-900">
                    {rollup.totalDomains} {rollup.totalDomains === 1 ? 'domain' : 'domains'} in this assessment
                </p>
                <p className="mt-1 tabular-nums">
                    {rollup.scoredTargets} of {rollup.totalTargets} targets scored
                </p>
                {rollup.incompleteDomains > 0 && (
                    <p className="mt-1 text-gray-600 tabular-nums">
                        {rollup.incompleteDomains}{' '}
                        {rollup.incompleteDomains === 1 ? 'domain has' : 'domains have'} unscored targets
                    </p>
                )}
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {sortedProfiles.map((profile) => (
                    <AssessmentLandscapeRow
                        key={profile.domainId}
                        profile={profile}
                        onSelectDomain={onSelectDomain}
                    />
                ))}
            </div>
        </div>
    );
}
