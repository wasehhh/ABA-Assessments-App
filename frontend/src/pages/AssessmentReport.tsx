
import { useEffect, useState, useMemo } from 'react';
import { assessmentService } from '../services/assessments';
import { analyticsService } from '../services/analytics';
import { User, Calendar, Award, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
    assessmentId: string;
}

export function AssessmentReport({ assessmentId }: Props) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [assessment, setAssessment] = useState<any>(null);
    const [scores, setScores] = useState<any[]>([]);
    const [previousScores, setPreviousScores] = useState<any[]>([]);
    const [currentCycle, setCurrentCycle] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [assessmentId]);

    const loadData = async () => {
        try {
            const [aData, cycles] = await Promise.all([
                assessmentService.getById(assessmentId),
                assessmentService.getCycles(assessmentId)
            ]);

            if (aData) {
                setAssessment(aData);
                // Default to active cycle scores if possible, or just all scores for the assessment container
                // Actually matrix loads all scores. But for report we usually want current state.
                // Let's get "Latest" state which is basically 'all scores attached to assessment_id'.
                // In the matrix component, we handle cycle switching. 
                // For the report, we likely want the "Current Active" view.

                const active = cycles.find((c: any) => c.status === 'in_progress') || cycles[0];
                setCurrentCycle(active);

                // Report should reflect the CURRENT state of the child.
                // So we want the scores associated with the active cycle (or last closed if closed).
                const s = await assessmentService.getScores(assessmentId, active?.id);
                setScores(s);

                // Trend Analysis: Get previous cycle scores if available
                if (active && active.cycle_number > 1) {
                    const prevCycle = cycles.find((c: any) => c.cycle_number === active.cycle_number - 1);
                    if (prevCycle) {
                        const prevS = await assessmentService.getScores(assessmentId, prevCycle.id);
                        setPreviousScores(prevS);
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const domainStats = useMemo(() => {
        if (!assessment?.pack_snapshot || !scores.length) return [];
        return analyticsService.calculateDomainStats(assessment.pack_snapshot, scores);
    }, [assessment, scores]);

    const cycleStats = useMemo(() => analyticsService.calculateCycleStats(domainStats), [domainStats]);

    if (loading) return <div className="p-8 text-center text-gray-500">Generating Report...</div>;
    if (!assessment) return <div className="p-8 text-center text-red-500">Assessment not found</div>;

    return (
        <div className="bg-white min-h-screen max-w-5xl mx-auto p-8 print:p-0">
            {/* 1. Header (Print Header) */}
            <header className="border-b-2 border-gray-900 pb-6 mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Clinical Skill Assessment</h1>
                    <p className="text-gray-600 text-lg">{assessment.pack_snapshot.title} (v{assessment.pack_snapshot.version})</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-emerald-800">{assessment.client?.first_name} {assessment.client?.last_name}</h2>
                    <div className="text-sm text-gray-500 mt-1 flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Report Date: {new Date().toLocaleDateString()}</span>
                        </div>
                        {currentCycle && <span className="text-gray-900 font-medium">Cycle {currentCycle.cycle_number} ({currentCycle.status})</span>}
                    </div>
                </div>
            </header>

            {/* Warning Banner */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-8 print:border-gray-300 print:bg-gray-50">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 print:text-gray-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-amber-800 print:text-gray-900 text-sm uppercase">Clinical Review Only</h4>
                        <p className="text-sm text-amber-700 print:text-gray-700 mt-1">
                            This report is a data summary and does NOT constitute a formal insurance claim document without an accompanying narrative addendum.
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. Executive Summary */}
            <section className="mb-10 bg-gray-50 rounded-xl p-6 border border-gray-200 print:border-gray-300 print:bg-white">
                <h3 className="text-sm uppercase tracking-wide text-gray-500 font-bold mb-4 border-b border-gray-200 pb-2">Executive Summary</h3>

                <div className="grid grid-cols-3 gap-8">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-gray-900 mb-1">{cycleStats.percentage}%</div>
                        <div className="text-sm text-gray-600 font-medium">Total Proficiency</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-emerald-600 mb-1">{domainStats.reduce((sum, d) => sum + d.scoredCount, 0)}</div>
                        <div className="text-sm text-gray-600 font-medium">Skills Assessed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-1">{assessment.pack_snapshot.domains.length}</div>
                        <div className="text-sm text-gray-600 font-medium">Domains Covered</div>
                    </div>
                </div>
            </section>

            {/* 3. Domain Radar / Linear List */}
            <section className="space-y-12">
                {domainStats.map(domain => {
                    const domainDef = assessment.pack_snapshot.domains.find((d: any) => d.domain_id === domain.domainId);

                    return (
                        <div key={domain.domainId} className="break-inside-avoid">
                            {/* Domain Header */}
                            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-gray-800">{domain.title}</h3>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${domain.percentage >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {domain.percentage}%
                                    </span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    {domain.scoredCount} / {domain.targetCount} Skills
                                </span>
                            </div>

                            {/* Skill List */}
                            <div className="space-y-3">
                                {domainDef.targets.map((target: any) => {
                                    const score = scores.find(s => s.target_id === target.target_id);
                                    const val = score?.score ?? 0;
                                    const max = 4; // Standardize for visual
                                    const width = (val / max) * 100;

                                    return (
                                        <div key={target.target_id} className="flex items-center gap-4 text-sm group">
                                            {/* Code */}
                                            {/* <span className="w-12 text-gray-400 font-mono text-xs">{target.target_id}</span> */}

                                            {/* Name */}
                                            <span className="flex-1 text-gray-700 group-hover:text-gray-900">
                                                {target.title}
                                            </span>

                                            {/* Visual Bar */}
                                            <div className="w-48 flex items-center gap-3">
                                                <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${val === 4 ? 'bg-emerald-500' : val > 0 ? 'bg-yellow-400' : 'bg-transparent'}`}
                                                        style={{ width: `${Math.min(width, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`w-8 text-right font-mono font-bold ${val === 4 ? 'text-emerald-600' : val > 0 ? 'text-yellow-600' : 'text-gray-300'}`}>
                                                    {val}/{max}
                                                </span>

                                                {/* Trend Indicator */}
                                                <div className="w-6 flex justify-center">
                                                    {(() => {
                                                        // If no previous scores (Cycle 1), show nothing
                                                        if (!previousScores.length) return null;

                                                        const prevScore = previousScores.find(ps => ps.target_id === target.target_id);
                                                        // If target wasn't scored previously, handle accordingly (maybe new?)
                                                        const prevVal = prevScore?.score ?? 0; // Treat unscored as 0 or null? 
                                                        // If current is scored but previous wasn't, strictly it's an improvement from 0

                                                        // Logic: 
                                                        // If current is NULL, show nothing? Or treat as 0? 
                                                        // Let's assume report shows current state. If current is null, val is 0.

                                                        if (val > prevVal) return <TrendingUp className="w-4 h-4 text-emerald-600" />;
                                                        if (val < prevVal) return <TrendingDown className="w-4 h-4 text-red-500" />;
                                                        if (val === prevVal && prevScore) return <Minus className="w-4 h-4 text-gray-300" />;

                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </section >

            <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-xs text-gray-400 flex justify-between">
                <span>Generated by DomainA Tool</span>
                <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
            </footer>

            {/* Floating Print Button (Screen Only) */}
            <div className="fixed bottom-8 right-8 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg hover:bg-black transition-all flex items-center gap-2 font-bold"
                >
                    Print / Save PDF
                </button>
            </div>
        </div >
    );
}
