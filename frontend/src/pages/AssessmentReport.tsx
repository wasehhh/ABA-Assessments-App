
import { useEffect, useState, useMemo } from 'react';
import { assessmentService } from '../services/assessments';
import { analyticsService } from '../services/analytics';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCycleStatusLabel } from '../utils/assessmentStatusLabel';

interface Props {
    assessmentId: string;
}

export function AssessmentReport({ assessmentId }: Props) {
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
                const active = cycles.find((c: any) => c.status === 'in_progress') || cycles[0];
                setCurrentCycle(active);

                const s = await assessmentService.getScores(assessmentId, active?.id);
                setScores(s);

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
        if (!assessment?.pack_snapshot) return [];
        return analyticsService.calculateDomainStats(assessment.pack_snapshot, scores);
    }, [assessment, scores]);

    const cycleStats = useMemo(() => analyticsService.calculateCycleStats(domainStats), [domainStats]);

    if (loading) return <div className="min-h-screen flex items-center justify-center p-12 text-gray-500 text-base">Generating report…</div>;
    if (!assessment) return <div className="min-h-screen flex items-center justify-center p-12 text-red-600">Assessment not found</div>;

    const clientName = `${assessment.client?.first_name ?? ''} ${assessment.client?.last_name ?? ''}`.trim() || '—';
    const packLabel = `${assessment.pack_snapshot.title} (v${assessment.pack_snapshot.version})`;
    const reportDateStr = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });
    const recordCreatedStr = assessment.created_at
        ? new Date(assessment.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })
        : null;

    return (
        <div className="assessment-report-print bg-white text-gray-900 min-h-screen max-w-4xl mx-auto px-6 py-10 sm:px-10 sm:py-12 print:min-h-0 print:max-w-none print:px-12 print:py-10 print:text-black">
            {/* Document header — grouped for scan + print */}
            <header className="border-b-2 border-gray-900 pb-8 mb-10 print:border-gray-900 print:pb-6 print:mb-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3 print:text-gray-600">
                    Clinical assessment report
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 leading-tight print:text-2xl">
                    Clinical Skill Assessment
                </h1>

                <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 text-sm print:grid-cols-2 print:gap-y-5">
                    <div className="border-l-2 border-emerald-700/80 pl-4 print:border-gray-800">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">Client</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900 leading-snug print:text-xl">{clientName}</dd>
                    </div>
                    <div className="border-l-2 border-gray-300 pl-4 sm:col-span-1 print:border-gray-400">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">Assessment / pack</dt>
                        <dd className="mt-1 text-base font-medium text-gray-800 leading-snug">{packLabel}</dd>
                    </div>
                    <div className="border-l-2 border-gray-300 pl-4 print:border-gray-400">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">Cycle</dt>
                        <dd className="mt-1 text-base font-medium text-gray-900">
                            {currentCycle ? (
                                <>
                                    Cycle {currentCycle.cycle_number}
                                    <span className="text-gray-600 font-normal"> · {formatCycleStatusLabel(currentCycle.status)}</span>
                                </>
                            ) : (
                                '—'
                            )}
                        </dd>
                    </div>
                    <div className="border-l-2 border-gray-300 pl-4 print:border-gray-400">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">Report date</dt>
                        <dd className="mt-1 text-base font-medium text-gray-900">{reportDateStr}</dd>
                    </div>
                    {recordCreatedStr && (
                        <div className="sm:col-span-2 border-l-2 border-gray-200 pl-4 print:border-gray-300">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">Record created</dt>
                            <dd className="mt-1 text-sm text-gray-700">{recordCreatedStr}</dd>
                        </div>
                    )}
                </dl>
            </header>

            {/* Disclaimer */}
            <div
                role="note"
                className="mb-10 rounded-lg border border-amber-200 bg-amber-50/90 px-5 py-4 print:mb-8 print:border-gray-300 print:bg-gray-50 print:px-4 print:py-3"
            >
                <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 print:text-gray-600 mt-0.5" aria-hidden />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-900 print:text-gray-900">Clinical review only</p>
                        <p className="mt-2 text-sm leading-relaxed text-amber-900/90 print:text-gray-800">
                            This report is a data summary and does NOT constitute a formal insurance claim document without an accompanying narrative addendum.
                        </p>
                    </div>
                </div>
            </div>

            {/* Executive summary */}
            <section className="mb-12 print:mb-10 print:break-inside-auto">
                <h2 className="text-base font-bold uppercase tracking-wide text-gray-900 border-b-2 border-gray-900 pb-2 mb-6 print:mb-5">
                    Executive summary
                </h2>
                <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-6 py-8 sm:px-8 print:border-gray-300 print:bg-white print:px-6 print:py-6">
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
                        <div className="text-center sm:text-left border-b border-gray-200 pb-6 sm:border-b-0 sm:pb-0 print:border-0 print:pb-0">
                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-gray-900 print:text-3xl">{cycleStats.percentage}%</div>
                            <div className="mt-2 text-sm font-medium text-gray-600">Total proficiency</div>
                        </div>
                        <div className="text-center sm:text-left border-b border-gray-200 pb-6 sm:border-b-0 sm:pb-0 print:border-0 print:pb-0">
                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-emerald-700 print:text-emerald-800">
                                {domainStats.reduce((sum, d) => sum + d.scoredCount, 0)}
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-600">Skills assessed</div>
                        </div>
                        <div className="text-center sm:text-left">
                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-blue-800 print:text-blue-900">
                                {assessment.pack_snapshot.domains.length}
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-600">Domains covered</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Domains */}
            <section className="space-y-14 print:space-y-10">
                {domainStats.map((domain) => {
                    const domainDef = assessment.pack_snapshot.domains.find((d: any) => d.domain_id === domain.domainId);

                    return (
                        <div key={domain.domainId} className="break-inside-avoid print:break-inside-auto">
                            <div className="mb-6 flex flex-col gap-2 border-b border-gray-300 pb-4 sm:flex-row sm:items-end sm:justify-between print:mb-4 print:pb-3">
                                <div className="flex flex-wrap items-baseline gap-3">
                                    <h2 className="text-xl font-bold text-gray-900 sm:text-2xl print:text-xl">{domain.title}</h2>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                            domain.percentage >= 80 ? 'bg-emerald-100 text-emerald-900 print:bg-gray-100' : 'bg-gray-100 text-gray-700 print:bg-gray-100'
                                        }`}
                                    >
                                        {domain.percentage}%
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 tabular-nums">
                                    {domain.scoredCount} / {domain.targetCount} skills scored
                                </p>
                            </div>

                            <div className="space-y-4">
                                {domainDef.targets.map((target: any) => {
                                    const score = scores.find((s) => s.target_id === target.target_id);
                                    const val = score?.score ?? 0;
                                    const max = 4;
                                    const width = (val / max) * 100;

                                    return (
                                        <div
                                            key={target.target_id}
                                            className="flex flex-col gap-2 border-b border-gray-100 pb-4 text-sm last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:pb-3 print:border-gray-200 print:pb-3"
                                        >
                                            <span className="min-w-0 flex-1 text-base text-gray-800 leading-snug">{target.title}</span>
                                            <div className="flex shrink-0 items-center gap-3 sm:w-52">
                                                <div className="min-w-0 flex-1 rounded-full bg-gray-100 h-2.5 overflow-hidden print:bg-gray-200">
                                                    <div
                                                        className={`h-full rounded-full ${val === 4 ? 'bg-emerald-600' : val > 0 ? 'bg-amber-400' : 'bg-transparent'}`}
                                                        style={{ width: `${Math.min(width, 100)}%` }}
                                                    />
                                                </div>
                                                <span
                                                    className={`w-10 shrink-0 text-right text-sm font-mono font-bold tabular-nums ${
                                                        val === 4 ? 'text-emerald-700' : val > 0 ? 'text-amber-700' : 'text-gray-400'
                                                    }`}
                                                >
                                                    {val}/{max}
                                                </span>
                                                <div className="w-6 flex justify-center shrink-0">
                                                    {(() => {
                                                        if (!previousScores.length) return null;
                                                        const prevScore = previousScores.find((ps) => ps.target_id === target.target_id);
                                                        const prevVal = prevScore?.score ?? 0;
                                                        if (val > prevVal) return <TrendingUp className="h-4 w-4 text-emerald-600 print:text-gray-800" aria-hidden />;
                                                        if (val < prevVal) return <TrendingDown className="h-4 w-4 text-red-600 print:text-gray-800" aria-hidden />;
                                                        if (val === prevVal && prevScore) return <Minus className="h-4 w-4 text-gray-400 print:text-gray-600" aria-hidden />;
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
            </section>

            <footer className="mt-16 border-t border-gray-300 pt-8 text-center text-xs text-gray-500 print:mt-12 print:border-gray-400 print:pt-6 print:text-gray-600">
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                    <span>Generated by Evalis</span>
                    <span className="tabular-nums">
                        {new Date().toLocaleDateString()} · {new Date().toLocaleTimeString()}
                    </span>
                </div>
            </footer>

            <div className="fixed bottom-8 right-8 z-10 print:hidden">
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-black"
                >
                    Print / Save PDF
                </button>
            </div>
        </div>
    );
}
