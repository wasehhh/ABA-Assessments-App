import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Map } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LearnerMapView } from '../components/learnerMap';
import { getLearnerMapExportAvailability } from '../components/learnerMap/export/learnerMapExportAvailability';
import { LearnerMapExportDialog } from '../components/learnerMap/export/LearnerMapExportDialog';
import { loadLearnerMapProductionData } from '../services/learnerMapProduction';

interface Props {
    assessmentId: string;
}

export function AssessmentLearnerMap({ assessmentId }: Props) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [productionData, setProductionData] = useState<Awaited<
        ReturnType<typeof loadLearnerMapProductionData>
    > | null>(null);

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
                    setError('Unable to load Learner Map for this assessment.');
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
            <div className="flex min-h-[40vh] items-center justify-center text-gray-500">
                Loading Learner Map…
            </div>
        );
    }

    if (error || !productionData) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-12">
                <button
                    type="button"
                    onClick={() => {
                        window.location.hash = `#/assessment/${assessmentId}`;
                    }}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to assessment
                </button>
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                    {error ?? 'Unable to load Learner Map for this assessment.'}
                </div>
            </div>
        );
    }

    const { profile: learnerMapProfile, displayContext, assessment } = productionData;
    const exportDisabled = !exportAvailability.available;

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="border-b border-gray-200 bg-white">
                <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <button
                            type="button"
                            onClick={() => {
                                window.location.hash = `#/assessment/${assessmentId}`;
                            }}
                            className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to assessment
                        </button>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-md bg-emerald-100 p-2 text-emerald-800">
                                <Map className="h-4 w-4" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg font-bold text-gray-900">Learner Map</h1>
                                <p className="mt-0.5 truncate text-sm text-gray-600">
                                    {displayContext.learnerName}
                                    <span className="mx-2 text-gray-300" aria-hidden>
                                        ·
                                    </span>
                                    {displayContext.assessmentName}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-start gap-1 sm:items-end">
                        <span
                            title={exportDisabled ? exportAvailability.reason : undefined}
                            className="inline-flex"
                        >
                            <button
                                type="button"
                                onClick={() => setShowExportDialog(true)}
                                disabled={exportDisabled}
                                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                    exportDisabled
                                        ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                }`}
                            >
                                <Download className="h-4 w-4" />
                                Export Learner Map
                            </button>
                        </span>
                        {exportDisabled && exportAvailability.reason ? (
                            <p className="max-w-xs text-xs text-gray-500 sm:text-right">
                                {exportAvailability.reason}
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>

            <LearnerMapView
                profile={learnerMapProfile}
                displayContext={displayContext}
                cycleDateLabels={productionData.cycleDateLabels}
            />

            <LearnerMapExportDialog
                isOpen={showExportDialog}
                assessmentId={assessment.id}
                domains={learnerMapProfile.domains}
                onClose={() => setShowExportDialog(false)}
            />
        </div>
    );
}
