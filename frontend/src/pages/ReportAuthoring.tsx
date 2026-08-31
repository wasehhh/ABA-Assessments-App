import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { assessmentService } from '../services/assessments';
import { buildReportProfile } from '../services/reportProfile';
import {
    reportAuthoringService,
    ReportAuthoringError,
} from '../services/reportAuthoring';
import { canManageReportAuthoring } from '../services/reportAuthoringRoles';
import {
    AssessmentCommunicationReport,
    ReportAuthoring as ReportAuthoringData,
} from '../services/reportAuthoringTypes';
import {
    createEmptyReportAuthoring,
    getAuthoringFinalizeValidationError,
} from '../services/reportAuthoringValidation';
import { ReportAuthoringForm } from '../components/reportAuthoring/ReportAuthoringForm';
import { ReportAuthoringReferencePanel } from '../components/reportAuthoring/ReportAuthoringReferencePanel';
import {
    buildDocumentsIndexRouteHash,
    buildVersionHistoryRouteHash,
    readReportAuthoringCycleIdFromHash,
} from './assessmentMatrixReportEntry';
import { hasRenderableIssuedReports, shouldShowVersionHistoryLink } from './issuedReportVersions';
import {
    beginNewVersionDraftFromFinalized,
    loadCycleReferenceScores,
    loadOrCreateDraftReport,
} from './reportAuthoringWorkspaceLoad';
import { Assessment, AssessmentCycle } from '../types';

interface Props {
    assessmentId: string;
}

type PageState = 'loading' | 'ready' | 'error' | 'needs_new_version';

