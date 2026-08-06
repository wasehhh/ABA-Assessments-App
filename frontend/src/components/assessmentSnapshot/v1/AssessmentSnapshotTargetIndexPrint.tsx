import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { LearnerMapDisplayContext } from '../../learnerMap/learnerMapDisplayContext';
import { formatTargetIndexPageLabel } from '../print/printClinicalChrome';
import { PrintDocumentFooter } from '../print/PrintDocumentFooter';
import { PrintRunningHeader } from '../print/PrintRunningHeader';
import {
    AssessmentSnapshotTargetIndexTable,
} from './AssessmentSnapshotTargetIndexTable';
import { SnapshotTargetIndex } from './snapshotTargetIndex';

interface Props {
    profile: AssessmentSnapshotProfile;
    index: SnapshotTargetIndex;
    generatedAtLabel: string;
    displayContext?: LearnerMapDisplayContext;
}

/** Explicit index sheets today; CSS may flow further — numbering stays index-local. */
const TARGET_INDEX_PAGE_COUNT = 1;

/**
 * Print/export Target Index appendix (§6.6).
 * Renders as the next `assessment-snapshot-print-page` so CSS forces a new sheet
 * after all evidence pages. Outside PrintRenderPlan — INV-I6.
 *
 * Page labels use an index-only scheme ("Target index — page N of M") so evidence
 * footers stay "Page N of N" from PrintRenderPlan and INV-I6 coupling is avoided.
 */
export function AssessmentSnapshotTargetIndexPrint({
    profile,
    index,
    generatedAtLabel,
    displayContext,
}: Props) {
    const indexPageNumber = 1;
    const pageLabel = formatTargetIndexPageLabel(indexPageNumber, TARGET_INDEX_PAGE_COUNT);

    return (
        <div
            className="assessment-snapshot-print-page"
            data-assessment-snapshot-target-index-page={indexPageNumber}
            data-assessment-snapshot-target-index-page-count={TARGET_INDEX_PAGE_COUNT}
            data-print-page-header="continuation"
        >
            <PrintRunningHeader
                profile={profile}
                displayContext={displayContext}
                pageNumber={indexPageNumber}
                totalPages={TARGET_INDEX_PAGE_COUNT}
                pageLabel={pageLabel}
            />
            <AssessmentSnapshotTargetIndexTable index={index} surface="print" />
            <PrintDocumentFooter
                profile={profile}
                generatedAtLabel={generatedAtLabel}
                pageNumber={indexPageNumber}
                totalPages={TARGET_INDEX_PAGE_COUNT}
                pageLabel={pageLabel}
                isDocumentEnd={false}
            />
        </div>
    );
}
