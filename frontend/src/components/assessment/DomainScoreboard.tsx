import { Fragment, useMemo, useState } from 'react';
import { Target, AssessmentScore, ContentPackData, Domain, StructureLabels } from '../../types';
import { analyticsService } from '../../services/analytics';
import { interpretTargetScore } from '../../utils/scoreInterpretation';
import { domainHasSecondaryGroupDisplay } from '../../utils/assessmentPackStructure';
import {
    filterMatrixDisplaySections,
    getMatrixDisplaySections,
} from '../../utils/matrixDisplayHelpers';
import { Search, ArrowUp, ArrowDown, ArrowRight, CheckCircle } from 'lucide-react';
import { TargetScoreControls } from './TargetScoreControls';

interface Props {
    domain: Domain;
    pack: ContentPackData;
    structureLabels: StructureLabels;
    scores: AssessmentScore[];
    previousScores: AssessmentScore[];
    onScoreUpdate: (targetId: string, value: number) => void;
    onViewDetail: (targetId: string) => void;
    onBack: () => void;

    onNavigateDomain: (direction: 'next' | 'prev') => void;
    isFirstDomain: boolean;
    isLastDomain: boolean;
    onSubmit: () => void;
    scoresEditable?: boolean;
    showFooterSubmit?: boolean;
}

export function DomainScoreboard({
    domain,
    pack,
    structureLabels,
    scores,
    previousScores,
    onScoreUpdate,
    onViewDetail,
    onBack,
    onNavigateDomain,
    isFirstDomain,
    isLastDomain,
    onSubmit,
    scoresEditable = true,
    showFooterSubmit = true,
}: Props) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'unscored' | 'at_max'>('all');

    const primaryLabel = structureLabels.primary_group;
    const targetLabel = structureLabels.target;
    const showSecondarySections = domainHasSecondaryGroupDisplay(domain);

    const getScoreRow = (targetId: string, scoreList: AssessmentScore[]) => {
        return scoreList.find((score) => score.target_id === targetId) ?? null;
    };

    const targetMatchesFilters = useMemo(() => {
        return (target: Target) => {
            const scoreRow = getScoreRow(target.target_id, scores);
            const interpretation = interpretTargetScore(target, scoreRow, pack);
            const matchesSearch =
                target.title.toLowerCase().includes(search.toLowerCase()) ||
                target.target_id.toLowerCase().includes(search.toLowerCase());

            const matchesFilter =
                filter === 'all'
                    ? true
                    : filter === 'unscored'
                      ? interpretation.isUnscored
                      : filter === 'at_max'
                        ? interpretation.competencyState === 'at_maximum'
                        : true;

            return matchesSearch && matchesFilter;
        };
    }, [scores, search, filter, pack]);

    const filteredTargets = useMemo(() => {
        return domain.targets.filter(targetMatchesFilters);
    }, [domain.targets, targetMatchesFilters]);

    const filteredSections = useMemo(() => {
        return filterMatrixDisplaySections(
            getMatrixDisplaySections(domain),
            targetMatchesFilters
        );
    }, [domain, targetMatchesFilters]);

    const visibleTargetCount = showSecondarySections
        ? filteredSections.reduce((count, section) => count + section.targets.length, 0)
        : filteredTargets.length;

    const renderTargetRow = (target: Target) => {
        const currentRow = getScoreRow(target.target_id, scores);
        const current = currentRow?.score ?? null;
        const prev = getScoreRow(target.target_id, previousScores)?.score ?? null;
        const trend = analyticsService.calculateTrend(current, prev);
        const interpretation = interpretTargetScore(target, currentRow, pack);
        const isAtMaxScore = interpretation.competencyState === 'at_maximum';

        return (
            <tr key={target.target_id} className="transition-colors hover:bg-gray-50">
                <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                        <div
                            className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${isAtMaxScore ? 'bg-emerald-500' : 'bg-gray-300'}`}
                        />
                        <div>
                            <span className="mr-2 block font-mono text-xs text-gray-500 sm:inline">
                                {target.target_id}
                            </span>
                            <span className="font-medium text-gray-900">{target.title}</span>
                        </div>
                    </div>
                </td>
                <td className="hidden px-6 py-4 sm:table-cell">
                    <div className="flex items-center gap-1">
                        {trend === 'up' && <ArrowUp className="h-4 w-4 text-emerald-500" />}
                        {trend === 'down' && <ArrowDown className="h-4 w-4 text-red-500" />}
                        {trend === 'flat' && <div className="h-0.5 w-4 bg-gray-300" />}
                        {trend === 'new' && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
                                New
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <TargetScoreControls
                        target={target}
                        pack={pack}
                        current={current}
                        scoresEditable={scoresEditable}
                        onScoreUpdate={(val) => onScoreUpdate(target.target_id, val)}
                    />
                </td>
                <td className="px-6 py-4 text-right">
                    <button
                        onClick={() => onViewDetail(target.target_id)}
                        className="text-sm font-medium text-gray-500 hover:text-emerald-600"
                    >
                        View
                    </button>
                </td>
            </tr>
        );
    };

    return (
        <div className="animate-fade-in space-y-6 pb-20">
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="rounded-full p-2 transition-colors hover:bg-gray-100"
                    >
                        <ArrowRight className="h-5 w-5 rotate-180 text-gray-500" />
                    </button>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-gray-900">{domain.title}</h2>
                        <p className="text-sm text-gray-500">
                            {visibleTargetCount} {targetLabel.toLowerCase()}s found
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative hidden sm:block">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={`Search ${targetLabel.toLowerCase()}s...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as 'all' | 'unscored' | 'at_max')}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="all">All {targetLabel}s</option>
                        <option value="unscored">Unscored</option>
                        <option value="at_max">At Maximum Score</option>
                    </select>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-left">
                    <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                            <th className="w-1/2 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                {targetLabel}
                            </th>
                            <th className="hidden px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">
                                Trend
                            </th>
                            <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Score
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Details
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {showSecondarySections
                            ? filteredSections.map((section) => (
                                  <Fragment
                                      key={section.secondary_group_id ?? section.title}
                                  >
                                      <tr className="bg-gray-100/80">
                                          <td
                                              colSpan={4}
                                              className="px-6 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600"
                                          >
                                              {section.title}
                                          </td>
                                      </tr>
                                      {section.targets.map((target) => renderTargetRow(target))}
                                  </Fragment>
                              ))
                            : filteredTargets.map((target) => renderTargetRow(target))}
                    </tbody>
                </table>

                {visibleTargetCount === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        <p>No {targetLabel.toLowerCase()}s found matching your filter.</p>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white p-4 shadow-lg">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <button
                        onClick={() => onNavigateDomain('prev')}
                        disabled={isFirstDomain}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                            isFirstDomain
                                ? 'cursor-not-allowed text-gray-300'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <ArrowRight className="h-4 w-4 rotate-180" />
                        <span className="hidden sm:inline">Previous {primaryLabel}</span>
                        <span className="sm:hidden">Prev</span>
                    </button>

                    {isLastDomain ? (
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!showFooterSubmit}
                            className={`flex items-center gap-2 rounded-lg px-6 py-2 font-bold shadow-sm transition-all ${
                                showFooterSubmit
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'cursor-not-allowed bg-gray-200 text-gray-500'
                            }`}
                        >
                            Submit <span className="hidden sm:inline">Assessment</span>
                            <CheckCircle className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            onClick={() => onNavigateDomain('next')}
                            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800"
                        >
                            <span className="hidden sm:inline">Next {primaryLabel}</span>
                            <span className="sm:hidden">Next</span>
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
