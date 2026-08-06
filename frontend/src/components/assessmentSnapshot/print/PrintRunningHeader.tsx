import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { LearnerMapDisplayContext } from '../../learnerMap/learnerMapDisplayContext';
import {
    formatPrintPageLabel,
    resolveSnapshotPrintIdentity,
    SNAPSHOT_PRINT_ARTIFACT_LABEL,
} from './printClinicalChrome';

interface Props {
    profile: AssessmentSnapshotProfile;
    displayContext?: LearnerMapDisplayContext;
    pageNumber: number;
    totalPages: number;
    /** When set, replaces the default "Page N of M" evidence label. */
    pageLabel?: string;
}

/**
 * Continuation-page running header — restrained identity + page number.
 * Omits Cycle Reference and legend to preserve column capacity.
 */
export function PrintRunningHeader({
    profile,
    displayContext,
    pageNumber,
    totalPages,
    pageLabel,
}: Props) {
    const identity = resolveSnapshotPrintIdentity(profile, displayContext);
    const label = pageLabel ?? formatPrintPageLabel(pageNumber, totalPages);

    return (
        <header
            className="mb-2 flex items-baseline justify-between gap-x-3 border-b border-gray-400 pb-1"
            data-assessment-snapshot-print-running-header
            data-assessment-snapshot-print-header="continuation"
        >
            <div className="min-w-0 flex-1">
                <p className="truncate text-[8px] font-semibold uppercase tracking-[0.14em] text-black">
                    {SNAPSHOT_PRINT_ARTIFACT_LABEL}
                    <span className="mx-1.5 font-normal text-gray-500" aria-hidden>
                        ·
                    </span>
                    <span className="font-medium normal-case tracking-normal text-gray-800">
                        {identity.learnerName}
                    </span>
                </p>
                <p className="mt-0.5 truncate text-[8px] text-gray-700" title={identity.packLabel}>
                    {identity.assessmentName}
                    <span className="mx-1 text-gray-400" aria-hidden>
                        ·
                    </span>
                    {identity.packLabel}
                </p>
            </div>
            <p
                className="shrink-0 text-[8px] font-medium tabular-nums text-black"
                data-assessment-snapshot-print-page-label
            >
                {label}
            </p>
        </header>
    );
}
