import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { formatStructureCount } from '../v1/snapshotVisualSystem';
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
}

/**
 * Repeated page footer with page numbering. Final page adds a quiet clinical note.
 * Compact so it does not create a mostly empty trailing sheet.
 */
export function PrintDocumentFooter({
    profile,
    generatedAtLabel,
    pageNumber,
    totalPages,
    isDocumentEnd = false,
}: Props) {
    const totalTargets = profile.domains.reduce((sum, domain) => sum + domain.targets.length, 0);
    const targetCountLabel = formatStructureCount(totalTargets, profile.structureLabels.target);

    return (
        <footer
            className="mt-2.5 border-t border-gray-400 pt-1 text-[7.5px] leading-snug text-black"
            data-assessment-snapshot-footer
            data-assessment-snapshot-print-footer={isDocumentEnd ? 'document' : 'page'}
            data-print-page-end={isDocumentEnd ? 'true' : undefined}
        >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="min-w-0 flex-1">
                    <span className="font-semibold">{SNAPSHOT_PRINT_PRODUCT_NAME}</span>
                    <span className="mx-1 text-gray-500" aria-hidden>
                        ·
                    </span>
                    <span>{SNAPSHOT_PRINT_CONFIDENTIALITY}</span>
                </p>
                <p
                    className="shrink-0 font-medium tabular-nums"
                    data-assessment-snapshot-print-page-label
                >
                    {formatPrintPageLabel(pageNumber, totalPages)}
                </p>
            </div>

            {isDocumentEnd ? (
                <div
                    className="mt-0.5 space-y-0.5 text-gray-700"
                    data-assessment-snapshot-print-footer-end
                >
                    <p>
                        {profile.metadata.packTitle} v{profile.metadata.packVersion}
                        <span className="mx-1 text-gray-400" aria-hidden>
                            ·
                        </span>
                        {targetCountLabel}
                        <span className="mx-1 text-gray-400" aria-hidden>
                            ·
                        </span>
                        {profile.cycles.length} cycle
                        {profile.cycles.length === 1 ? '' : 's'}
                        <span className="mx-1 text-gray-400" aria-hidden>
                            ·
                        </span>
                        Generated {generatedAtLabel}
                    </p>
                    <p data-assessment-snapshot-print-clinical-note>
                        {SNAPSHOT_PRINT_CLINICAL_NOTE}
                    </p>
                </div>
            ) : (
                <p className="mt-0.5 tabular-nums text-gray-700">
                    Generated {generatedAtLabel}
                </p>
            )}
        </footer>
    );
}
