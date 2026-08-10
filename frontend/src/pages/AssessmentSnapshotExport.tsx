import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import {
    claimExportViewAudit,
    logClinicalExportAudit,
} from '../clinicalExport/clinicalExportAudit';
import { readHashSearch } from '../clinicalExport/clinicalExportState';
import { AssessmentSnapshotView } from '../components/assessmentSnapshot';
import { SNAPSHOT_V1_ID } from '../components/assessmentSnapshot/concepts';
import { isSnapshotExportAcknowledged } from '../components/assessmentSnapshot/export/snapshotExportAcknowledgment';
import { resolveSnapshotExportLoadError } from '../components/assessmentSnapshot/export/snapshotExportErrors';
import {
    downloadSnapshotHtmlChannel,
    SNAPSHOT_HTML_EXPORT_VIEWPORT_REM,
} from '../components/assessmentSnapshot/export/snapshotExportHtml';
import {
    buildSnapshotRouteHash,
    parseSnapshotExportPreviewParams,
} from '../components/assessmentSnapshot/export/snapshotExportState';
import { useAuth } from '../context/AuthContext';
import { getAssessmentSnapshotAvailability } from '../services/assessmentSnapshotAvailability';
import { buildAssessmentSnapshotProfile } from '../services/assessmentSnapshotProfile';
import { buildSnapshotCycleDateLabels } from '../components/assessmentSnapshot/v1/snapshotCycleReference';
import { loadLearnerMapProductionData } from '../services/learnerMapProduction';

interface Props {
    assessmentId: string;
}

/** OQ-6: placeholder labels — founder approves final clinician-facing copy. */
export const HTML_CHANNEL_BUTTON_LABEL = 'HTML';
export const PDF_CHANNEL_BUTTON_LABEL = 'PDF';

