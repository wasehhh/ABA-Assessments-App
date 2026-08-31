import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { assessmentService } from '../services/assessments';
import { reportAuthoringService } from '../services/reportAuthoring';
import {
    canPrintFinalizedReport,
    canViewFinalizedReport,
} from '../services/reportAuthoringRoles';
import { AssessmentCommunicationReport } from '../services/reportAuthoringTypes';
import { FinalizedReportDocument } from '../components/report/FinalizedReportDocument';
import { ReportExportDialog } from '../components/report/export/ReportExportDialog';
import {
    hasReportExportAcknowledged,
    REPORT_EXPORT_MODE,
} from '../components/report/export/reportExportAcknowledgment';
import { logClinicalExportAudit } from '../clinicalExport/clinicalExportAudit';
import {
    DataLoadErrorPanel,
    DataLoadSpinner,
} from '../components/DataLoadSurface';
import {
    defaultStructureLabelsFromPack,
    finalizedReportAllowsPrintEmission,
    finalizedReportHasRenderableSnapshot,
    FINALIZED_REPORT_PRINT_UNAVAILABLE_MESSAGE,
    buildCommunicationReportPrintFilename,
} from '../utils/finalizedReportPresentation';
import {
    buildDocumentsIndexRouteHash,
    buildVersionHistoryRouteHash,
    readFinalizedReportCycleIdFromHash,
    readFinalizedReportVersionQueryFromHash,
} from './assessmentMatrixReportEntry';
import { shouldShowVersionHistoryLink } from './issuedReportVersions';
import { logReportDocumentViewAudit } from '../clinicalExport/reportViewAudit';
import { executeProtectedLoad, type DataLoadState } from '../utils/dataLoadHonesty';

interface Props {
    assessmentId: string;
}

