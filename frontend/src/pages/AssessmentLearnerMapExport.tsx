import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LearnerMapExportView } from '../components/learnerMap/export/LearnerMapExportView';
import { getLearnerMapExportAvailability } from '../components/learnerMap/export/learnerMapExportAvailability';
import {
    estimateAppendixSize,
    formatAppendixSizeEstimateLabel,
} from '../components/learnerMap/export/learnerMapExportEstimate';
import {
    LEARNER_MAP_EXPORT_MODES,
} from '../components/learnerMap/export/learnerMapExportMode';
import {
    parseLearnerMapExportPreviewParams,
    resolveLearnerMapExportPreviewParams,
} from '../components/learnerMap/export/learnerMapExportState';
import { loadLearnerMapProductionData } from '../services/learnerMapProduction';

interface Props {
    assessmentId: string;
}

function readExportPreviewSearch(): string {
    const hash = window.location.hash;
    const queryIndex = hash.indexOf('?');
    return queryIndex >= 0 ? hash.slice(queryIndex) : '';
}

export function AssessmentLearnerMapExport({ assessmentId }: Props) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [productionData, setProductionData] = useState<Awaited<
        ReturnType<typeof loadLearnerMapProductionData>
    > | null>(null);

    const exportParams = useMemo(() => parseLearnerMapExportPreviewParams(readExportPreviewSearch()), []);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await loadLearnerMapProductionData(assessmentId, profile?.org_id);
                if (!cancelled) {
                    setProductionData(data);
                }
            } catch (loadError) {
                console.error(loadError);
                if (!cancelled) {
                    setError('Unable to build Learner Map for this assessment.');
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
    }, [assessmentId, profile?.org_id]);

    const exportAvailability = useMemo(
        () =>
            getLearnerMapExportAvailability(
                productionData?.profile ?? null,
                productionData?.cycles.length ?? 0
            ),
        [productionData]
    );

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-200 text-gray-600">
                Preparing export preview…
            </div>
        );
    }

    if (error || !productionData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-200 p-6">
                <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-red-800 shadow-sm">
                    <p>{error ?? 'Unable to build Learner Map for this assessment.'}</p>
                    <button
                        type="button"
                        onClick={() => {
                            window.location.hash = `#/assessment/${assessmentId}/learner-map`;
                        }}
                        className="mt-4 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                        Back to Learner Map
                    </button>
                </div>
            </div>
        );
    }

    if (!exportAvailability.available) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-200 p-6">
                <div className="max-w-md rounded-lg border border-amber-200 bg-white p-6 text-amber-950 shadow-sm">
                    <p className="font-semibold">Export unavailable</p>
                    <p className="mt-2 text-sm leading-relaxed">
                        {exportAvailability.reason ??
                            'Learner Map export is not available for this assessment.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            window.location.hash = `#/assessment/${assessmentId}`;
                        }}
                        className="mt-4 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                        Back to assessment
                    </button>
                </div>
            </div>
        );
    }

    const { profile: learnerMapProfile, displayContext, cycleDateLabels } = productionData;
    const resolvedExportParams = resolveLearnerMapExportPreviewParams(
        exportParams,
        learnerMapProfile.domains.map((domain) => domain.domainId)
    );
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

    const handlePrint = () => {
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
                                    window.location.hash = `#/assessment/${assessmentId}/learner-map`;
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
            />
        </div>
    );
}
