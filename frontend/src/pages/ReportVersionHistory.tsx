import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reportAuthoringService } from '../services/reportAuthoring';
import { canViewFinalizedReport } from '../services/reportAuthoringRoles';
import { userService } from '../services/users';
import { AssessmentCommunicationReport } from '../services/reportAuthoringTypes';
import {
    DataLoadErrorPanel,
    DataLoadSpinner,
} from '../components/DataLoadSurface';
import { formatFinalizedReportDate } from '../utils/finalizedReportPresentation';
import { executeProtectedLoad, type DataLoadState } from '../utils/dataLoadHonesty';
import { logReportHistoryListViewAudit } from '../clinicalExport/reportViewAudit';
import {
    buildFinalizedReportRouteHash,
    readReportAuthoringCycleIdFromHash,
} from './assessmentMatrixReportEntry';
import {
    UNRESOLVED_FINALIZED_BY_LABEL,
    formatFinalizedByDisplayName,
    issuedReportVersions,
    issuedVersionStatusLabel,
} from './issuedReportVersions';

interface Props {
    assessmentId: string;
}

export function ReportVersionHistory({ assessmentId }: Props) {
    const { profile, user } = useAuth();
    const [loadState, setLoadState] = useState<DataLoadState>('loading');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [rows, setRows] = useState<AssessmentCommunicationReport[]>([]);
    const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});
    const loadRequestRef = useRef(0);

    const cycleId = readReportAuthoringCycleIdFromHash();
    const canView = canViewFinalizedReport(profile?.role);

    useEffect(() => {
        void loadData();
    }, [assessmentId, cycleId, canView]);

    const loadData = async () => {
        const requestId = ++loadRequestRef.current;
        setLoadState('loading');
        setLoadError(null);
        setAccessDenied(false);
        setRows([]);
        setNameByUserId({});

        if (!canView) {
            setAccessDenied(true);
            setLoadState('loaded');
            return;
        }

        if (!cycleId) {
            setLoadError('Select a cycle on the assessment matrix before opening version history.');
            setLoadState('error');
            return;
        }

        const result = await executeProtectedLoad({
            requestId,
            getCurrentRequestId: () => loadRequestRef.current,
            load: async () => {
                const versions = await reportAuthoringService.listReportVersions(
                    assessmentId,
                    cycleId
                );
                const issued = issuedReportVersions(versions);
                let names: Record<string, string> = {};
                if (profile?.org_id) {
                    try {
                        const profiles = await userService.getByOrg(profile.org_id);
                        names = Object.fromEntries(
                            profiles.map((entry) => [
                                entry.id,
                                formatFinalizedByDisplayName(entry),
                            ])
                        );
                    } catch {
                        names = {};
                    }
                }
                return { issued, names };
            },
        });

        if (result.kind === 'stale') {
            return;
        }

        if (result.kind === 'error') {
            setLoadError(
                'We could not load report version history. Your records are still saved — try again.'
            );
            setLoadState('error');
            return;
        }

        setRows(result.data.issued);
        setNameByUserId(result.data.names);
        setLoadState('loaded');
        logReportHistoryListViewAudit({
            orgId: profile?.org_id,
            userId: user?.id,
            assessmentId,
            cycleId,
        });
    };

    if (loadState === 'loading') {
        return (
            <div className="mx-auto max-w-4xl px-4 py-12">
                <DataLoadSpinner label="Loading version history…" />
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div
                className="mx-auto max-w-4xl px-4 py-12 text-red-600"
                data-report-version-history-access-denied
            >
                You do not have permission to view report version history.
            </div>
        );
    }

    if (loadState === 'error') {
        return (
            <div className="mx-auto max-w-4xl px-4 py-12">
                <DataLoadErrorPanel
                    title="Version history could not be loaded"
                    message={loadError ?? ''}
                    onRetry={() => void loadData()}
                    retryLabel="Retry loading history"
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl px-4 py-12" data-report-version-history-page>
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
            <h1 className="text-2xl font-bold text-gray-900">Version history</h1>
            <p className="mt-1 text-sm text-gray-600">Issued communication reports for this cycle.</p>

            {rows.length === 0 ? (
                <p className="mt-8 text-sm text-gray-600" data-report-version-history-empty>
                    No issued reports for this assessment cycle.
                </p>
            ) : (
                <table className="mt-8 w-full text-left text-sm" data-report-version-history-table>
                    <thead>
                        <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <th className="py-2 pr-4">Version</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Finalized</th>
                            <th className="py-2 pr-4">Finalized by</th>
                            <th className="py-2"> </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const statusLabel = issuedVersionStatusLabel(row.status);
                            const finalizedBy =
                                (row.finalized_by && nameByUserId[row.finalized_by]) ||
                                UNRESOLVED_FINALIZED_BY_LABEL;
                            return (
                                <tr
                                    key={row.id}
                                    className="border-b border-gray-100"
                                    data-report-version-history-row
                                    data-report-version={row.version}
                                    data-report-status={row.status}
                                >
                                    <td className="py-3 pr-4 font-medium tabular-nums text-gray-900">
                                        v{row.version}
                                    </td>
                                    <td className="py-3 pr-4 text-gray-800">{statusLabel}</td>
                                    <td className="py-3 pr-4 text-gray-800">
                                        {formatFinalizedReportDate(row.finalized_at)}
                                    </td>
                                    <td className="py-3 pr-4 text-gray-800">{finalizedBy}</td>
                                    <td className="py-3">
                                        {cycleId ? (
                                            <a
                                                href={buildFinalizedReportRouteHash(
                                                    assessmentId,
                                                    cycleId,
                                                    row.version
                                                )}
                                                className="font-medium text-gray-600 underline hover:text-gray-900"
                                            >
                                                View
                                            </a>
                                        ) : null}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