export function FinalizedAssessmentReport({ assessmentId }: Props) {
    const { profile, user } = useAuth();
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [loadState, setLoadState] = useState<DataLoadState>('loading');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [notFinalized, setNotFinalized] = useState(false);
    const loadRequestRef = useRef(0);
    const [assessment, setAssessment] = useState<any>(null);
    const [reportRow, setReportRow] = useState<AssessmentCommunicationReport | null>(null);
    const [currentIssuedVersion, setCurrentIssuedVersion] = useState<number | null>(null);
    const [showVersionHistory, setShowVersionHistory] = useState(false);

    const cycleId = readFinalizedReportCycleIdFromHash();
    const versionQuery = readFinalizedReportVersionQueryFromHash();
    const versionQueryKey =
        versionQuery.kind === 'specific' ? `v${versionQuery.version}` : versionQuery.kind;
    const canView = canViewFinalizedReport(profile?.role);
    const canPrint = canPrintFinalizedReport(profile?.role);

    useEffect(() => {
        void loadData();
    }, [assessmentId, cycleId, versionQueryKey, canView]);

    const loadData = async () => {
        const requestId = ++loadRequestRef.current;
        setLoadState('loading');
        setLoadError(null);
        setAccessDenied(false);
        setNotFinalized(false);
        setAssessment(null);
        setReportRow(null);
        setCurrentIssuedVersion(null);
        setShowVersionHistory(false);

        if (!canView) {
            setAccessDenied(true);
            setLoadState('loaded');
            return;
        }

        if (!cycleId) {
            setNotFinalized(true);
            setLoadState('loaded');
            return;
        }

        if (versionQuery.kind === 'invalid') {
            setNotFinalized(true);
            setLoadState('loaded');
            return;
        }

        const primaryResult = await executeProtectedLoad({
            requestId,
            getCurrentRequestId: () => loadRequestRef.current,
            load: async () => {
                const [assessmentData, currentRow, versions] = await Promise.all([
                    assessmentService.getById(assessmentId),
                    reportAuthoringService.getCurrentFinalizedVersion(assessmentId, cycleId),
                    reportAuthoringService.listReportVersions(assessmentId, cycleId),
                ]);
                return { assessment: assessmentData, currentRow, versions };
            },
        });

        if (primaryResult.kind === 'stale') {
            return;
        }

        if (primaryResult.kind === 'error') {
            setLoadError(
                'We could not load this finalized report. Your records are still saved — try again.'
            );
            setLoadState('error');
            return;
        }

        const { assessment: assessmentData, currentRow, versions } = primaryResult.data;

        if (!assessmentData) {
            setLoadError('Assessment not found.');
            setLoadState('error');
            return;
        }

        setAssessment(assessmentData);
        setCurrentIssuedVersion(currentRow?.version ?? null);
        setShowVersionHistory(shouldShowVersionHistoryLink(versions));

        let selectedRow = currentRow;
        if (versionQuery.kind === 'specific') {
            const match = versions.find(
                (row) =>
                    row.version === versionQuery.version &&
                    (row.status === 'finalized' || row.status === 'superseded')
            );
            selectedRow = match ?? null;
        }

        if (!selectedRow || !finalizedReportHasRenderableSnapshot(selectedRow)) {
            setNotFinalized(true);
            setLoadState('loaded');
            return;
        }

        setReportRow(selectedRow);
        setLoadState('loaded');
        logReportDocumentViewAudit({
            orgId: profile?.org_id,
            userId: user?.id,
            assessmentId,
            cycleId,
            version: selectedRow.version,
            status: selectedRow.status === 'superseded' ? 'superseded' : 'finalized',
            reportId: selectedRow.id,
        });
    };

    const runPrint = () => {
        if (!reportRow?.embedded_computed) {
            return;
        }
        if (!finalizedReportAllowsPrintEmission(reportRow.embedded_computed)) {
            return;
        }

        const previousTitle = document.title;
        document.title = buildCommunicationReportPrintFilename({
            assessmentId,
            version: reportRow.version,
            superseded: reportRow.status === 'superseded',
        }).replace(/\.pdf$/, '');
        logClinicalExportAudit({
            orgId: profile?.org_id,
            userId: user?.id,
            assessmentId,
            artifact: 'report',
            channel: 'print',
            mode: REPORT_EXPORT_MODE,
            event: 'print',
            version: reportRow.version,
        });
        window.print();
        document.title = previousTitle;
    };

    const handlePrintClick = () => {
        if (!reportRow?.embedded_computed) {
            return;
        }
        if (!finalizedReportAllowsPrintEmission(reportRow.embedded_computed)) {
            return;
        }
        if (hasReportExportAcknowledged(assessmentId)) {
            runPrint();
            return;
        }
        setPrintDialogOpen(true);
    };

    if (loadState === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center p-12">
                <DataLoadSpinner label="Loading finalized report…" />
            </div>
        );
    }

    if (loadState === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center p-12">
                <DataLoadErrorPanel
                    title="Finalized report could not be loaded"
                    message={loadError ?? ''}
                    onRetry={() => void loadData()}
                    retryLabel="Retry loading report"
                />
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-12 text-red-600"
                data-finalized-report-access-denied
            >
                You do not have permission to view this finalized report.
            </div>
        );
    }

    if (notFinalized || !reportRow || !assessment) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center gap-4 p-12 text-gray-700"
                data-finalized-report-not-yet-finalized
            >
                <p className="text-lg font-medium text-gray-900">
                    No finalized report is available for this assessment cycle yet.
                </p>
                <p className="max-w-md text-center text-sm text-gray-600">
                    A senior clinician must finalize the communication report from the authoring
                    workspace before it can be viewed here.
                </p>
                <button
                    type="button"
                    onClick={() => {
                        window.location.hash = `#/assessment/${assessmentId}`;
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Back to assessment
                </button>
            </div>
        );
    }

    const structureLabels = defaultStructureLabelsFromPack(assessment.pack_snapshot);
    const clientName = reportRow.embedded_computed?.overview.client_name ?? '—';
    const packLabel = `${reportRow.embedded_computed?.overview.pack_title} (v${reportRow.embedded_computed?.overview.pack_version})`;
    const printEmissionAllowed =
        reportRow.embedded_computed != null &&
        finalizedReportAllowsPrintEmission(reportRow.embedded_computed);
    const offerPrint = canPrint && printEmissionAllowed;

    return (
        <div className="assessment-report-print bg-white text-gray-900 min-h-screen max-w-4xl mx-auto px-6 py-10 sm:px-10 sm:py-12 print:min-h-0 print:max-w-none print:px-10 print:py-8 print:text-black">
            <header className="border-b-2 border-gray-900 pb-8 mb-10 print:border-gray-900 print:pb-5 print:mb-6 report-section-block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3 print:text-gray-600">
                    Assessment communication report
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 leading-tight print:text-2xl">
                    Assessment Communication Report
                </h1>
                {cycleId ? (
                    <p className="mt-4 print:hidden flex flex-wrap gap-x-4 gap-y-1">
                        {showVersionHistory ? (
                            <a
                                href={buildVersionHistoryRouteHash(assessmentId, cycleId)}
                                className="text-sm font-medium text-gray-600 underline hover:text-gray-900"
                                data-report-version-history-link
                            >
                                Version history
                            </a>
                        ) : null}
                        <a
                            href={buildDocumentsIndexRouteHash(assessmentId)}
                            className="text-sm font-medium text-gray-600 underline hover:text-gray-900"
                            data-report-documents-index-link
                        >
                            All issued reports
                        </a>
                    </p>
                ) : null}
                <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 text-sm print:grid-cols-2 print:gap-y-5">
                    <div className="border-l-2 border-emerald-700/80 pl-4 print:border-gray-800">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">
                            Client
                        </dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900 leading-snug print:text-xl">
                            {clientName}
                        </dd>
                    </div>
                    <div className="border-l-2 border-gray-300 pl-4 print:border-gray-400">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">
                            Assessment / pack
                        </dt>
                        <dd className="mt-1 text-base font-medium text-gray-800 leading-snug">{packLabel}</dd>
                    </div>
                </dl>
            </header>

            <FinalizedReportDocument
                report={reportRow}
                structureLabels={structureLabels}
                currentIssuedVersion={currentIssuedVersion}
            />

            {canPrint && !printEmissionAllowed ? (
                <div
                    className="fixed bottom-8 right-8 z-10 max-w-sm rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-lg print:hidden"
                    data-finalized-report-print-unavailable
                    role="status"
                >
                    {FINALIZED_REPORT_PRINT_UNAVAILABLE_MESSAGE}
                </div>
            ) : null}

            {offerPrint ? (
                <>
                    <div className="fixed bottom-8 right-8 z-10 print:hidden">
                        <button
                            type="button"
                            onClick={handlePrintClick}
                            className="rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-black"
                            data-finalized-report-print
                        >
                            Print / Save PDF
                        </button>
                    </div>

                    <ReportExportDialog
                        isOpen={printDialogOpen}
                        assessmentId={assessmentId}
                        orgId={profile?.org_id}
                        userId={user?.id}
                        reportVersion={reportRow.version}
                        onClose={() => setPrintDialogOpen(false)}
                        onAcknowledgedContinue={runPrint}
                        continueLabel="Acknowledge and Print"
                    />
                </>
            ) : null}
        </div>
    );
}
