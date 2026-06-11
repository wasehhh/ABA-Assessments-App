
import { useMemo } from 'react';
import { DomainStat, CycleStat } from '../../services/analytics';
import { DomainProfile } from '../../services/domainProfile';
import { DomainProfileCard } from './domainProfile';
import { Award, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';

interface Props {
    domainStats: DomainStat[];
    domainProfiles: DomainProfile[];
    cycleStats: CycleStat;
    acquisitionCount: number;
    onSelectDomain: (domainId: string) => void;
}

export function AssessmentOverview({
    domainStats,
    domainProfiles,
    cycleStats,
    acquisitionCount,
    onSelectDomain,
}: Props) {
    const dataQuality = useMemo(() => {
        const totalTargets = domainStats.reduce((sum, d) => sum + d.targetCount, 0);
        const totalScored = domainStats.reduce((sum, d) => sum + d.scoredCount, 0);
        if (totalTargets === 0) return 0;
        return Math.round((totalScored / totalTargets) * 100);
    }, [domainStats]);

    const summary = useMemo(() => {
        const valid = domainStats.filter((d) => d.targetCount > 0);
        if (valid.length === 0) return null;
        const highest = valid.reduce((best, cur) => (cur.percentage > best.percentage ? cur : best), valid[0]);
        const lowest = valid.reduce((worst, cur) => (cur.percentage < worst.percentage ? cur : worst), valid[0]);
        return { highest, lowest };
    }, [domainStats]);

    return (
        <div className="space-y-8 animate-fade-in">

            {/* Executive Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Points Captured Card */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Points Captured</h3>
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
                        <h3 className="text-sm font-medium text-gray-500">Targets with Score Gains</h3>
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-900">{acquisitionCount}</span>
                        <span className="text-sm text-gray-400 mb-1">higher than comparison cycle</span>
                    </div>
                </div>

                {/* Data Quality Card */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Completeness</h3>
                        <CheckCircle className={`w-5 h-5 ${dataQuality >= 80 ? 'text-green-500' : 'text-amber-500'}`} />
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-900">{dataQuality}%</span>
                        <span className="text-sm text-gray-400 mb-1">of targets scored</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                        {dataQuality < 100 ? 'Continue scoring to complete' : 'All targets scored'}
                    </p>
                </div>

                {/* Narrative Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-xl border border-emerald-100 md:col-span-1">
                    <h3 className="text-sm font-bold text-emerald-800 mb-2">Assessment Summary</h3>
                    <div className="space-y-2">
                        {summary ? (
                            <>
                                <div className="flex gap-2">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5" />
                                    <p className="text-xs text-emerald-700 leading-snug">
                                        <span className="font-semibold">Highest points captured:</span> {summary.highest.title} ({summary.highest.percentage}%)
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5" />
                                    <p className="text-xs text-emerald-700 leading-snug">
                                        <span className="font-semibold">Lowest points captured:</span> {summary.lowest.title} ({summary.lowest.percentage}%)
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5" />
                                    <p className="text-xs text-emerald-700 leading-snug">
                                        <span className="font-semibold">{dataQuality}%</span> of targets scored
                                    </p>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-emerald-600 italic">No targets available.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Domain Profile Cards */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Domains ({domainProfiles.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {domainProfiles.map((profile) => (
                        <button
                            key={profile.domainId}
                            type="button"
                            onClick={() => onSelectDomain(profile.domainId)}
                            className="group relative w-full text-left rounded-xl transition-all hover:ring-2 hover:ring-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <DomainProfileCard profile={profile} />
                            <ArrowRight className="absolute top-4 right-4 w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors pointer-events-none" />
                        </button>
                    ))}
                </div>
            </div>

        </div>
    );
}
