import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    claimExportViewAudit,
    logClinicalExportAudit,
} from '../clinicalExport/clinicalExportAudit';
import { LearnerMapExportView } from '../components/learnerMap/export/LearnerMapExportView';
import { isLearnerMapFullExportAcknowledged } from '../components/learnerMap/export/learnerMapExportAcknowledgment';
import { getLearnerMapExportAvailability } from '../components/learnerMap/export/learnerMapExportAvailability';
import { resolveLearnerMapExportLoadError } from '../components/learnerMap/export/learnerMapExportErrors';
import {
    estimateAppendixSize,
    formatAppendixSizeEstimateLabel,
} from '../components/learnerMap/export/learnerMapExportEstimate';
import {
    LEARNER_MAP_EXPORT_MODES,
} from '../components/learnerMap/export/learnerMapExportMode';
import {
    buildLearnerMapRouteHash,
    parseLearnerMapExportPreviewParams,
    resolveLearnerMapExportPreviewParams,
} from '../components/learnerMap/export/learnerMapExportState';
import { loadLearnerMapProductionData } from '../services/learnerMapProduction';
import { readLearnerMapShowCellNumerals } from '../components/learnerMap/learnerMapShowCellNumerals';

interface Props {
    assessmentId: string;
}

function readExportPreviewSearch(): string {
    const hash = window.location.hash;
    const queryIndex = hash.indexOf('?');
    return queryIndex >= 0 ? hash.slice(queryIndex) : '';
}

