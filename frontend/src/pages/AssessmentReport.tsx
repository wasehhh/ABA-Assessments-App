
import { useEffect, useMemo, useRef, useState } from 'react';
import { assessmentService } from '../services/assessments';
import { buildReportProfile } from '../services/reportProfile';
import { ReportAssessmentScoreDistribution } from '../components/report/ReportAssessmentScoreDistribution';
import { ReportDomainSummaryTable } from '../components/report/ReportDomainSummaryTable';
import { ReportDomainScoreDistribution } from '../components/report/ReportDomainScoreDistribution';
import { ReportExportDialog } from '../components/report/export/ReportExportDialog';
import {
    hasReportExportAcknowledged,
    REPORT_EXPORT_MODE,
} from '../components/report/export/reportExportAcknowledgment';
import { logClinicalExportAudit } from '../clinicalExport/clinicalExportAudit';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCycleStatusLabel } from '../utils/assessmentStatusLabel';
import {
    DataLoadErrorPanel,
    DataLoadSecondaryError,
    DataLoadSpinner,
} from '../components/DataLoadSurface';
import {
    executeProtectedLoad,
    type DataLoadState,
} from '../utils/dataLoadHonesty';

interface Props {
    assessmentId: string;
}

export function AssessmentReport({ assessmentId }: Props) {
    const { profile, user } = useAuth();
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [loadState, setLoadState] = useState<DataLoadState>('loading');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [comparisonLoadError, setComparisonLoadError] = useState<string | null>(null);
    const loadRequestRef = useRef(0);
    const [assessment, setAssessment] = useState<any>(null);
    const [scores, setScores] = useState<any[]>([]);
    const [previousScores, setPreviousScores] = useState<any[]>([]);
    const [currentCycle, setCurrentCycle] = useState<any>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        void loadData();
    }, [assessmentId]);

    const loadData = async () => {
        const requestId = ++loadRequestRef.current;
        setLoadState('loading');
        setLoadError(null);
        setComparisonLoadError(null);
        setNotFound(false);

        const primaryResult = await executeProtectedLoad({
            requestId,
            getCurrentRequestId: () => loadRequestRef.current,
            load: async () => {
                const [aData, cycles] = await Promise.all([
                    assessmentService.getById(assessmentId),
                    assessmentService.getCycles(assessmentId),
                ]);
                return { assessment: aData, cycles };
            },
        });

        if (primaryResult.kind === 'stale') {
            return;
        }

        if (primaryResult.kind === 'error') {
            setAssessment(null);
            setScores([]);
            setPreviousScores([]);
            setCurrentCycle(null);
            setLoadError(
                'We could not load this assessment report. Your records are still saved — try again before reviewing or printing.'
            );
            setLoadState('error');
            return;
        }

        const { assessment: aData, cycles } = primaryResult.data;
        if (!aData) {
            setAssessment(null);
            setScores([]);
            setPreviousScores([]);
            setCurrentCycle(null);
            setNotFound(true);
            setLoadState('loaded');
            return;
        }

        const active = cycles.find((c: any) => c.status === 'in_progress') || cycles[0];
        setAssessment(aData);
        setCurrentCycle(active ?? null);

        if (!active?.id) {
            setScores([]);
            setPreviousScores([]);
            setLoadState('loaded');
            return;
        }

        const scoresResult = await executeProtectedLoad({
            requestId,
            getCurrentRequestId: () => loadRequestRef.current,
            load: () => assessmentService.getScores(assessmentId, active.id),
        });

        if (scoresResult.kind === 'stale') {
            return;
        }

        if (scoresResult.kind === 'error') {
            setScores([]);
            setPreviousScores([]);
            setLoadError(
                'We could not load scores for this report. Your records are still saved — try again before reviewing or printing.'
            );
            setLoadState('error');
            return;
        }

        setScores(scoresResult.data);

        if (active.cycle_number > 1) {
            const prevCycle = cycles.find((c: any) => c.cycle_number === active.cycle_number - 1);
            if (prevCycle) {
                const comparisonResult = await executeProtectedLoad({
                    requestId,
                    getCurrentRequestId: () => loadRequestRef.current,
                    load: () => assessmentService.getScores(assessmentId, prevCycle.id),
                });

                if (comparisonResult.kind === 'stale') {
                    return;
                }

                if (comparisonResult.kind === 'error') {
                    setPreviousScores([]);
                    setComparisonLoadError(
                        'We could not load comparison scores for trend arrows. The report below uses the current cycle only — try again to restore trends.'
                    );
                } else {
                    setPreviousScores(comparisonResult.data);
                }
            }
        } else {
            setPreviousScores([]);
        }

        setLoadState('loaded');
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

    if (loadState === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center p-12">
                <DataLoadSpinner label="Generating report…" />
            </div>
        );
    }

    if (loadState === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center p-12">
                <DataLoadErrorPanel
                    title="Assessment report could not be loaded"
                    message={loadError ?? ''}
                    onRetry={() => void loadData()}
                    retryLabel="Retry loading report"
                />
            </div>
        );
    }

    if (notFound || !assessment || !report) {
        return (
            <div className="min-h-screen flex items-center justify-center p-12 text-red-600" data-load-not-found>
                Assessment not found
            </div>
        );
    }

    const clientName = report.metadata.clientName ?? '—';
    const packLabel = `${report.metadata.packTitle} (v${report.metadata.packVersion})`;
    const reportDateStr = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });
    const recordCreatedStr = assessment.created_at
        ? new Date(assessment.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })
        : null;
    const hasPreviousCycleForTrends = previousScores.length > 0;
    const generatedAtStr = new Date(report.metadata.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const primaryLabel = report.structureLabels.primary_group;
    const targetLabel = report.structureLabels.target;

    const runPrint = () => {
        logClinicalExportAudit({
            orgId: profile?.org_id,
            userId: user?.id,
            assessmentId,
            artifact: 'report',
            channel: 'print',
            mode: REPORT_EXPORT_MODE,
            event: 'print',
        });
        window.print();
    };

    const handlePrintClick = () => {
        if (hasReportExportAcknowledged(assessmentId)) {
            runPrint();
            return;
        }
        setPrintDialogOpen(true);
    };

    return (
        <div className="assessment-report-print bg-white text-gray-900 min-h-screen max-w-4xl mx-auto px-6 py-10 sm:px-10 sm:py-12 print:min-h-0 print:max-w-none print:px-10 print:py-8 print:text-black">
            {/* Document header — grouped for scan + print */}
            <header className="border-b-2 border-gray-900 pb-8 mb-10 print:border-gray-900 print:pb-5 print:mb-6 report-section-block">
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
                className="mb-10 rounded-lg border border-amber-200 bg-amber-50/90 px-5 py-4 print:mb-6 print:rounded-none print:border-gray-300 print:bg-gray-50 print:px-4 print:py-3 print:shadow-none report-section-block"
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

            {comparisonLoadError ? (
                <DataLoadSecondaryError
                    message={comparisonLoadError}
                    onRetry={() => void loadData()}
                    retryLabel="Retry loading trends"
                />
            ) : null}

            {/* Executive summary */}
            <section className="mb-12 print:mb-8 report-section-block">
                <h2 className="text-base font-bold uppercase tracking-wide text-gray-900 border-b-2 border-gray-900 pb-2 mb-6 print:mb-4">
                    Executive summary
                </h2>
                <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-6 py-8 sm:px-8 print:rounded-none print:border-gray-300 print:bg-white print:px-5 print:py-5 print:shadow-none">
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6 print:gap-4">
                        <div className="text-center sm:text-left border-b border-gray-200 pb-6 sm:border-b-0 sm:pb-0 print:border-0 print:pb-0">
                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-gray-900 print:text-2xl print:text-black">
                                {report.rollup.pointsCapturedPercentage}%
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-600 print:text-gray-800">Points Captured</div>
                            <p className="mt-1 text-xs text-gray-500 print:text-gray-700">of available points</p>
                        </div>
                        <div className="text-center sm:text-left border-b border-gray-200 pb-6 sm:border-b-0 sm:pb-0 print:border-0 print:pb-0">
                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-emerald-700 print:text-2xl print:text-black">
                                {report.rollup.scoredTargets}
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-600 print:text-gray-800">Coverage</div>
                            <p className="mt-1 text-xs text-gray-500 tabular-nums print:text-gray-700">
                                {report.rollup.scoredTargets} of {report.rollup.totalTargets}{' '}
                                {targetLabel.toLowerCase()}s scored
                            </p>
                        </div>
                        <div className="text-center sm:text-left">
                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-blue-800 print:text-2xl print:text-black">
                                {report.rollup.totalDomains}
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-600 print:text-gray-800">
                                {primaryLabel}s covered
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 border-t border-gray-200 pt-8 print:mt-5 print:border-gray-300 print:pt-5">
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
            <section className="mb-12 print:mb-8 report-section-block">
                <h2 className="text-base font-bold uppercase tracking-wide text-gray-900 border-b-2 border-gray-900 pb-2 mb-6 print:mb-4">
                    {primaryLabel} summary
                </h2>
                <ReportDomainSummaryTable
                    domains={report.domains}
                    structureLabels={report.structureLabels}
                />
            </section>

            <p className="mb-8 text-sm text-gray-600 print:mb-5 print:text-gray-800 report-section-block">
                {hasPreviousCycleForTrends
                    ? `Trend arrows compare scored ${targetLabel.toLowerCase()}s with the immediately previous cycle.`
                    : `No previous cycle available for ${targetLabel.toLowerCase()} trend comparison.`}
            </p>

            {/* Domains */}
            <section className="space-y-14 print:space-y-8">
                {report.domains.map((section) => {
                    const { profile } = section;
                    const pointsPercentage = profile.pointsCaptured.percentage;

                    return (
                        <article key={profile.domainId} className="print:break-inside-auto">
                            <div className="report-domain-header mb-6 border-b border-gray-300 pb-4 print:mb-4 print:pb-3">
                                <div className="flex flex-wrap items-baseline gap-3">
                                    <h2 className="text-xl font-bold text-gray-900 sm:text-2xl print:text-lg">{profile.title}</h2>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold print:rounded-none print:border print:border-gray-400 ${
                                            pointsPercentage >= 80
                                                ? 'bg-emerald-100 text-emerald-900 print:bg-white print:text-black'
                                                : 'bg-gray-100 text-gray-700 print:bg-white print:text-black'
                                        }`}
                                    >
                                        Points Captured · {pointsPercentage}%
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-gray-600 tabular-nums print:text-gray-800">
                                    {profile.coverage.scored} of {profile.coverage.total}{' '}
                                    {targetLabel.toLowerCase()}s scored
                                </p>
                                <div className="mt-4 max-w-xl">
                                    <ReportDomainScoreDistribution distribution={profile.stateDistribution} />
                                </div>
                            </div>

                            <div className="divide-y divide-gray-100 print:divide-gray-200">
                                {(section.targetSections ?? [{ title: '', targets: section.targets }]).map(
                                    (targetSection) => (
                                        <div
                                            key={
                                                targetSection.secondaryGroupId ??
                                                (targetSection.title || 'flat')
                                            }
                                        >
                                            {section.targetSections ? (
                                                <h3 className="bg-gray-50 px-0 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 print:bg-white print:text-gray-800">
                                                    {targetSection.title}
                                                </h3>
                                            ) : null}
                                            {targetSection.targets.map((targetRow) => {
                                                const sequenceItem = profile.sequence.find(
                                                    (item) =>
                                                        item.target.target_id === targetRow.targetId
                                                );
                                                const barWidth =
                                                    (targetRow.normalizedRatio ?? 0) * 100;
                                                const barColorClass =
                                                    targetRow.competencyState === 'at_maximum'
                                                        ? 'bg-emerald-600'
                                                        : targetRow.competencyState === 'in_progress'
                                                          ? 'bg-amber-400'
                                                          : 'bg-transparent';
                                                const scoreTextClass =
                                                    targetRow.competencyState === 'at_maximum'
                                                        ? 'text-emerald-700 print:text-black'
                                                        : targetRow.competencyState === 'in_progress'
                                                          ? 'text-amber-700 print:text-black'
                                                          : 'text-gray-400 print:text-gray-600';

                                                return (
                                                    <div
                                                        key={targetRow.targetId}
                                                        className="report-target-row flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:gap-4 print:py-2.5"
                                                    >
                                                        <span className="min-w-0 flex-1 text-base text-gray-800 leading-snug print:text-[13px]">
                                                            {targetRow.title}
                                                        </span>
                                                        <div className="flex shrink-0 items-center gap-2.5 sm:w-52 print:gap-2">
                                                            <div className="min-w-0 flex-1 rounded-full border border-gray-200 bg-gray-100 h-2.5 overflow-hidden print:border-gray-300 print:bg-gray-200">
                                                                <div
                                                                    className={`h-full rounded-full ${barColorClass} print:border-r print:border-gray-400`}
                                                                    style={{
                                                                        width: `${Math.min(barWidth, 100)}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span
                                                                className={`w-11 shrink-0 text-right text-sm font-mono font-semibold tabular-nums ${scoreTextClass}`}
                                                            >
                                                                {targetRow.displayScoreWithMax}
                                                            </span>
                                                            <div className="flex w-5 shrink-0 justify-center print:w-4">
                                                                {(() => {
                                                                    if (
                                                                        targetRow.competencyState ===
                                                                            'unscored' ||
                                                                        !sequenceItem?.previousInterpretation ||
                                                                        sequenceItem.previousInterpretation
                                                                            .isUnscored
                                                                    ) {
                                                                        return null;
                                                                    }

                                                                    const currentVal =
                                                                        sequenceItem.interpretation
                                                                            .rawScore!;
                                                                    const prevVal =
                                                                        sequenceItem
                                                                            .previousInterpretation
                                                                            .rawScore!;

                                                                    if (currentVal > prevVal) {
                                                                        return (
                                                                            <TrendingUp
                                                                                className="h-3.5 w-3.5 text-emerald-600 print:h-3 print:w-3 print:text-gray-700"
                                                                                aria-hidden
                                                                            />
                                                                        );
                                                                    }
                                                                    if (currentVal < prevVal) {
                                                                        return (
                                                                            <TrendingDown
                                                                                className="h-3.5 w-3.5 text-red-600 print:h-3 print:w-3 print:text-gray-700"
                                                                                aria-hidden
                                                                            />
                                                                        );
                                                                    }
                                                                    return (
                                                                        <Minus
                                                                            className="h-3.5 w-3.5 text-gray-400 print:h-3 print:w-3 print:text-gray-600"
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
                                    )
                                )}
                            </div>
                        </article>
                    );
                })}
            </section>

            <footer className="mt-16 border-t border-gray-300 pt-6 text-xs text-gray-500 print:mt-10 print:border-gray-400 print:pt-4 print:text-gray-700">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span>Generated by Evalis</span>
                    <span className="tabular-nums">{generatedAtStr}</span>
                </div>
            </footer>

            <div className="fixed bottom-8 right-8 z-10 print:hidden">
                <button
                    type="button"
                    onClick={handlePrintClick}
                    className="rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-black"
                >
                    Print / Save PDF
                </button>
            </div>

            <ReportExportDialog
                isOpen={printDialogOpen}
                assessmentId={assessmentId}
                orgId={profile?.org_id}
                userId={user?.id}
                onClose={() => setPrintDialogOpen(false)}
                onAcknowledgedContinue={runPrint}
                continueLabel="Acknowledge and Print"
            />
        </div>
    );
}
