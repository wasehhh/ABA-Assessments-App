import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { AssessmentSnapshotView } from '../components/assessmentSnapshot';
import { SNAPSHOT_V1_ID } from '../components/assessmentSnapshot/concepts';
import { SnapshotExportDialog } from '../components/assessmentSnapshot/export/SnapshotExportDialog';
import { hasSnapshotExportAcknowledged } from '../components/assessmentSnapshot/export/snapshotExportAcknowledgment';
import {
    buildSnapshotExportPreviewHash,
    shouldOpenSnapshotExportDialog,
} from '../components/assessmentSnapshot/export/snapshotExportState';
import { logClinicalExportAudit } from '../clinicalExport/clinicalExportAudit';
import { readHashSearch } from '../clinicalExport/clinicalExportState';
import { useAuth } from '../context/AuthContext';
import {
    getAssessmentSnapshotAvailability,
    profileHasAnyScoredEvidence,
} from '../services/assessmentSnapshotAvailability';
import { buildAssessmentSnapshotProfile } from '../services/assessmentSnapshotProfile';
import { buildSnapshotCycleDateLabels } from '../components/assessmentSnapshot/v1/snapshotCycleReference';
import {
    readSnapshotShowScores,
    writeSnapshotShowScores,
} from '../components/assessmentSnapshot/v1/snapshotShowScores';
import { SnapshotShowScoresToggle } from '../components/assessmentSnapshot/v1/SnapshotShowScoresToggle';
import { loadLearnerMapProductionData } from '../services/learnerMapProduction';

interface Props {
    assessmentId: string;
}

type SnapshotGateIntent = 'export' | 'print' | null;

export function AssessmentSnapshot({ assessmentId }: Props) {
    const { profile, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [productionData, setProductionData] = useState<Awaited<
        ReturnType<typeof loadLearnerMapProductionData>
    > | null>(null);
    const [gateIntent, setGateIntent] = useState<SnapshotGateIntent>(null);
    const [showScores, setShowScores] = useState(() => readSnapshotShowScores(assessmentId));

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
                    const message =
                        loadError instanceof Error && loadError.message === 'Assessment not found'
                            ? 'Assessment not found.'
                            : 'Unable to load Assessment Snapshot for this assessment.';
                    setError(message);
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

    useEffect(() => {
        if (shouldOpenSnapshotExportDialog(readHashSearch())) {
            setGateIntent('export');
        }
    }, [assessmentId]);

    useEffect(() => {
        setShowScores(readSnapshotShowScores(assessmentId));
    }, [assessmentId]);

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

    const hasScoredEvidence = useMemo(
        () => (snapshotProfile ? profileHasAnyScoredEvidence(snapshotProfile) : false),
        [snapshotProfile]
    );

    const cycleDateLabels = useMemo(
        () =>
            productionData
                ? buildSnapshotCycleDateLabels(productionData.cycles)
                : undefined,
        [productionData]
    );

    const goBack = () => {
        window.location.hash = `#/assessment/${assessmentId}`;
    };

    const runPrint = () => {
        logClinicalExportAudit({
            orgId: profile?.org_id,
            userId: user?.id,
            assessmentId,
            artifact: 'snapshot',
            channel: 'print',
            mode: 'full',
            event: 'print',
            surface: 'snapshot',
        });
        window.print();
    };

    const handlePrintClick = () => {
        if (hasSnapshotExportAcknowledged(assessmentId)) {
            runPrint();
            return;
        }
        setGateIntent('print');
    };

    const handleExportClick = () => {
        if (hasSnapshotExportAcknowledged(assessmentId)) {
            window.location.hash = buildSnapshotExportPreviewHash(assessmentId);
            return;
        }
        setGateIntent('export');
    };

    if (loading) {
        return (
            <div
                className="flex min-h-[40vh] items-center justify-center text-gray-500"
                data-assessment-snapshot-loading
                role="status"
            >
                Loading Assessment Snapshot…
            </div>
        );
    }

    if (error || !productionData || !snapshotProfile) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-12" data-assessment-snapshot-error>
                <button
                    type="button"
                    onClick={goBack}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Back to assessment
                </button>
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                    {error ?? 'Unable to load Assessment Snapshot for this assessment.'}
                </div>
            </div>
        );
    }

    if (!availability.available) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-12" data-assessment-snapshot-unavailable>
                <button
                    type="button"
                    onClick={goBack}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Back to assessment
                </button>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
                    {availability.reason ?? 'Assessment Snapshot is not available yet.'}
                </div>
            </div>
        );
    }

    const { displayContext } = productionData;

    return (
        <div className="min-h-screen bg-slate-50" data-assessment-snapshot-production>
            <div className="no-print border-b border-gray-200 bg-white">
                <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <button
                            type="button"
                            onClick={goBack}
                            className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden />
                            Back to assessment
                        </button>
                        <h1 className="text-lg font-semibold tracking-tight text-gray-900">
                            Assessment Snapshot
                        </h1>
                        <p className="mt-0.5 truncate text-sm text-gray-600">
                            {displayContext.learnerName}
                            <span className="mx-2 text-gray-300" aria-hidden>
                                ·
                            </span>
                            {displayContext.assessmentName}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <SnapshotShowScoresToggle
                            checked={showScores}
                            onChange={(next) => {
                                setShowScores(next);
                                writeSnapshotShowScores(assessmentId, next);
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleExportClick}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                            aria-label="Export Assessment Snapshot"
                        >
                            <Download className="h-4 w-4" aria-hidden />
                            Export
                        </button>
                        <button
                            type="button"
                            onClick={handlePrintClick}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                            aria-label="Print Assessment Snapshot"
                        >
                            <Printer className="h-4 w-4" aria-hidden />
                            Print
                        </button>
                    </div>
                </div>
            </div>

            {!hasScoredEvidence ? (
                <div
                    className="no-print mx-auto max-w-6xl px-4 pt-4"
                    data-assessment-snapshot-empty-evidence
                    role="status"
                >
                    <p className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
                        No scores have been entered yet. Unscored evidence is shown for every
                        target and cycle.
                    </p>
                </div>
            ) : null}

            <div className="mx-auto max-w-6xl px-0 sm:px-4 sm:py-4">
                <AssessmentSnapshotView
                    profile={snapshotProfile}
                    displayContext={displayContext}
                    cycleDateLabels={cycleDateLabels}
                    concept={SNAPSHOT_V1_ID}
                    measureScreenViewport
                    showScores={showScores}
                />
            </div>

            <SnapshotExportDialog
                isOpen={gateIntent !== null}
                assessmentId={assessmentId}
                orgId={profile?.org_id}
                userId={user?.id}
                onClose={() => setGateIntent(null)}
                auditChannel={gateIntent === 'print' ? 'print' : 'export'}
                continueLabel={
                    gateIntent === 'print' ? 'Acknowledge and Print' : 'Continue to Export'
                }
                onAcknowledgedContinue={
                    gateIntent === 'print'
                        ? runPrint
                        : () => {
                              window.location.hash = buildSnapshotExportPreviewHash(assessmentId);
                          }
                }
            />
        </div>
    );
}