function ExportStatusPanel({
    title,
    message,
    guidance,
    tone,
    assessmentId,
    showLearnerMapAction = true,
    showAssessmentAction = true,
    showExportDialogAction = false,
}: {
    title: string;
    message: string;
    guidance?: string;
    tone: 'error' | 'warning' | 'info';
    assessmentId: string;
    showLearnerMapAction?: boolean;
    showAssessmentAction?: boolean;
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
                    {showLearnerMapAction ? (
                        <button
                            type="button"
                            onClick={() => {
                                window.location.hash = buildLearnerMapRouteHash(assessmentId);
                            }}
                            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                        >
                            Back to Learner Map
                        </button>
                    ) : null}
                    {showExportDialogAction ? (
                        <button
                            type="button"
                            onClick={() => {
                                window.location.hash = buildLearnerMapRouteHash(assessmentId, {
                                    openExportDialog: true,
                                });
                            }}
                            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                        >
                            Return to Export Dialog
                        </button>
                    ) : null}
                    {showAssessmentAction ? (
                        <button
                            type="button"
                            onClick={() => {
                                window.location.hash = `#/assessment/${assessmentId}`;
                            }}
                            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                        >
                            Back to Assessment
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export function AssessmentLearnerMapExport({ assessmentId }: Props) {
    const { profile, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<unknown>(null);
    const [productionData, setProductionData] = useState<Awaited<
        ReturnType<typeof loadLearnerMapProductionData>
    > | null>(null);
    const exportLogged = useRef(false);

    const exportParams = useMemo(() => parseLearnerMapExportPreviewParams(readExportPreviewSearch()), []);
    const fullExportAcknowledged = isLearnerMapFullExportAcknowledged(
        assessmentId,
        exportParams.exportMode
    );

    useEffect(() => {
        if (!fullExportAcknowledged) {
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
    }, [assessmentId, profile?.org_id, fullExportAcknowledged]);

    const exportAvailability = useMemo(
        () =>
            getLearnerMapExportAvailability(
                productionData?.profile ?? null,
                productionData?.cycles.length ?? 0
            ),
        [productionData]
    );

    const resolvedExportParams = useMemo(() => {
        if (!productionData) {
            return exportParams;
        }
        return resolveLearnerMapExportPreviewParams(
            exportParams,
            productionData.profile.domains.map((domain) => domain.domainId)
        );
    }, [productionData, exportParams]);

    useEffect(() => {
        if (
            !claimExportViewAudit(exportLogged, {
                acknowledged: fullExportAcknowledged,
                available: exportAvailability.available,
                ready: Boolean(productionData),
            })
        ) {
            return;
        }
        logClinicalExportAudit({
            orgId: profile?.org_id,
            userId: user?.id,
            assessmentId,
            artifact: 'learner-map',
            channel: 'export',
            mode: resolvedExportParams.exportMode,
            event: 'export_view',
        });
    }, [
        fullExportAcknowledged,
        productionData,
        exportAvailability.available,
        resolvedExportParams.exportMode,
        assessmentId,
        profile?.org_id,
        user?.id,
    ]);

    if (!fullExportAcknowledged) {
        return (
            <ExportStatusPanel
                tone="info"
                title="Full export acknowledgment required"
                message="Full export includes target-level detail for every domain and may create a long document. Complete the export dialog and confirm the acknowledgment before opening the preview."
                guidance="Use Return to Export Dialog to choose Full export again and confirm the warning."
                assessmentId={assessmentId}
                showAssessmentAction={false}
                showExportDialogAction
            />
        );
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-200 text-gray-600">
                Preparing export preview…
            </div>
        );
    }

    if (loadError || !productionData) {
        const errorDisplay = resolveLearnerMapExportLoadError(loadError);

        return (
            <ExportStatusPanel
                tone="error"
                title={errorDisplay.title}
                message={errorDisplay.message}
                assessmentId={assessmentId}
            />
        );
    }

    if (!exportAvailability.available) {
        return (
            <ExportStatusPanel
                tone="warning"
                title="Learner Map export is not available yet"
                message={exportAvailability.reason ?? 'Learner Map export is not available for this assessment.'}
                guidance={exportAvailability.guidance}
                assessmentId={assessmentId}
                showExportDialogAction={false}
            />
        );
    }

    const { profile: learnerMapProfile, displayContext, cycleDateLabels } = productionData;
    const modeMeta = LEARNER_MAP_EXPORT_MODES.find(
        (entry) => entry.id === resolvedExportParams.exportMode
    )!;
    const selectedDomainTitles =
        resolvedExportParams.exportMode === 'selected-domains'
            ? learnerMapProfile.domains
                  .filter((domain) =>
                      resolvedExportParams.selectedDomainIds.includes(domain.domainId)
                  )
                  .map((domain) => domain.title)
            : [];
    const appendixEstimate = estimateAppendixSize(
        learnerMapProfile.domains,
        resolvedExportParams.exportMode,
        resolvedExportParams.exportMode === 'selected-domains'
            ? resolvedExportParams.selectedDomainIds
            : undefined
    );
    const appendixEstimateLabel = formatAppendixSizeEstimateLabel(
        resolvedExportParams.exportMode,
        appendixEstimate
    );
    const showCellNumerals = readLearnerMapShowCellNumerals(assessmentId);

    const handlePrint = () => {
        logClinicalExportAudit({
            orgId: profile?.org_id,
            userId: user?.id,
            assessmentId,
            artifact: 'learner-map',
            channel: 'print',
            mode: resolvedExportParams.exportMode,
            event: 'print',
        });
        window.print();
    };

    return (
        <div className="learner-map-export-preview-page min-h-screen bg-slate-200">
            <div className="no-print sticky top-0 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
                <div className="mx-auto max-w-6xl px-4 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.hash = buildLearnerMapRouteHash(assessmentId);
                                }}
                                className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Learner Map
                            </button>
                            <h1 className="text-base font-semibold text-gray-900">
                                Learner Map Export Preview
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">
                                <span className="font-semibold text-gray-800">{modeMeta.label}</span>
                                <span className="mx-2 text-gray-400" aria-hidden>
                                    ·
                                </span>
                                {modeMeta.description}
                            </p>
                            {selectedDomainTitles.length > 0 ? (
                                <p className="mt-2 text-sm text-gray-700">
                                    Selected domains: {selectedDomainTitles.join(', ')}
                                </p>
                            ) : null}
                            <p className="mt-2 text-sm text-gray-600">{appendixEstimateLabel}</p>
                        </div>
                        <div className="no-print flex shrink-0 items-start">
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                            >
                                <Printer className="h-4 w-4" aria-hidden />
                                Print / Save PDF
                            </button>
                        </div>
                    </div>
                    <p className="mt-3 text-sm text-gray-600">
                        For best results, use your browser&apos;s <strong>Print</strong> or{' '}
                        <strong>Save as PDF</strong> option. Disable browser headers and footers if
                        your browser adds extra page text. Google Chrome is recommended for printing.
                    </p>
                </div>
            </div>

            <LearnerMapExportView
                profile={learnerMapProfile}
                mode={resolvedExportParams.exportMode}
                selectedDomainIds={
                    resolvedExportParams.exportMode === 'selected-domains'
                        ? resolvedExportParams.selectedDomainIds
                        : undefined
                }
                displayContext={displayContext}
                cycleDateLabels={cycleDateLabels}
                showCellNumerals={showCellNumerals}
            />
        </div>
    );
}
