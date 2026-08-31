import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { assessmentService } from '../services/assessments';
import { reportAuthoringService } from '../services/reportAuthoring';
import { canViewFinalizedReport } from '../services/reportAuthoringRoles';
import { userService } from '../services/users';
import {
    DataLoadErrorPanel,
    DataLoadSpinner,
} from '../components/DataLoadSurface';
import { formatFinalizedReportDate } from '../utils/finalizedReportPresentation';
import { executeProtectedLoad, type DataLoadState } from '../utils/dataLoadHonesty';
import { logReportDocumentsIndexViewAudit } from '../clinicalExport/reportViewAudit';
import { buildFinalizedReportRouteHash } from './assessmentMatrixReportEntry';
import {
    UNRESOLVED_FINALIZED_BY_LABEL,
    formatFinalizedByDisplayName,
    issuedVersionStatusLabel,
} from './issuedReportVersions';
import {
    formatCycleSectionHeading,
    groupIssuedReportsByCycle,
    type IssuedReportCycleSection,
} from './reportDocumentsIndexGrouping';

interface Props {
    assessmentId: string;
}

export function ReportDocumentsIndex({ assessmentId }: Props) {
    const { profile, user } = useAuth();
    const [loadState, setLoadState] = useState<DataLoadState>('loading');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [sections, setSections] = useState<IssuedReportCycleSection[]>([]);
    const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});
    const loadRequestRef = useRef(0);

    const canView = canViewFinalizedReport(profile?.role);

    useEffect(() => {
        void loadData();
    }, [assessmentId, canView]);

    const loadData = async () => {
        const requestId = ++loadRequestRef.current;
        setLoadState('loading');
        setLoadError(null);
        setAccessDenied(false);
        setSections([]);
        setNameByUserId({});

        if (!canView) {
            setAccessDenied(true);
            setLoadState('loaded');
            return;
        }

        const result = await executeProtectedLoad({
            requestId,
            getCurrentRequestId: () => loadRequestRef.current,
            load: async () => {
                const [issued, cycles] = await Promise.all([
                    reportAuthoringService.listIssuedReportsForAssessment(assessmentId),
                    assessmentService.getCycles(assessmentId),
                ]);
                const grouped = groupIssuedReportsByCycle(issued, cycles ?? []);
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
                return { grouped, names };
            },
        });

        if (result.kind === 'stale') {
            return;
        }

        if (result.kind === 'error') {
            setLoadError(
                'We could not load issued reports. Your records are still saved — try again.'
            );
            setLoadState('error');
            return;
        }

        setSections(result.data.grouped);
        setNameByUserId(result.data.names);
        setLoadState('loaded');
        logReportDocumentsIndexViewAudit({
            orgId: profile?.org_id,
            userId: user?.id,
            assessmentId,
        });
    };

    if (loadState === 'loading') {
        return (
            <div className="mx-auto max-w-4xl px-4 py-12">
                <DataLoadSpinner label="Loading issued reports…" />
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div
                className="mx-auto max-w-4xl px-4 py-12 text-red-600"
                data-report-documents-index-access-denied
            >
                You do not have permission to view issued reports.
            </div>
        );
    }

    if (loadState === 'error') {
        return (
            <div className="mx-auto max-w-4xl px-4 py-12">
                <DataLoadErrorPanel
                    title="Issued reports could not be loaded"
                    message={loadError ?? ''}
                    onRetry={() => void loadData()}
                    retryLabel="Retry loading issued reports"
                />
            </div>
        );
    }

    const hasRows = sections.some((section) => section.rows.length > 0);

    return (
        <div className="mx-auto max-w-4xl px-4 py-12" data-report-documents-index-page>
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
            <h1 className="text-2xl font-bold text-gray-900">Issued reports</h1>
            <p className="mt-1 text-sm text-gray-600">
                Communication reports issued for this assessment, across every cycle.
            </p>

            {!hasRows ? (
                <p className="mt-8 text-sm text-gray-600" data-report-documents-index-empty>
                    No issued communication reports for this assessment yet.
                </p>
            ) : (
                <div className="mt-8 space-y-10">
                    {sections.map((section) => (
                        <section
                            key={section.cycleId}
                            data-report-documents-index-cycle
                            data-cycle-number={section.cycleNumber}
                        >
                            <h2 className="text-sm font-semibold text-gray-900">
                                {formatCycleSectionHeading(section)}
                                {section.isActiveCycle ? (
                                    <span className="ml-2 font-normal text-gray-500">
                                        Active cycle
                                    </span>
                                ) : null}
                            </h2>
                            <table className="mt-3 w-full text-left text-sm">
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
                                    {section.rows.map((row) => {
                                        const statusLabel = issuedVersionStatusLabel(row.status);
                                        const finalizedBy =
                                            (row.finalized_by && nameByUserId[row.finalized_by]) ||
                                            UNRESOLVED_FINALIZED_BY_LABEL;
                                        return (
                                            <tr
                                                key={row.id}
                                                className="border-b border-gray-100"
                                                data-report-documents-index-row
                                                data-report-version={row.version}
                                                data-report-status={row.status}
                                                data-report-cycle-id={row.cycle_id}
                                            >
                                                <td className="py-3 pr-4 font-medium tabular-nums text-gray-900">
                                                    v{row.version}
                                                </td>
                                                <td className="py-3 pr-4 text-gray-800">
                                                    {statusLabel}
                                                </td>
                                                <td className="py-3 pr-4 text-gray-800">
                                                    {formatFinalizedReportDate(row.finalized_at)}
                                                </td>
                                                <td className="py-3 pr-4 text-gray-800">
                                                    {finalizedBy}
                                                </td>
                                                <td className="py-3">
                                                    <a
                                                        href={buildFinalizedReportRouteHash(
                                                            assessmentId,
                                                            row.cycle_id,
                                                            row.version
                                                        )}
                                                        className="font-medium text-gray-600 underline hover:text-gray-900"
                                                    >
                                                        View
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
