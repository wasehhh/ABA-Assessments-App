import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import {
    formatStructureCount,
    SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN,
} from '../v1/snapshotVisualSystem';
import { formatCycleScopeLineValue, isPartialCycleScope } from '../v1/snapshotCycleScope';
import {
    formatPrintPageLabel,
    SNAPSHOT_PRINT_CLINICAL_NOTE,
    SNAPSHOT_PRINT_CONFIDENTIALITY,
    SNAPSHOT_PRINT_PRODUCT_NAME,
} from './printClinicalChrome';

interface Props {
    profile: AssessmentSnapshotProfile;
    generatedAtLabel: string;
    pageNumber: number;
    totalPages: number;
    /** Richer clinical note + pack summary — only on the final planned page. */
    isDocumentEnd?: boolean;
    /** When set, replaces the default "Page N of M" evidence label. */
    pageLabel?: string;
    showScores?: boolean;
    /** Unfiltered assessment cycle count — required under partial scope (§5.1). */
    assessmentCycleCount?: number;
}

/**
 * Repeated page footer with page numbering. Final page adds a quiet clinical note.
 * Single primary row (plus clinical note on document end) so chrome stays compact.
 */
export function PrintDocumentFooter({
    profile,
    generatedAtLabel,
    pageNumber,
    totalPages,
    isDocumentEnd = false,
    pageLabel,
    showScores = true,
    assessmentCycleCount,
}: Props) {
    const totalTargets = profile.domains.reduce((sum, domain) => sum + domain.targets.length, 0);
    const targetCountLabel = formatStructureCount(totalTargets, profile.structureLabels.target);
    const label = pageLabel ?? formatPrintPageLabel(pageNumber, totalPages);
    const totalCycles = assessmentCycleCount ?? profile.cycles.length;
    const includedIds = profile.cycles.map((cycle) => cycle.cycleId);
    const cycleLabel = isPartialCycleScope(includedIds, totalCycles)
        ? formatCycleScopeLineValue(profile.cycles, totalCycles)
        : `${profile.cycles.length} cycle${profile.cycles.length === 1 ? '' : 's'}`;

    return (
        <footer
            className="mt-2.5 border-t border-gray-400 pt-1 text-[7.5px] leading-tight text-black"
            data-assessment-snapshot-footer
            data-assessment-snapshot-print-footer={isDocumentEnd ? 'document' : 'page'}
            data-print-page-end={isDocumentEnd ? 'true' : undefined}
        >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0">
                <p className="min-w-0 flex-1">
                    <span className="font-semibold">{SNAPSHOT_PRINT_PRODUCT_NAME}</span>
                    <span className="mx-1 text-gray-500" aria-hidden>
                        ·
                    </span>
                    <span data-assessment-snapshot-print-confidentiality>
                        {SNAPSHOT_PRINT_CONFIDENTIALITY}
                    </span>
                    {isDocumentEnd ? (
                        <>
                            <span className="mx-1 text-gray-400" aria-hidden>
                                ·
                            </span>
                            <span data-assessment-snapshot-print-pack-meta>
                                {profile.metadata.packTitle} v{profile.metadata.packVersion}
                            </span>
                            <span className="mx-1 text-gray-400" aria-hidden>
                                ·
                            </span>
                            <span data-assessment-snapshot-print-target-count>
                                {targetCountLabel}
                            </span>
                            <span className="mx-1 text-gray-400" aria-hidden>
                                ·
                            </span>
                            <span data-assessment-snapshot-print-cycle-count>{cycleLabel}</span>
                        </>
                    ) : null}
                    <span className="mx-1 text-gray-400" aria-hidden>
                        ·
                    </span>
                    <span className="tabular-nums" data-assessment-snapshot-print-generated-at>
                        Generated {generatedAtLabel}
                    </span>
                </p>
                <p
                    className="shrink-0 font-medium tabular-nums"
                    data-assessment-snapshot-print-page-label
                >
                    {label}
                </p>
            </div>

            {showScores ? null : (
                <p className="mt-0.5 text-gray-700" data-assessment-snapshot-numerals-hidden>
                    {SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN}
                </p>
            )}

            {isDocumentEnd ? (
                <p
                    className="mt-0.5 text-gray-700"
                    data-assessment-snapshot-print-footer-end
                    data-assessment-snapshot-print-clinical-note
                >
                    {SNAPSHOT_PRINT_CLINICAL_NOTE}
                </p>
            ) : null}
        </footer>
    );
}
