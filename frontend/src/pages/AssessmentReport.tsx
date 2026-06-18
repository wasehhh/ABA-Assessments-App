
import { useEffect, useState, useMemo } from 'react';
import { assessmentService } from '../services/assessments';
import { buildReportProfile } from '../services/reportProfile';
import { ReportAssessmentScoreDistribution } from '../components/report/ReportAssessmentScoreDistribution';
import { ReportDomainSummaryTable } from '../components/report/ReportDomainSummaryTable';
import { ReportDomainScoreDistribution } from '../components/report/ReportDomainScoreDistribution';
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

    const report = useMemo(() => {
        if (!assessment?.pack_snapshot) return null;

        return buildReportProfile({
            assessment: {
                id: assessment.id,
                client_id: assessment.client_id,
                pack_snapshot: assessment.pack_snapshot,
                assessment_date: assessment.assessment_date,
                status: assessment.status,
                client: assessment.client,
            },
            cycle: currentCycle
                ? {
                    id: currentCycle.id,
                    cycle_number: currentCycle.cycle_number,
                    status: currentCycle.status,
                }
                : null,
            scores,
            previousScores,
        });
    }, [assessment, currentCycle, scores, previousScores]);

    if (loading) return <div className="min-h-screen flex items-center justify-center p-12 text-gray-500 text-base">Generating report…</div>;
    if (!assessment || !report) return <div className="min-h-screen flex items-center justify-center p-12 text-red-600">Assessment not found</div>;

    const clientName = report.metadata.clientName ?? '—';
    const packLabel = `${report.metadata.packTitle} (v${report.metadata.packVersion})`;
    const reportDateStr = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });
    const recordCreatedStr = assessment.created_at
        ? new Date(assessment.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })
        : null;
    const hasPreviousCycleForTrends = previousScores.length > 0;

    return (
        <div className="assessment-report-print bg-white text-gray-900 min-h-screen max-w-4xl mx-auto px-6 py-10 sm:px-10 sm:py-12 print:min-h-0 print:max-w-none print:px-12 print:py-10 print:text-black">
            {/* Document header — grouped for scan + print */}
            <header className="border-b-2 border-gray-900 pb-8 mb-10 print:border-gray-900 print:pb-6 print:mb-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3 print:text-gray-600">
                    Assessment data report
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 leading-tight print:text-2xl">
                    Assessment Data Report
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
                            {report.metadata.cycleNumber != null ? (
                                <>
                                    Cycle {report.metadata.cycleNumber}
                                    <span className="text-gray-600 font-normal">
                                        {' '}
                                        · {formatCycleStatusLabel(report.metadata.cycleStatus ?? 'in_progress')}
                                    </span>
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
                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-gray-900 print:text-3xl">
                                {report.rollup.pointsCapturedPercentage}%
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-600">Points Captured</div>
                            <p className="mt-1 text-xs text-gray-500">of available points</p>
                        </div>
                        <div className="text-center sm:text-left border-b border-gray-200 pb-6 sm:border-b-0 sm:pb-0 print:border-0 print:pb-0">
                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-emerald-700 print:text-emerald-800">
                                {report.rollup.scoredTargets}
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-600">Coverage</div>
                            <p className="mt-1 text-xs text-gray-500 tabular-nums">
                                {report.rollup.scoredTargets} of {report.rollup.totalTargets} targets scored
                            </p>
                        </div>
                        <div className="text-center sm:text-left">
                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-blue-800 print:text-blue-900">
                                {report.rollup.totalDomains}
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-600">Domains covered</div>
                        </div>
                    </div>

                    <div className="mt-8 border-t border-gray-200 pt-8 print:mt-6 print:border-gray-300 print:pt-6">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900 mb-4 print:mb-3">
                            Assessment Score Distribution
                        </h3>
                        <ReportAssessmentScoreDistribution
                            distribution={report.assessmentBandDistribution}
                        />
                    </div>
                </div>
            </section>

            {/* Domain summary */}
            <section className="mb-12 print:mb-10 print:break-inside-auto">
                <h2 className="text-base font-bold uppercase tracking-wide text-gray-900 border-b-2 border-gray-900 pb-2 mb-6 print:mb-5">
                    Domain summary
                </h2>
                <ReportDomainSummaryTable domains={report.domains} />
            </section>

            <p className="mb-8 text-sm text-gray-600 print:mb-6 print:text-gray-800">
                {hasPreviousCycleForTrends
                    ? 'Trend arrows compare scored targets with the immediately previous cycle.'
                    : 'No previous cycle available for target trend comparison.'}
            </p>

            {/* Domains */}
            <section className="space-y-14 print:space-y-10">
                {report.domains.map((section) => {
                    const { profile } = section;
                    const pointsPercentage = profile.pointsCaptured.percentage;

                    return (
                        <div key={profile.domainId} className="break-inside-avoid print:break-inside-auto">
                            <div className="mb-6 border-b border-gray-300 pb-4 print:mb-4 print:pb-3">
                                <div className="flex flex-wrap items-baseline gap-3">
                                    <h2 className="text-xl font-bold text-gray-900 sm:text-2xl print:text-xl">{profile.title}</h2>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                            pointsPercentage >= 80 ? 'bg-emerald-100 text-emerald-900 print:bg-gray-100' : 'bg-gray-100 text-gray-700 print:bg-gray-100'
                                        }`}
                                    >
                                        Points Captured · {pointsPercentage}%
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-gray-600 tabular-nums">
                                    {profile.coverage.scored} of {profile.coverage.total} targets scored
                                </p>
                                <div className="mt-4 max-w-xl">
                                    <ReportDomainScoreDistribution distribution={profile.stateDistribution} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {section.targets.map((targetRow) => {
                                    const sequenceItem = profile.sequence.find(
                                        (item) => item.target.target_id === targetRow.targetId
                                    );
                                    const barWidth = (targetRow.normalizedRatio ?? 0) * 100;
                                    const barColorClass =
                                        targetRow.competencyState === 'at_maximum'
                                            ? 'bg-emerald-600'
                                            : targetRow.competencyState === 'in_progress'
                                                ? 'bg-amber-400'
                                                : 'bg-transparent';
                                    const scoreTextClass =
                                        targetRow.competencyState === 'at_maximum'
                                            ? 'text-emerald-700'
                                            : targetRow.competencyState === 'in_progress'
                                                ? 'text-amber-700'
                                                : 'text-gray-400';

                                    return (
                                        <div
                                            key={targetRow.targetId}
                                            className="flex flex-col gap-2 border-b border-gray-100 pb-4 text-sm last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:pb-3 print:border-gray-200 print:pb-3"
                                        >
                                            <span className="min-w-0 flex-1 text-base text-gray-800 leading-snug">{targetRow.title}</span>
                                            <div className="flex shrink-0 items-center gap-3 sm:w-52">
                                                <div className="min-w-0 flex-1 rounded-full bg-gray-100 h-2.5 overflow-hidden print:bg-gray-200">
                                                    <div
                                                        className={`h-full rounded-full ${barColorClass}`}
                                                        style={{ width: `${Math.min(barWidth, 100)}%` }}
                                                    />
                                                </div>
                                                <span
                                                    className={`w-10 shrink-0 text-right text-sm font-mono font-bold tabular-nums ${scoreTextClass}`}
                                                >
                                                    {targetRow.displayScoreWithMax}
                                                </span>
                                                <div className="flex w-6 shrink-0 justify-center">
                                                    {(() => {
                                                        if (
                                                            targetRow.competencyState === 'unscored' ||
                                                            !sequenceItem?.previousInterpretation ||
                                                            sequenceItem.previousInterpretation.isUnscored
                                                        ) {
                                                            return null;
                                                        }

                                                        const currentVal = sequenceItem.interpretation.rawScore!;
                                                        const prevVal = sequenceItem.previousInterpretation.rawScore!;

                                                        if (currentVal > prevVal) {
                                                            return (
                                                                <TrendingUp
                                                                    className="h-4 w-4 text-emerald-600 print:text-gray-800"
                                                                    aria-hidden
                                                                />
                                                            );
                                                        }
                                                        if (currentVal < prevVal) {
                                                            return (
                                                                <TrendingDown
                                                                    className="h-4 w-4 text-red-600 print:text-gray-800"
                                                                    aria-hidden
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <Minus
                                                                className="h-4 w-4 text-gray-400 print:text-gray-600"
                                                                aria-hidden
                                                            />
                                                        );
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
