import { useState, useMemo } from 'react';
import { Target, AssessmentScore } from '../../types';
import { analyticsService } from '../../services/analytics';
import { Search, ArrowUp, ArrowDown, ArrowRight, CheckCircle } from 'lucide-react';

interface Props {
    domainId: string;
    domainTitle: string;
    targets: Target[];
    scores: AssessmentScore[];
    previousScores: AssessmentScore[];
    onScoreUpdate: (targetId: string, value: number) => void;
    onViewDetail: (targetId: string) => void;
    onBack: () => void;

    // Navigation Props
    onNavigateDomain: (direction: 'next' | 'prev') => void;
    isFirstDomain: boolean;
    isLastDomain: boolean;
    onSubmit: () => void;
}

export function DomainScoreboard({
    domainTitle,
    targets,
    scores,
    previousScores,
    onScoreUpdate,
    onViewDetail,
    onBack,
    onNavigateDomain,
    isFirstDomain,
    isLastDomain,
    onSubmit
}: Props) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'unscored' | 'mastered'>('all');

    const getScore = (targetId: string, scoreList: AssessmentScore[]) => {
        return scoreList.find(s => s.target_id === targetId)?.score ?? null;
    };

    const filteredTargets = useMemo(() => {
        return targets.filter(t => {
            const score = getScore(t.target_id, scores);
            const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                t.target_id.toLowerCase().includes(search.toLowerCase());

            const matchesFilter =
                filter === 'all' ? true :
                    filter === 'unscored' ? score === null :
                        filter === 'mastered' ? (score || 0) >= 4 : true;

            return matchesSearch && matchesFilter;
        });
    }, [targets, scores, search, filter]);

    return (
        <div className="space-y-6 animate-fade-in pb-20"> {/* pb-20 for footer space */}
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowRight className="w-5 h-5 rotate-180 text-gray-500" />
                    </button>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-gray-900">{domainTitle}</h2>
                        <p className="text-sm text-gray-500">{filteredTargets.length} targets found</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative hidden sm:block">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search targets..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value="all">All Targets</option>
                        <option value="unscored">Unscored</option>
                        <option value="mastered">Mastered</option>
                    </select>
                </div>
            </div>

            {/* Scoreboard Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/2">Target</th>
                            <th className="hidden sm:table-cell px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trend</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTargets.map(target => {
                            const current = getScore(target.target_id, scores);
                            const prev = getScore(target.target_id, previousScores);
                            const trend = analyticsService.calculateTrend(current, prev);
                            const isMastered = (current || 0) >= 4;

                            return (
                                <tr key={target.target_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${isMastered ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                            <div>
                                                <span className="font-mono text-xs text-gray-500 mr-2 block sm:inline">{target.target_id}</span>
                                                <span className="font-medium text-gray-900">{target.title}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            {trend === 'up' && <ArrowUp className="w-4 h-4 text-emerald-500" />}
                                            {trend === 'down' && <ArrowDown className="w-4 h-4 text-red-500" />}
                                            {trend === 'flat' && <div className="w-4 h-0.5 bg-gray-300" />}
                                            {trend === 'new' && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">New</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1 flex-wrap sm:flex-nowrap">
                                            {/* Cast to string to handle potential legacy 'yes_no' vs strict 'yesno' */}
                                            {((target.scoring.type as string) === 'yes_no' || target.scoring.type === 'yesno') ? (
                                                // Yes/No Controls (0 or 1)
                                                <>
                                                    <button
                                                        onClick={() => onScoreUpdate(target.target_id, 0)}
                                                        className={`
                                                            px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                                                            ${current === 0
                                                                ? 'bg-gray-600 text-white border-gray-600 shadow-sm'
                                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                            }
                                                        `}
                                                    >
                                                        No
                                                    </button>
                                                    <button
                                                        onClick={() => onScoreUpdate(target.target_id, 1)}
                                                        className={`
                                                            px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                                                            ${current === 1
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-200'
                                                            }
                                                        `}
                                                    >
                                                        Yes
                                                    </button>
                                                </>
                                            ) : (
                                                // Standard Numeric Controls (Dynamic Scale)
                                                (() => {
                                                    const scale = (target.scoring.scale && target.scoring.scale.length > 0)
                                                        ? target.scoring.scale
                                                        : [0, 1, 2, 3, 4]; // Default fallback

                                                    return scale.map(val => (
                                                        <button
                                                            key={val}
                                                            onClick={() => onScoreUpdate(target.target_id, val)}
                                                            className={`
                                                                w-8 h-8 rounded-lg text-sm font-medium transition-all
                                                                ${current === val
                                                                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-200'
                                                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-400'
                                                                }
                                                            `}
                                                        >
                                                            {val}
                                                        </button>
                                                    ));
                                                })()
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => onViewDetail(target.target_id)}
                                            className="text-sm text-gray-500 hover:text-emerald-600 font-medium"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredTargets.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        <p>No targets found matching your filter.</p>
                    </div>
                )}
            </div>

            {/* Floating Navigation Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-20">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => onNavigateDomain('prev')}
                        disabled={isFirstDomain}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isFirstDomain ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        <span className="hidden sm:inline">Previous Domain</span>
                        <span className="sm:hidden">Prev</span>
                    </button>

                    {isLastDomain ? (
                        <button
                            onClick={onSubmit}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-sm transition-all"
                        >
                            Submit <span className="hidden sm:inline">Assessment</span>
                            <CheckCircle className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={() => onNavigateDomain('next')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                        >
                            <span className="hidden sm:inline">Next Domain</span>
                            <span className="sm:hidden">Next</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