function normalizeWorkspaceError(error: unknown): string {
    if (error instanceof ReportAuthoringError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'Unable to load the report authoring workspace.';
}

export function ReportAuthoring({ assessmentId }: Props) {
    const { profile } = useAuth();
    const [pageState, setPageState] = useState<PageState>('loading');
    const [pageError, setPageError] = useState<string | null>(null);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [cycle, setCycle] = useState<AssessmentCycle | null>(null);
    const [reportRow, setReportRow] = useState<AssessmentCommunicationReport | null>(null);
    const [authoring, setAuthoring] = useState<ReportAuthoringData>(createEmptyReportAuthoring());
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [finalizeState, setFinalizeState] = useState<'idle' | 'finalizing' | 'done' | 'error'>(
        'idle'
    );
    const [finalizeError, setFinalizeError] = useState<string | null>(null);
    const [finalizeSuccess, setFinalizeSuccess] = useState<string | null>(null);
    const [referenceScores, setReferenceScores] = useState<any[]>([]);
    const [referencePreviousScores, setReferencePreviousScores] = useState<any[]>([]);
    const [cycles, setCycles] = useState<AssessmentCycle[]>([]);
    const [createVersionState, setCreateVersionState] = useState<'idle' | 'creating'>('idle');
    const [createVersionError, setCreateVersionError] = useState<string | null>(null);
    const [existingDraftNotice, setExistingDraftNotice] = useState<string | null>(null);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [hasIssuedReports, setHasIssuedReports] = useState(false);

    const cycleId = readReportAuthoringCycleIdFromHash();

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setPageState('loading');
            setPageError(null);
            setFinalizeSuccess(null);
            setCreateVersionError(null);
            setExistingDraftNotice(null);
            setShowVersionHistory(false);
            setHasIssuedReports(false);

            if (!canManageReportAuthoring(profile?.role)) {
                if (!cancelled) {
                    setPageError(
                        'Only senior therapists and admins may author assessment communication reports.'
                    );
                    setPageState('error');
                }
                return;
            }

            if (!cycleId) {
                if (!cancelled) {
                    setPageError('Select a cycle on the assessment matrix before opening Report.');
                    setPageState('error');
                }
                return;
            }

            try {
                const assessmentData = await assessmentService.getById(assessmentId);
                if (!assessmentData) {
                    throw new ReportAuthoringError('Assessment not found.');
                }
                if (assessmentData.status !== 'approved') {
                    throw new ReportAuthoringError(
                        'Assessment reports can only be authored after the assessment is approved.'
                    );
                }

                const cycleList = await assessmentService.getCycles(assessmentId);
                const selectedCycle = cycleList.find((entry) => entry.id === cycleId);
                if (!selectedCycle) {
                    throw new ReportAuthoringError('Assessment cycle not found for this assessment.');
                }

                const workspace = await loadOrCreateDraftReport(assessmentId, cycleId);
                const [versions, issuedAcrossAssessment] = await Promise.all([
                    reportAuthoringService.listReportVersions(assessmentId, cycleId),
                    reportAuthoringService.listIssuedReportsForAssessment(assessmentId),
                ]);

                if (cancelled) {
                    return;
                }

                setAssessment(assessmentData);
                setCycle(selectedCycle);
                setCycles(cycleList);
                setShowVersionHistory(shouldShowVersionHistoryLink(versions));
                setHasIssuedReports(hasRenderableIssuedReports(issuedAcrossAssessment));

                if (workspace.kind === 'needs_new_version') {
                    setReportRow(null);
                    setPageState('needs_new_version');
                    return;
                }

                const draftRow = workspace.report;
                if (draftRow.status !== 'draft') {
                    throw new ReportAuthoringError(
                        'This report is no longer a draft and cannot be edited here.'
                    );
                }

                const { scores, previousScores } = await loadCycleReferenceScores(
                    assessmentId,
                    selectedCycle,
                    cycleList
                );

                if (cancelled) {
                    return;
                }

                setReportRow(draftRow);
                setAuthoring(draftRow.authoring ?? createEmptyReportAuthoring());
                setReferenceScores(scores);
                setReferencePreviousScores(previousScores);
                setPageState('ready');
            } catch (error) {
                if (!cancelled) {
                    setPageError(normalizeWorkspaceError(error));
                    setPageState('error');
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [assessmentId, cycleId, profile?.role]);

    const referenceProfile = useMemo(() => {
        if (!assessment?.pack_snapshot || !cycle) {
            return null;
        }

        return buildReportProfile({
            assessment: {
                id: assessment.id,
                client_id: assessment.client_id,
                pack_snapshot: assessment.pack_snapshot,
                assessment_date: assessment.assessment_date,
                status: assessment.status,
                client: assessment.client,
            },
            cycle: {
                id: cycle.id,
                cycle_number: cycle.cycle_number,
                status: cycle.status,
            },
            scores: referenceScores,
            previousScores: referencePreviousScores,
        });
    }, [assessment, cycle, referenceScores, referencePreviousScores]);

    const handleSaveDraft = async () => {
        if (!reportRow) {
            return;
        }

        setSaveState('saving');
        setSaveError(null);

        try {
            const saved = await reportAuthoringService.saveDraftReport(reportRow.id, authoring);
            setReportRow(saved);
            setAuthoring(saved.authoring);
            setSaveState('saved');
        } catch (error) {
            setSaveState('error');
            setSaveError(normalizeWorkspaceError(error));
        }
    };

    const handleFinalize = async () => {
        if (!reportRow || !assessment?.pack_snapshot) {
            return;
        }

        const validationError = getAuthoringFinalizeValidationError(
            authoring,
            assessment.pack_snapshot
        );
        if (validationError) {
            setFinalizeError(validationError);
            setFinalizeState('error');
            return;
        }

        setFinalizeState('finalizing');
        setFinalizeError(null);
        setFinalizeSuccess(null);

        try {
            await reportAuthoringService.saveDraftReport(reportRow.id, authoring);
            const finalized = await reportAuthoringService.finalizeReport(reportRow.id);
            setReportRow(finalized);
            setFinalizeState('done');
            setFinalizeSuccess(`Report version ${finalized.version} finalized successfully.`);
        } catch (error) {
            setFinalizeState('error');
            setFinalizeError(normalizeWorkspaceError(error));
        }
    };

    const enterDraftWorkspace = async (draftRow: AssessmentCommunicationReport) => {
        if (!assessment || !cycle) {
            return;
        }

        if (draftRow.status !== 'draft') {
            throw new ReportAuthoringError(
                'This report is no longer a draft and cannot be edited here.'
            );
        }

        const { scores, previousScores } = await loadCycleReferenceScores(
            assessmentId,
            cycle,
            cycles
        );
        setReportRow(draftRow);
        setAuthoring(draftRow.authoring ?? createEmptyReportAuthoring());
        setReferenceScores(scores);
        setReferencePreviousScores(previousScores);
        setPageState('ready');
    };

    const handleCreateNewVersion = async () => {
        if (!cycleId) {
            return;
        }

        setCreateVersionState('creating');
        setCreateVersionError(null);

        try {
            const result = await beginNewVersionDraftFromFinalized(assessmentId, cycleId);
            if (result.kind === 'existing_draft') {
                await enterDraftWorkspace(result.report);
                setExistingDraftNotice(
                    'A draft already exists for this cycle. You are editing that draft. Only one draft can exist at a time.'
                );
                return;
            }

            setExistingDraftNotice(null);
            await enterDraftWorkspace(result.report);
        } catch (error) {
            setCreateVersionError(normalizeWorkspaceError(error));
        } finally {
            setCreateVersionState('idle');
        }
    };

    if (pageState === 'loading') {
        return (
            <div
                className="flex min-h-[40vh] items-center justify-center text-gray-500"
                data-report-authoring-loading
            >
                Loading report authoring workspace…
            </div>
        );
    }

    if (pageState === 'error') {
        return (
            <div className="mx-auto max-w-3xl px-4 py-12" data-report-authoring-error>
                <button
                    type="button"
                    onClick={() => {
                        window.location.hash = `#/assessment/${assessmentId}`;
                    }}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Back to assessment
                </button>
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                    {pageError ?? 'Unable to open the report authoring workspace.'}
                </div>
            </div>
        );
    }

    if (pageState === 'needs_new_version' && assessment && cycle) {
        const offerClientName = assessment.client
            ? `${assessment.client.first_name ?? ''} ${assessment.client.last_name ?? ''}`.trim()
            : 'Assessment';

        return (
            <div className="mx-auto max-w-3xl px-4 py-12" data-report-authoring-needs-new-version>
                <button
                    type="button"
                    onClick={() => {
                        window.location.hash = `#/assessment/${assessmentId}`;
                    }}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Back to assessment
                </button>
                <div className="rounded-lg border border-gray-200 bg-white px-5 py-6">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-700" aria-hidden />
                        <h1 className="text-xl font-semibold text-gray-900">
                            This cycle already has a finalized report.
                        </h1>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {offerClientName}
                        <span className="mx-2 text-gray-300" aria-hidden>
                            ·
                        </span>
                        Cycle {cycle.cycle_number}
                    </p>
                    <p className="mt-4 text-sm text-gray-700">
                        The finalized report cannot be edited. Create a new version to amend it. The
                        current finalized document stays in place until you finalize the new version.
                    </p>
                    {(showVersionHistory || hasIssuedReports) && cycleId ? (
                        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
                            {showVersionHistory ? (
                                <a
                                    href={buildVersionHistoryRouteHash(assessmentId, cycleId)}
                                    className="text-sm font-medium text-gray-600 underline hover:text-gray-900"
                                    data-report-version-history-link
                                >
                                    Version history
                                </a>
                            ) : null}
                            {hasIssuedReports ? (
                                <a
                                    href={buildDocumentsIndexRouteHash(assessmentId)}
                                    className="text-sm font-medium text-gray-600 underline hover:text-gray-900"
                                    data-report-documents-index-link
                                >
                                    All issued reports
                                </a>
                            ) : null}
                        </p>
                    ) : null}
                    {createVersionError ? (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                            {createVersionError}
                        </div>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => void handleCreateNewVersion()}
                        disabled={createVersionState === 'creating'}
                        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                        data-report-authoring-create-new-version
                    >
                        {createVersionState === 'creating'
                            ? 'Creating new version…'
                            : 'Create new version'}
                    </button>
                </div>
            </div>
        );
    }

    if (pageState !== 'ready' || !assessment || !cycle || !reportRow || !referenceProfile) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-12" data-report-authoring-error>
                <button
                    type="button"
                    onClick={() => {
                        window.location.hash = `#/assessment/${assessmentId}`;
                    }}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Back to assessment
                </button>
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                    {pageError ?? 'Unable to open the report authoring workspace.'}
                </div>
            </div>
        );
    }

    const clientName = assessment.client
        ? `${assessment.client.first_name ?? ''} ${assessment.client.last_name ?? ''}`.trim()
        : 'Assessment';

    return (
        <div className="mx-auto max-w-7xl px-4 py-6" data-report-authoring-page>
            <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <button
                        type="button"
                        onClick={() => {
                            window.location.hash = `#/assessment/${assessmentId}`;
                        }}
                        className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Back to assessment
                    </button>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-700" aria-hidden />
                        <h1 className="text-xl font-semibold text-gray-900">
                            Assessment Report Authoring
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                        {clientName}
                        <span className="mx-2 text-gray-300" aria-hidden>
                            ·
                        </span>
                        Cycle {cycle.cycle_number}
                        <span className="mx-2 text-gray-300" aria-hidden>
                            ·
                        </span>
                        Draft v{reportRow.version}
                    </p>
                    {(showVersionHistory || hasIssuedReports) && cycleId ? (
                        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            {showVersionHistory ? (
                                <a
                                    href={buildVersionHistoryRouteHash(assessmentId, cycleId)}
                                    className="text-sm font-medium text-gray-600 underline hover:text-gray-900"
                                    data-report-version-history-link
                                >
                                    Version history
                                </a>
                            ) : null}
                            {hasIssuedReports ? (
                                <a
                                    href={buildDocumentsIndexRouteHash(assessmentId)}
                                    className="text-sm font-medium text-gray-600 underline hover:text-gray-900"
                                    data-report-documents-index-link
                                >
                                    All issued reports
                                </a>
                            ) : null}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void handleSaveDraft()}
                        disabled={saveState === 'saving' || finalizeState === 'finalizing'}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                        data-report-authoring-save-draft
                    >
                        <Save className="h-4 w-4" aria-hidden />
                        {saveState === 'saving' ? 'Saving…' : 'Save Draft'}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleFinalize()}
                        disabled={saveState === 'saving' || finalizeState === 'finalizing'}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                        data-report-authoring-finalize
                    >
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        {finalizeState === 'finalizing' ? 'Finalizing…' : 'Finalize Report'}
                    </button>
                </div>
            </div>

            {existingDraftNotice ? (
                <div
                    className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                    data-report-authoring-existing-draft
                >
                    {existingDraftNotice}
                </div>
            ) : null}
            {saveError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {saveError}
                </div>
            ) : null}
            {saveState === 'saved' ? (
                <div
                    className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                    data-report-authoring-save-success
                >
                    Draft saved.
                </div>
            ) : null}
            {finalizeSuccess ? (
                <div
                    className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                    data-report-authoring-finalize-success
                >
                    {finalizeSuccess}
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
                <ReportAuthoringForm
                    authoring={authoring}
                    packDomains={assessment.pack_snapshot.domains}
                    onChange={setAuthoring}
                    finalizeError={finalizeError}
                />
                <ReportAuthoringReferencePanel reportProfile={referenceProfile} />
            </div>
        </div>
    );
}
