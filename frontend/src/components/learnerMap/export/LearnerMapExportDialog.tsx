import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LearnerMapDomain } from '../../../services/learnerMapProfile';
import {
    estimateAppendixSize,
    formatAppendixSizeEstimateLabel,
    isAllDomainsSelected,
    isLargeAppendixExport,
} from './learnerMapExportEstimate';
import {
    LEARNER_MAP_EXPORT_MODES,
    LearnerMapExportMode,
} from './learnerMapExportMode';
import {
    buildLearnerMapExportPreviewHash,
    canContinueLearnerMapExport,
    DEFAULT_LEARNER_MAP_EXPORT_STATE,
    LearnerMapExportState,
} from './learnerMapExportState';

interface Props {
    isOpen: boolean;
    assessmentId: string;
    domains: LearnerMapDomain[];
    onClose: () => void;
}

export function LearnerMapExportDialog({ isOpen, assessmentId, domains, onClose }: Props) {
    const [state, setState] = useState<LearnerMapExportState>(DEFAULT_LEARNER_MAP_EXPORT_STATE);
    const [fullAcknowledged, setFullAcknowledged] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setState(DEFAULT_LEARNER_MAP_EXPORT_STATE);
            setFullAcknowledged(false);
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const showDomainChecklist = state.exportMode === 'selected-domains';
    const showFullWarning = state.exportMode === 'full';
    const canContinue = canContinueLearnerMapExport(state, { fullAcknowledged });
    const appendixEstimate = estimateAppendixSize(
        domains,
        state.exportMode,
        state.selectedDomainIds
    );
    const appendixEstimateLabel = formatAppendixSizeEstimateLabel(
        state.exportMode,
        appendixEstimate
    );
    const showAllDomainsNudge =
        showDomainChecklist &&
        isAllDomainsSelected(state.selectedDomainIds, domains.length);
    const showLargeExportWarning =
        showFullWarning &&
        appendixEstimate !== null &&
        isLargeAppendixExport(appendixEstimate.segmentCount);

    const setExportMode = (exportMode: LearnerMapExportMode) => {
        setState((current) => ({ ...current, exportMode }));
        if (exportMode !== 'full') {
            setFullAcknowledged(false);
        }
    };

    const toggleDomainSelection = (domainId: string) => {
        setState((current) => ({
            ...current,
            selectedDomainIds: current.selectedDomainIds.includes(domainId)
                ? current.selectedDomainIds.filter((id) => id !== domainId)
                : [...current.selectedDomainIds, domainId],
        }));
    };

    const selectAllDomains = () => {
        setState((current) => ({
            ...current,
            selectedDomainIds: domains.map((domain) => domain.domainId),
        }));
    };

    const clearAllDomains = () => {
        setState((current) => ({ ...current, selectedDomainIds: [] }));
    };

    const handleContinue = () => {
        if (!canContinue) {
            return;
        }

        window.location.hash = buildLearnerMapExportPreviewHash(assessmentId, state);
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
                aria-labelledby="learner-map-export-dialog-title"
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2
                            id="learner-map-export-dialog-title"
                            className="text-xl font-bold text-gray-900"
                        >
                            Export Learner Map
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">
                            Create a printable longitudinal competency record for supervision or review.
                            Choose how much target-level detail to include.
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

                <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-gray-900">Export mode</legend>
                    {LEARNER_MAP_EXPORT_MODES.map((entry) => {
                        const checked = state.exportMode === entry.id;
                        return (
                            <label
                                key={entry.id}
                                className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-3 transition-colors ${
                                    checked
                                        ? 'border-emerald-300 bg-emerald-50/70'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="learner-map-export-mode"
                                    className="mt-1"
                                    checked={checked}
                                    onChange={() => setExportMode(entry.id)}
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-gray-900">
                                        {entry.label}
                                    </span>
                                    <span className="mt-1 block text-sm text-gray-600">
                                        {entry.description}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </fieldset>

                <p
                    className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                    data-learner-map-export-size-estimate
                >
                    {appendixEstimateLabel}
                </p>

                {showDomainChecklist ? (
                    <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                                Domains to include in appendix
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={selectAllDomains}
                                    className="rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={clearAllDomains}
                                    className="rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                        <ul className="mt-3 grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                            {domains.map((domain) => {
                                const checked = state.selectedDomainIds.includes(domain.domainId);
                                return (
                                    <li key={domain.domainId}>
                                        <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm text-gray-900 hover:bg-white">
                                            <input
                                                type="checkbox"
                                                className="mt-0.5"
                                                checked={checked}
                                                onChange={() => toggleDomainSelection(domain.domainId)}
                                            />
                                            <span>{domain.title}</span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                        {state.selectedDomainIds.length === 0 ? (
                            <p className="mt-2 text-sm text-amber-800">
                                Select at least one domain to include target-level detail.
                            </p>
                        ) : null}
                        {showAllDomainsNudge ? (
                            <p
                                className="mt-2 text-sm text-blue-800"
                                data-learner-map-export-all-domains-nudge
                            >
                                All domains are selected. Full export may be more appropriate for a
                                complete target-level record.
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {showFullWarning ? (
                    <div
                        className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                        role="note"
                    >
                        <p className="font-semibold">Large export warning</p>
                        <p className="mt-1 leading-relaxed">
                            Full export includes target-level detail for every domain and may create a
                            long document. Use this for audit, deep review, or complete records.
                        </p>
                        {showLargeExportWarning ? (
                            <p className="mt-2 font-medium text-amber-900">
                                This export may be long when printed.
                            </p>
                        ) : null}
                        <label className="mt-3 flex cursor-pointer items-start gap-2">
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={fullAcknowledged}
                                onChange={(event) => setFullAcknowledged(event.target.checked)}
                            />
                            <span>I understand this may produce a long document.</span>
                        </label>
                    </div>
                ) : null}

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
                        Continue to Export Preview
                    </button>
                </div>
            </div>
        </div>
    );
}
