import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { LearnerMapDisplayContext } from '../../learnerMap/learnerMapDisplayContext';
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
    /** Evidence page count from PrintRenderPlan — index starts after. */
    evidencePageCount: number;
}

/**
 * Print/export Target Index appendix (§6.6).
 * Renders as the next `assessment-snapshot-print-page` so CSS forces a new sheet
 * after all evidence pages. Outside PrintRenderPlan — INV-I6.
 */
export function AssessmentSnapshotTargetIndexPrint({
    profile,
    index,
    generatedAtLabel,
    displayContext,
    evidencePageCount,
}: Props) {
    const indexPageNumber = evidencePageCount + 1;
    const documentPageCount = evidencePageCount + 1;

    return (
        <div
            className="assessment-snapshot-print-page"
            data-assessment-snapshot-print-page={indexPageNumber}
            data-assessment-snapshot-target-index-page
            data-print-page-header="continuation"
        >
            <PrintRunningHeader
                profile={profile}
                displayContext={displayContext}
                pageNumber={indexPageNumber}
                totalPages={documentPageCount}
            />
            <AssessmentSnapshotTargetIndexTable index={index} surface="print" />
            <PrintDocumentFooter
                profile={profile}
                generatedAtLabel={generatedAtLabel}
                pageNumber={indexPageNumber}
                totalPages={documentPageCount}
                isDocumentEnd={false}
            />
        </div>
    );
}
