import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { PrintRenderPlan } from '../../../utils/snapshotPrintRenderPlan';
import { LearnerMapDisplayContext } from '../../learnerMap/learnerMapDisplayContext';
import { resolveDomainZoneHeaderBands } from '../v1/domainZoneLayout';
import { buildTargetByIdMap } from '../v1/snapshotRenderHelpers';
import { formatStructureCount, toDisplayTitleCase } from '../v1/snapshotVisualSystem';
import { resolveThreadsLayoutFromPlan } from '../v1/threadsLayout';
import { PrintDocumentFooter } from './PrintDocumentFooter';
import { PrintDocumentHeader } from './PrintDocumentHeader';
import { PrintDomainSegment } from './PrintDomainSegment';
import { PrintRunningHeader } from './PrintRunningHeader';
import { AssessmentSnapshotTargetIndexPrint } from '../v1/AssessmentSnapshotTargetIndexPrint';
import { buildSnapshotTargetIndex } from '../v1/snapshotTargetIndex';

interface Props {
    profile: AssessmentSnapshotProfile;
    plan: PrintRenderPlan;
    generatedAtLabel: string;
    displayContext?: LearnerMapDisplayContext;
    cycleDateLabels?: Record<string, string>;
}

/**
 * PR13.6B/C — Explicit print renderer with clinical chrome.
 *
 * Renders the {@link PrintRenderPlan} DOM directly: page → row → column → domain
 * segment. Page placement is decided by the plan (not CSS). PR13.6C adds document
 * metadata, restrained continuation headers, and a repeated page footer with
 * numbering — presentation only; composition is unchanged.
 */
export function AssessmentSnapshotPrintDocument({
    profile,
    plan,
    generatedAtLabel,
    displayContext,
    cycleDateLabels,
}: Props) {
    const layout = resolveThreadsLayoutFromPlan({
        tier: plan.tier,
        domainColumnWidthRem: plan.domainColumnWidthRem,
        mode: 'print',
    });
    const targetsById = buildTargetByIdMap(profile);
    const headerBands = resolveDomainZoneHeaderBands(plan.tier);
    const targetIndex = buildSnapshotTargetIndex(profile);

    return (
        <div
            data-assessment-snapshot-print-document
            data-assessment-snapshot-print-profile={plan.profileId}
            data-assessment-snapshot-layout-tier={plan.tier}
            data-assessment-snapshot-topology={plan.topology}
            data-assessment-snapshot-print-pages={plan.totalPages}
            data-assessment-snapshot-columns-per-page={plan.columnsPerPage}
            data-assessment-snapshot-has-target-index={targetIndex ? 'true' : undefined}
        >
            {plan.pages.map((page) => {
                const isDocumentPage =
                    page.headerMode === 'document' || page.headerMode === 'document-chapter';
                const isDocumentEnd = page.footerMode === 'document';

                return (
                    <div
                        key={`print-page-${page.pageNumber}`}
                        className="assessment-snapshot-print-page"
                        data-assessment-snapshot-print-page={page.pageNumber}
                        data-print-page-header={page.headerMode}
                        data-print-page-capacity={page.columnCapacity}
                        style={{ maxWidth: `${page.availableWidthRem}rem` }}
                    >
                        {isDocumentPage ? (
                            <PrintDocumentHeader
                                profile={profile}
                                generatedAtLabel={generatedAtLabel}
                                displayContext={displayContext}
                                cycleDateLabels={cycleDateLabels}
                            />
                        ) : (
                            <PrintRunningHeader
                                profile={profile}
                                displayContext={displayContext}
                                pageNumber={page.pageNumber}
                                totalPages={plan.totalPages}
                            />
                        )}

                        {page.chapterBand ? (
                            <header
                                className="mb-1.5 border-b border-gray-500 pb-1"
                                data-assessment-snapshot-print-chapter-band
                                data-primary-id={page.chapterBand.primaryGroupId}
                                data-chapter-continued={
                                    page.chapterBand.isChapterContinuation ? 'true' : undefined
                                }
                            >
                                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                                    <h2 className="text-[11px] font-semibold tracking-tight text-black">
                                        {toDisplayTitleCase(page.chapterBand.chapterTitle)}
                                        {page.chapterBand.isChapterContinuation ? (
                                            <span className="font-normal text-gray-600">
                                                {' '}
                                                · continued
                                            </span>
                                        ) : null}
                                    </h2>
                                    <p className="text-[8px] text-gray-600">
                                        {formatStructureCount(
                                            page.chapterBand.targetCount,
                                            profile.structureLabels.target
                                        )}
                                    </p>
                                </div>
                            </header>
                        ) : null}

                        {page.rows.map((row) => (
                            <div
                                key={`print-page-${page.pageNumber}-row-${row.rowIndex}`}
                                className="flex items-start"
                                style={{ columnGap: `${plan.columnGapRem}rem` }}
                                data-assessment-snapshot-print-row={row.rowIndex}
                            >
                                {row.columns.map((column) => (
                                    <div
                                        key={`col-${column.columnIndex}-${column.segment.domainKey}-${column.segment.segmentNumber}`}
                                        className="relative shrink-0 grow-0 assessment-snapshot-print-column"
                                        style={{ width: `${column.widthRem}rem` }}
                                        data-assessment-snapshot-print-column={column.columnIndex}
                                        data-domain-id={column.segment.domainId}
                                        data-segment-number={column.segment.segmentNumber}
                                    >
                                        {column.segment.connectsToPreviousInRow ? (
                                            <span
                                                className="assessment-snapshot-print-connector"
                                                aria-hidden
                                                data-assessment-snapshot-segment-connector
                                            />
                                        ) : null}
                                        <PrintDomainSegment
                                            segment={column.segment}
                                            cycles={profile.cycles}
                                            targetsById={targetsById}
                                            cycleDateLabels={cycleDateLabels}
                                            layout={layout}
                                            structureLabels={profile.structureLabels}
                                            headerBands={headerBands}
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}

                        <PrintDocumentFooter
                            profile={profile}
                            generatedAtLabel={generatedAtLabel}
                            pageNumber={page.pageNumber}
                            totalPages={plan.totalPages}
                            isDocumentEnd={isDocumentEnd}
                        />
                    </div>
                );
            })}
            {targetIndex ? (
                <AssessmentSnapshotTargetIndexPrint
                    profile={profile}
                    index={targetIndex}
                    generatedAtLabel={generatedAtLabel}
                    displayContext={displayContext}
                />
            ) : null}
        </div>
    );
}