function ExportStatusPanel({
    title,
    message,
    guidance,
    tone,
    assessmentId,
    showExportDialogAction = false,
}: {
    title: string;
    message: string;
    guidance?: string;
    tone: 'error' | 'warning' | 'info';
    assessmentId: string;
    showExportDialogAction?: boolean;
}) {
    const toneClasses =
        tone === 'error'
            ? 'border-red-200 text-red-900'
            : tone === 'warning'
              ? 'border-amber-200 text-amber-950'
              : 'border-blue-200 text-blue-950';

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-200 p-6">
            <div className={`max-w-md rounded-lg border bg-white p-6 shadow-sm ${toneClasses}`}>
                <p className="font-semibold">{title}</p>
                <p className="mt-2 text-sm leading-relaxed">{message}</p>
                {guidance ? (
                    <p className="mt-2 text-sm leading-relaxed opacity-90">{guidance}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            window.location.hash = buildSnapshotRouteHash(assessmentId);
                        }}
                        className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                        Back to Snapshot
                    </button>
                    {showExportDialogAction ? (
                        <button
                            type="button"
                            onClick={() => {
                                window.location.hash = buildSnapshotRouteHash(assessmentId, {
                                    openExportDialog: true,
                                });
                            }}
                            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                        >
                            Return to Export Dialog
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => {
                            window.location.hash = `#/assessment/${assessmentId}`;
                        }}
                        className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                        Back to Assessment
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AssessmentSnapshotExport({ assessmentId }: Props) {
    const { profile, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<unknown>(null);
    const [productionData, setProductionData] = useState<Awaited<
        ReturnType<typeof loadLearnerMapProductionData>
    > | null>(null);
    const exportViewLogged = useRef(false);

    const exportParams = useMemo(
        () => parseSnapshotExportPreviewParams(readHashSearch()),
        []
    );
    const exportAcknowledged = isSnapshotExportAcknowledged(
        assessmentId,
        exportParams.exportMode
    );

    useEffect(() => {
        if (!exportAcknowledged) {
            setLoading(false);
            setLoadError(null);
            setProductionData(null);
            return;
        }

        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setLoadError(null);

            try {
                const data = await loadLearnerMapProductionData(assessmentId, profile?.org_id);
                if (!cancelled) {
                    setProductionData(data);
                }
            } catch (error) {
                console.error(error);
                if (!cancelled) {
                    setLoadError(error);
                    setProductionData(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [assessmentId, profile?.org_id, exportAcknowledged]);

    const snapshotProfile = useMemo(
        () =>
            productionData
                ? buildAssessmentSnapshotProfile(productionData.profile)
                : null,
        [productionData]
    );

    const availability = useMemo(
        () =>
            getAssessmentSnapshotAvailability({
                assessment: productionData?.assessment ?? null,
                cycleCount: productionData?.cycles.length ?? 0,
            }),
        [productionData]
    );

    const cycleDateLabels = useMemo(
        () =>
            productionData
                ? buildSnapshotCycleDateLabels(productionData.cycles)
                : undefined,
        [productionData]
    );

    const generatedAt = useMemo(() => new Date(), [snapshotProfile?.metadata.generatedAt]);

    useEffect(() => {
        if (
            !claimExportViewAudit(exportViewLogged, {
                acknowledged: exportAcknowledged,
                available: availability.available,
                ready: Boolean(productionData),
            })
        ) {
            return;
        }
        logClinicalExportAudit({
            orgId: profile?.org_id,
            userId: user?.id,
            assessmentId,
            artifact: 'snapshot',
            channel: 'export',
            mode: 'full',
            event: 'export_view',
        });
    }, [
        exportAcknowledged,
        productionData,
        availability.available,
        assessmentId,
        profile?.org_id,
        user?.id,
    ]);

    if (!exportAcknowledged) {
        return (
            <ExportStatusPanel
                tone="info"
                title="PHI acknowledgement required"
                message="Assessment Snapshot export includes complete learner evidence and requires PHI acknowledgement before the document can be opened."
                guidance="Use Return to Export Dialog to acknowledge and continue."
                assessmentId={assessmentId}
                showExportDialogAction
            />
        );
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-200 text-gray-600">
                Preparing Snapshot export…
            </div>
        );
    }

    if (loadError || !productionData || !snapshotProfile) {
        const errorDisplay = resolveSnapshotExportLoadError(loadError);

        return (
            <ExportStatusPanel
                tone="error"
                title={errorDisplay.title}
                message={errorDisplay.message}
                assessmentId={assessmentId}
            />
        );
    }

    if (!availability.available) {
        return (
            <ExportStatusPanel
                tone="warning"
                title="Assessment Snapshot export is not available yet"
                message={
                    availability.reason ??
                    'Assessment Snapshot export is not available for this assessment.'
                }
                assessmentId={assessmentId}
            />
        );
    }

    const { displayContext } = productionData;

    const handleDownloadHtml = () => {
        downloadSnapshotHtmlChannel(
            {
                profile: snapshotProfile,
                displayContext,
                cycleDateLabels,
                generatedAt,
            },
            assessmentId
        );
        logClinicalExportAudit({
            orgId: profile?.org_id,
            userId: user?.id,
            assessmentId,
            artifact: 'snapshot',
            channel: 'export',
            mode: 'full',
            event: 'html_export',
        });
    };

    const handlePdf = () => {
        logClinicalExportAudit({
            orgId: profile?.org_id,
            userId: user?.id,
            assessmentId,
            artifact: 'snapshot',
            channel: 'print',
            mode: 'full',
            event: 'print',
            surface: 'export',
        });
        window.print();
    };

    return (
        <div
            className="snapshot-export-preview-page min-h-screen bg-slate-200"
            data-snapshot-export-page
            data-snapshot-html-export-viewport-rem={SNAPSHOT_HTML_EXPORT_VIEWPORT_REM}
        >
            <div className="no-print sticky top-0 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
                <div className="mx-auto max-w-6xl px-4 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.hash = buildSnapshotRouteHash(assessmentId);
                                }}
                                className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Snapshot
                            </button>
                            <h1 className="text-base font-semibold text-gray-900">
                                Assessment Snapshot Export
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">
                                Full evidence record — every domain, target, and cycle from the
                                frozen pack snapshot. Preview matches the HTML channel (screen
                                layout).
                            </p>
                        </div>
                        <div
                            className="no-print flex shrink-0 flex-wrap items-start gap-2"
                            data-snapshot-export-actions
                        >
                            <button
                                type="button"
                                onClick={handleDownloadHtml}
                                data-snapshot-export-action="html"
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
                            >
                                <Download className="h-4 w-4" aria-hidden />
                                {HTML_CHANNEL_BUTTON_LABEL}
                            </button>
                            <button
                                type="button"
                                onClick={handlePdf}
                                data-snapshot-export-action="pdf"
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                            >
                                <FileText className="h-4 w-4" aria-hidden />
                                {PDF_CHANNEL_BUTTON_LABEL}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-0 py-4 sm:px-4">
                {/*
                  Screen preview (HTML channel). Print surface inside the view is
                  print-only for the PDF channel — not shown as the interactive preview.
                */}
                <AssessmentSnapshotView
                    profile={snapshotProfile}
                    displayContext={displayContext}
                    cycleDateLabels={cycleDateLabels}
                    concept={SNAPSHOT_V1_ID}
                    measureScreenViewport={false}
                />
            </div>
        </div>
    );
}
