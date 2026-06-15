import { useMemo } from 'react';
import { DomainStat, CycleStat } from '../../services/analytics';
import { Award, CheckCircle, TrendingUp } from 'lucide-react';

interface Props {
    domainStats: DomainStat[];
    cycleStats: CycleStat;
    acquisitionCount: number;
    hasComparisonBaseline: boolean;
}

export function AssessmentExecutiveDashboard({
    domainStats,
    cycleStats,
    acquisitionCount,
    hasComparisonBaseline,
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

    const unscoredTargets = useMemo(() => {
        const totalTargets = domainStats.reduce((sum, d) => sum + d.targetCount, 0);
        const totalScored = domainStats.reduce((sum, d) => sum + d.scoredCount, 0);
        return totalTargets - totalScored;
    }, [domainStats]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Targets with Score Gains</h3>
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                {hasComparisonBaseline ? (
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-900">{acquisitionCount}</span>
                        <span className="text-sm text-gray-400 mb-1">higher than comparison cycle</span>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 leading-snug">No comparison cycle selected</p>
                )}
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Completeness</h3>
                    <CheckCircle className={`w-5 h-5 ${dataQuality >= 80 ? 'text-green-500' : 'text-amber-500'}`} />
                </div>
                <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-gray-900">{dataQuality}%</span>
                    <span className="text-sm text-gray-400 mb-1">of targets scored</span>
                </div>
                <p className="text-xs text-gray-500 mt-3 tabular-nums">
                    {unscoredTargets === 0
                        ? 'All targets have a recorded score'
                        : `${unscoredTargets} ${unscoredTargets === 1 ? 'target' : 'targets'} without a recorded score`}
                </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-xl border border-emerald-100 md:col-span-1">
                <h3 className="text-sm font-bold text-emerald-800 mb-2">Assessment Summary</h3>
                <div className="space-y-2">
                    {summary ? (
                        <>
                            <p className="text-xs text-emerald-800 leading-snug">
                                Highest points captured: {summary.highest.title} ({summary.highest.percentage}%)
                            </p>
                            <p className="text-xs text-emerald-800 leading-snug">
                                Lowest points captured: {summary.lowest.title} ({summary.lowest.percentage}%)
                            </p>
                            <p className="text-xs text-emerald-800 leading-snug tabular-nums">
                                {dataQuality}% of targets scored
                            </p>
                        </>
                    ) : (
                        <p className="text-xs text-emerald-800">No domain targets in this assessment.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
