import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { logClinicalExportAudit } from '../../../clinicalExport/clinicalExportAudit';
import {
    REPORT_EXPORT_MODE,
    setReportExportAcknowledged,
} from './reportExportAcknowledgment';

interface Props {
    isOpen: boolean;
    assessmentId: string;
    orgId?: string | null;
    userId?: string | null;
    onClose: () => void;
    /** When set, acknowledgement continues into this callback instead of closing only (Print gate). */
    onAcknowledgedContinue?: () => void;
    continueLabel?: string;
}

/** Dialog body copy (contract §5.5 — OQ-4 microcopy open; meanings locked). */
export const REPORT_EXPORT_DIALOG_BODY =
    'Print a data summary of this assessment for review or communication. The report reflects scored targets for the current cycle.';

export function recordReportExportAcknowledgement(input: {
    assessmentId: string;
    orgId?: string | null;
    userId?: string | null;
}): void {
    logClinicalExportAudit({
        orgId: input.orgId,
        userId: input.userId,
        assessmentId: input.assessmentId,
        artifact: 'report',
        channel: 'print',
        mode: REPORT_EXPORT_MODE,
        event: 'acknowledgement',
    });
    setReportExportAcknowledged(input.assessmentId);
}

/**
 * Report PHI acknowledgement dialog (single mode: standard / in-app print).
 * OQ-4 microcopy is unresolved; copy follows contract §5.5 meaning only.
 */
export function ReportExportDialog({
    isOpen,
    assessmentId,
    orgId,
    userId,
    onClose,
    onAcknowledgedContinue,
    continueLabel = 'Acknowledge and Print',
}: Props) {
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAcknowledged(false);
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleContinue = () => {
        if (!acknowledged) {
            return;
        }

        recordReportExportAcknowledgement({ assessmentId, orgId, userId });

        if (onAcknowledgedContinue) {
            onAcknowledgedContinue();
            onClose();
            return;
        }

        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl animate-scale-in"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-export-dialog-title"
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2
                            id="report-export-dialog-title"
                            className="text-xl font-bold text-gray-900"
                        >
                            Print Assessment Report
                        </h2>
                        <p
                            className="mt-2 text-sm leading-relaxed text-gray-600"
                            data-report-export-dialog-body="standard"
                        >
                            {REPORT_EXPORT_DIALOG_BODY}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600"
                        aria-label="Close print dialog"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div
                    className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                    role="note"
                >
                    <p className="font-semibold">Personal health information</p>
                    <p className="mt-1 leading-relaxed">
                        This document contains learner identity and assessment scores. Creating an
                        offline or printable copy can leave Evalis access control. Distribution and
                        retention follow your organization&apos;s PHI policy. This report is a data
                        summary for communication — not a diagnosis, treatment plan, or interpretive
                        clinical document.
                    </p>
                    <label className="mt-3 flex cursor-pointer items-start gap-2">
                        <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={acknowledged}
                            onChange={(event) => setAcknowledged(event.target.checked)}
                        />
                        <span>
                            I understand this printout contains PHI and I am responsible for handling
                            it according to organization policy.
                        </span>
                    </label>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleContinue}
                        disabled={!acknowledged}
                        className={`rounded-lg px-4 py-2 font-medium text-white shadow-sm transition-colors ${
                            acknowledged
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'cursor-not-allowed bg-gray-300'
                        }`}
                    >
                        {continueLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
