import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { LearnerMapDisplayContext } from '../../learnerMap/learnerMapDisplayContext';
import { formatTargetIndexPageLabel } from '../print/printClinicalChrome';
import { PrintDocumentFooter } from '../print/PrintDocumentFooter';
import { PrintRunningHeader } from '../print/PrintRunningHeader';
import { buildTargetIndexRenderPlan } from '../../../utils/snapshotTargetIndexRenderPlan';
import { buildTargetIndexTableColumnCss } from '../../../utils/snapshotTargetIndexColumns';
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

/**
 * Print/export Target Index appendix (§6.6 / PR14A-4).
 *
 * Explicitly planned sheets (parallel to evidence PrintRenderPlan), each with
 * its own running header and footer. Outside PrintRenderPlan — INV-I6.
 * Page labels stay index-local ("Target index — page N of M").
 */
export function AssessmentSnapshotTargetIndexPrint({
    profile,
    index,
    generatedAtLabel,
    displayContext,
}: Props) {
    const plan = buildTargetIndexRenderPlan(index, { paper: 'letter' });

    if (plan.totalPages === 0) {
        return null;
    }

    return (
        <>
            <style
                data-assessment-snapshot-target-index-geometry="true"
                dangerouslySetInnerHTML={{ __html: buildTargetIndexTableColumnCss() }}
            />
            {plan.pages.map((page) => {
                const pageLabel = formatTargetIndexPageLabel(
                    page.pageNumber,
                    plan.totalPages
                );

                return (
                    <div
                        key={`target-index-page-${page.pageNumber}`}
                        className="assessment-snapshot-print-page"
                        data-assessment-snapshot-target-index-page={page.pageNumber}
                        data-assessment-snapshot-target-index-page-count={plan.totalPages}
                        data-assessment-snapshot-target-index-row-start={page.rowStartIndex}
                        data-assessment-snapshot-target-index-row-end={page.rowEndIndex}
                        data-print-page-header="continuation"
                        style={{ maxWidth: `${plan.profile.usableWidthRem}rem` }}
                    >
                        <PrintRunningHeader
                            profile={profile}
                            displayContext={displayContext}
                            pageNumber={page.pageNumber}
                            totalPages={plan.totalPages}
                            pageLabel={pageLabel}
                        />
                        <AssessmentSnapshotTargetIndexTable
                            index={index}
                            rows={page.rows}
                            surface="print"
                            showHeading={page.showSectionTitle}
                        />
                        <PrintDocumentFooter
                            profile={profile}
                            generatedAtLabel={generatedAtLabel}
                            pageNumber={page.pageNumber}
                            totalPages={plan.totalPages}
                            pageLabel={pageLabel}
                            isDocumentEnd={false}
                        />
                    </div>
                );
            })}
        </>
    );
}
