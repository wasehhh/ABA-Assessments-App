import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
    Activity,
    ChevronDown,
    Download,
    FileCheck,
    FilePenLine,
    LayoutList,
    Map,
    MoreHorizontal,
} from 'lucide-react';
import {
    ASSESSMENT_SNAPSHOT_ENTRY_LABEL,
    ASSESSMENT_SNAPSHOT_ENTRY_SUBTITLE,
    COMMUNICATION_REPORT_ENTRY_LABEL,
    COMMUNICATION_REPORT_ENTRY_SUBTITLE,
    WRITE_REPORT_ENTRY_LABEL,
    WRITE_REPORT_ENTRY_SUBTITLE,
} from '../../pages/assessmentMatrixReportEntry';
import { MATRIX_ACTION_MARKERS } from '../../pages/assessmentMatrixOverviewContract';

export const MATRIX_EXPORT_ARIA_LABEL = 'Export assessment data';

interface MatrixHeaderMoreMenuProps {
    showNewCycle: boolean;
    onNewCycle: () => void;
    showSnapshot: boolean;
    onSnapshot: () => void;
    showWriteReport: boolean;
    onWriteReport: () => void;
    showCommunicationReport: boolean;
    onCommunicationReport: () => void;
    onExportMatrix: () => void;
    onExportAnalytics: () => void;
    onLearnerMap: () => void;
}

function MenuSection({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="py-1">
            <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {title}
            </p>
            {children}
        </div>
    );
}

function MenuRow({
    onClick,
    icon,
    label,
    subtitle,
    marker,
    className,
}: {
    onClick: () => void;
    icon: ReactNode;
    label: string;
    subtitle?: string;
    marker?: string;
    className?: string;
}) {
    const markerProp = marker ? { [marker]: true } : {};
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50 ${className ?? 'text-gray-800'}`}
            {...markerProp}
        >
            <span className="mt-0.5 shrink-0 text-gray-500">{icon}</span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                {subtitle ? (
                    <span className="mt-0.5 block text-xs text-gray-500">{subtitle}</span>
                ) : null}
            </span>
        </button>
    );
}

export function MatrixHeaderMoreMenu({
    showNewCycle,
    onNewCycle,
    showSnapshot,
    onSnapshot,
    showWriteReport,
    onWriteReport,
    showCommunicationReport,
    onCommunicationReport,
    onExportMatrix,
    onExportAnalytics,
    onLearnerMap,
}: MatrixHeaderMoreMenuProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const showDocuments = showSnapshot || showWriteReport || showCommunicationReport;
    const showLifecycle = showNewCycle;

    useEffect(() => {
        if (!open) {
            return;
        }
        const onPointerDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const closeAnd = (action: () => void) => {
        setOpen(false);
        action();
    };

    return (
        <div className="relative" ref={rootRef} data-matrix-header-more>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-haspopup="menu"
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
                More
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" aria-hidden />
            </button>
            {open ? (
                <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                >
                    {showLifecycle ? (
                        <MenuSection title="Lifecycle">
                            <MenuRow
                                onClick={() => closeAnd(onNewCycle)}
                                icon={<Activity className="h-4 w-4" aria-hidden />}
                                label="New Cycle"
                                marker="data-matrix-new-cycle"
                            />
                        </MenuSection>
                    ) : null}

                    {showDocuments ? (
                        <MenuSection title="Documents">
                            {showSnapshot ? (
                                <MenuRow
                                    onClick={() => closeAnd(onSnapshot)}
                                    icon={<LayoutList className="h-4 w-4" aria-hidden />}
                                    label={ASSESSMENT_SNAPSHOT_ENTRY_LABEL}
                                    subtitle={ASSESSMENT_SNAPSHOT_ENTRY_SUBTITLE}
                                    marker="data-assessment-snapshot-entry"
                                />
                            ) : null}
                            {showWriteReport ? (
                                <MenuRow
                                    onClick={() => closeAnd(onWriteReport)}
                                    icon={<FilePenLine className="h-4 w-4" aria-hidden />}
                                    label={WRITE_REPORT_ENTRY_LABEL}
                                    subtitle={WRITE_REPORT_ENTRY_SUBTITLE}
                                    marker="data-report-authoring-entry"
                                />
                            ) : null}
                            {showCommunicationReport ? (
                                <MenuRow
                                    onClick={() => closeAnd(onCommunicationReport)}
                                    icon={<FileCheck className="h-4 w-4" aria-hidden />}
                                    label={COMMUNICATION_REPORT_ENTRY_LABEL}
                                    subtitle={COMMUNICATION_REPORT_ENTRY_SUBTITLE}
                                    marker="data-finalized-report-entry"
                                />
                            ) : null}
                        </MenuSection>
                    ) : null}

                    <MenuSection title="Analysis export">
                        <div
                            className="px-4 pb-1 pt-0.5"
                            role="group"
                            aria-label={MATRIX_EXPORT_ARIA_LABEL}
                        >
                            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                <Download className="h-4 w-4 text-gray-500" aria-hidden />
                                <span className="hidden sm:inline">Export</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => closeAnd(onExportMatrix)}
                            className="w-full px-4 py-3 text-left text-gray-800 hover:bg-emerald-50/60"
                        >
                            <span className="block text-sm font-semibold text-gray-900">
                                Export Matrix CSV
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-emerald-800">
                                Includes all cycles
                            </span>
                            <span className="mt-1 block text-[11px] leading-snug text-gray-600">
                                Full assessment history — not only the cycle on screen.
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => closeAnd(onExportAnalytics)}
                            className="w-full px-4 py-3 text-left text-gray-800 hover:bg-emerald-50/60"
                        >
                            <span className="block text-sm font-semibold text-gray-900">
                                Export Analytics CSV
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-emerald-800">
                                Includes all cycles
                            </span>
                            <span className="mt-1 block text-[11px] leading-snug text-gray-600">
                                Full assessment history — not only the cycle on screen.
                            </span>
                        </button>
                    </MenuSection>

                    <MenuSection title="Computer surfaces">
                        <MenuRow
                            onClick={() => closeAnd(onLearnerMap)}
                            icon={<Map className="h-4 w-4" aria-hidden />}
                            label={MATRIX_ACTION_MARKERS.learnerMapLabel}
                        />
                    </MenuSection>
                </div>
            ) : null}
        </div>
    );
}
