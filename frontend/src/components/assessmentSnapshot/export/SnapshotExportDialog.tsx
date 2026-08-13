import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    ClinicalExportAuditChannel,
    logClinicalExportAudit,
} from '../../../clinicalExport/clinicalExportAudit';
import { setSnapshotExportAcknowledged } from './snapshotExportAcknowledgment';
import {
    buildSnapshotExportPreviewHash,
    canContinueSnapshotExport,
    DEFAULT_SNAPSHOT_EXPORT_STATE,
} from './snapshotExportState';

interface Props {
    isOpen: boolean;
    assessmentId: string;
    orgId?: string | null;
    userId?: string | null;
    onClose: () => void;
    /** When set, acknowledgement continues into this callback instead of navigating (Print gate). */
    onAcknowledgedContinue?: () => void;
    continueLabel?: string;
    /** Channel recorded on the acknowledgement audit event. */
    auditChannel?: ClinicalExportAuditChannel;
    /** When true, dialog must not claim every cycle is included (§5.5). */
    isPartialCycleScope?: boolean;
}

/** Complete-scope dialog body (§5.5). */
export const SNAPSHOT_EXPORT_DIALOG_BODY_COMPLETE =
    'Create a complete offline evidence record of this assessment. Snapshot export always includes every domain, target, and cycle.';

/** Partial-scope dialog body (§5.5) — domains/targets remain; cycles follow Snapshot selection. */
export const SNAPSHOT_EXPORT_DIALOG_BODY_PARTIAL =
    'Create an offline evidence record of this assessment for the cycles currently selected on Snapshot. Every domain and target remains included.';

/**
 * Snapshot PHI acknowledgement dialog (single mode: full).
 * OQ-1 microcopy is unresolved; copy follows contract §5.2 meaning only.
 */
export function SnapshotExportDialog({
    isOpen,
    assessmentId,
    orgId,
    userId,
    onClose,
    onAcknowledgedContinue,
    continueLabel = 'Continue to Export',
    auditChannel = 'export',
    isPartialCycleScope = false,
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

    const canContinue = canContinueSnapshotExport(DEFAULT_SNAPSHOT_EXPORT_STATE, {
        acknowledged,
    });

    const handleContinue = () => {
        if (!canContinue) {
            return;
        }

        setSnapshotExportAcknowledged(assessmentId);
        logClinicalExportAudit({
            orgId,
            userId,
            assessmentId,
            artifact: 'snapshot',
            channel: auditChannel,
            mode: 'full',
            event: 'acknowledgement',
        });

        if (onAcknowledgedContinue) {
            onAcknowledgedContinue();
            onClose();
            return;
        }

        window.location.hash = buildSnapshotExportPreviewHash(assessmentId);
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
                aria-labelledby="snapshot-export-dialog-title"
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2
                            id="snapshot-export-dialog-title"
                            className="text-xl font-bold text-gray-900"
                        >
                            Export Assessment Snapshot
                        </h2>
                        <p
                            className="mt-2 text-sm leading-relaxed text-gray-600"
                            data-snapshot-export-dialog-body={
                                isPartialCycleScope ? 'partial' : 'complete'
                            }
                        >
                            {isPartialCycleScope
                                ? SNAPSHOT_EXPORT_DIALOG_BODY_PARTIAL
                                : SNAPSHOT_EXPORT_DIALOG_BODY_COMPLETE}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600"
                        aria-label="Close export dialog"
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
                        retention follow your organization&apos;s PHI policy. Snapshot is raw
                        evidence — not a diagnosis, treatment plan, or interpretive report.
                    </p>
                    <label className="mt-3 flex cursor-pointer items-start gap-2">
                        <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={acknowledged}
                            onChange={(event) => setAcknowledged(event.target.checked)}
                        />
                        <span>
                            I understand this export contains PHI and I am responsible for handling
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
                        disabled={!canContinue}
                        className={`rounded-lg px-4 py-2 font-medium text-white shadow-sm transition-colors ${
                            canContinue
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
