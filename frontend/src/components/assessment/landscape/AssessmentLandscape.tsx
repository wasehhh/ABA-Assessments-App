import { useMemo, useState } from 'react';
import { DomainStat, CycleStat } from '../../services/analytics';
import { DomainProfile } from '../../../services/domainProfile';
import {
    AssessmentLandscapeSortKey,
    buildAssessmentLandscapeRollup,
    ComparisonContext,
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
    comparisonContext: ComparisonContext;
    onSelectDomain?: (domainId: string) => void;
}

const SORT_OPTIONS: { value: AssessmentLandscapeSortKey; label: string }[] = [
    { value: 'pack_order', label: 'Pack order' },
    { value: 'coverage_asc', label: 'Lowest coverage' },
    { value: 'coverage_desc', label: 'Highest coverage' },
];

export function AssessmentLandscape({
    profiles,
    domainStats,
    cycleStats,
    acquisitionCount,
    hasComparisonBaseline,
    comparisonContext,
    onSelectDomain,
}: Props) {
    const [sortKey, setSortKey] = useState<AssessmentLandscapeSortKey>('pack_order');
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
            <div
                className={`rounded-lg border px-4 py-2.5 text-sm ${
                    comparisonContext.hasBaseline
                        ? 'border-blue-100 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
            >
                {comparisonContext.displayText}
            </div>

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
                {rollup.incompleteDomains > 0 && (
                    <p className="mt-1 text-gray-600 tabular-nums">
                        {rollup.incompleteDomains}{' '}
                        {rollup.incompleteDomains === 1 ? 'domain has' : 'domains have'} unscored targets
                    </p>
                )}
            </div>

            <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-gray-700">Domain rows</p>
                    <div
                        className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
                        role="group"
                        aria-label="Sort domain rows"
                    >
                        {SORT_OPTIONS.map((option) => {
                            const isActive = sortKey === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSortKey(option.value)}
                                    aria-pressed={isActive}
                                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
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
        </div>
    );
}
