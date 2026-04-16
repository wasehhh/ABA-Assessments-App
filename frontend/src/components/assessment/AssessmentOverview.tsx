
import { useMemo } from 'react';
import { DomainStat, CycleStat, analyticsService } from '../../services/analytics';
import { Award, CheckCircle, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';

interface Props {
    domainStats: DomainStat[];
    cycleStats: CycleStat;
    acquisitionCount: number;
    onSelectDomain: (domainId: string) => void;
}

export function AssessmentOverview({ domainStats, cycleStats, acquisitionCount, onSelectDomain }: Props) {
    const narrative = useMemo(() =>
        analyticsService.generateNarrative(domainStats),
        [domainStats]);

    const dataQuality = useMemo(() => {
        // Determine data quality/completeness
        const totalTargets = domainStats.reduce((sum, d) => sum + d.targetCount, 0);
        const totalScored = domainStats.reduce((sum, d) => sum + d.scoredCount, 0);
        if (totalTargets === 0) return 0;
        return Math.round((totalScored / totalTargets) * 100);
    }, [domainStats]);

    return (
        <div className="space-y-8 animate-fade-in">

            {/* Executive Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Progress Card */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Overall Proficiency</h3>
                        <Award className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-900">{cycleStats.percentage}%</span>
                        <span className="text-sm text-gray-400 mb-1">of total points</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                        <div
                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${cycleStats.percentage}%` }}
                        />
                    </div>
                </div>

                {/* Acquisition Card */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Skills Acquired</h3>
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-900">{acquisitionCount}</span>
                        <span className="text-sm text-gray-400 mb-1">new this cycle</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-3 font-medium">Keep it up!</p>
                </div>

                {/* Data Quality Card */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Completeness</h3>
                        <CheckCircle className={`w-5 h-5 ${dataQuality >= 80 ? 'text-green-500' : 'text-amber-500'}`} />
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-900">{dataQuality}%</span>
                        <span className="text-sm text-gray-400 mb-1">targets scored</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                        {dataQuality < 100 ? 'Continue scoring to complete' : 'All targets scored'}
                    </p>
                </div>

                {/* Narrative Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-xl border border-emerald-100 md:col-span-1">
                    <h3 className="text-sm font-bold text-emerald-800 mb-2">Clinical Insights</h3>
                    <div className="space-y-2">
                        {narrative.strengths.length > 0 && (
                            <div className="flex gap-2">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5" />
                                <p className="text-xs text-emerald-700 leading-snug">
                                    <span className="font-semibold">Strengths:</span> {narrative.strengths.join(', ')}
                                </p>
                            </div>
                        )}
                        {narrative.areasForAttention.length > 0 && (
                            <div className="flex gap-2">
                                <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5" />
                                <p className="text-xs text-emerald-700 leading-snug">
                                    <span className="font-semibold">Review:</span> {narrative.areasForAttention.join(', ')}
                                </p>
                            </div>
                        )}
                        {narrative.strengths.length === 0 && narrative.areasForAttention.length === 0 && (
                            <p className="text-xs text-emerald-600 italic">Score more items to generate insights.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Domain Cards Grid (Replacing the Matrix) */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Domains ({domainStats.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {domainStats.map((stat) => (
                        <button
                            key={stat.domainId}
                            onClick={() => onSelectDomain(stat.domainId)}
                            className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all text-left group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                    {stat.title}
                                </h3>
                                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500" />
                            </div>

                            <div className="space-y-3">
                                {/* Progress Bar */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500">Progress</span>
                                        <span className="font-medium text-gray-900">{stat.percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-blue-500' : 'bg-gray-400'}`}
                                            style={{ width: `${stat.percentage}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Stat Badges */}
                                <div className="flex gap-2">
                                    <span className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded border border-gray-200">
                                        {stat.scoredCount}/{stat.targetCount} Scored
                                    </span>
                                    {stat.percentage < 30 && stat.scoredCount > 0 && (
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded border border-amber-200 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Needs Focus
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

        </div>
    );
}
