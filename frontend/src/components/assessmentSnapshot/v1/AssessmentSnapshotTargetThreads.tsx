import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { PrimaryChapterPlan, RenderPlan } from '../../../utils/snapshotLayoutEngine';
import { DomainColumn } from './DomainColumn';
import { resolveDomainZoneHeaderBands } from './domainZoneLayout';
import { buildTargetByIdMap } from './snapshotRenderHelpers';
import { resolveThreadsLayoutFromPlan, ThreadsLayoutTokens } from './threadsLayout';

export interface AssessmentSnapshotTargetThreadsProps {
    profile: AssessmentSnapshotProfile;
    renderPlan: RenderPlan;
    cycleDateLabels?: Record<string, string>;
}

function ChapterHeader({
    chapter,
    structureLabels,
    layout,
}: {
    chapter: PrimaryChapterPlan;
    structureLabels: AssessmentSnapshotProfile['structureLabels'];
    layout: ThreadsLayoutTokens;
}) {
    if (chapter.chapterKind !== 'grouped') {
        return null;
    }

    const primaryLabel = structureLabels.primary_group;
    const targetLabel = structureLabels.target;
    const countLabel = `${chapter.targetCount} ${targetLabel.toLowerCase()}${
        chapter.targetCount === 1 ? '' : 's'
    }`;

    return (
        <header
            className="mb-3 border-b border-gray-400 pb-2"
            data-assessment-snapshot-primary-chapter-header
        >
            <p
                className={`font-semibold uppercase tracking-[0.16em] text-gray-500 ${layout.domainMetaClass}`}
            >
                {primaryLabel}
            </p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h2 className="text-base font-bold uppercase tracking-wide text-gray-900 sm:text-lg">
                    {chapter.primaryTitle}
                </h2>
                <p className={`text-gray-500 ${layout.domainMetaClass}`}>{countLabel}</p>
            </div>
        </header>
    );
}

export function AssessmentSnapshotTargetThreads({
    profile,
    renderPlan,
    cycleDateLabels,
}: AssessmentSnapshotTargetThreadsProps) {
    const layout = resolveThreadsLayoutFromPlan(renderPlan);
    const targetsById = buildTargetByIdMap(profile);
    const cycles = profile.cycles;
    const headerBands = resolveDomainZoneHeaderBands(layout.tier);

    return (
        <div
            data-assessment-snapshot
            data-assessment-snapshot-v1="target-threads"
            data-assessment-snapshot-layout-tier={layout.tier}
            data-assessment-snapshot-layout-mode={renderPlan.mode}
            data-assessment-snapshot-topology={renderPlan.topology}
        >
            <div
                className="assessment-snapshot-domain-grid space-y-6"
                data-assessment-snapshot-domain-grid
            >
                {renderPlan.chapters.map((chapter) => (
                    <section
                        key={`${chapter.chapterKind}-${chapter.primaryId}`}
                        className="assessment-snapshot-primary-chapter space-y-3"
                        data-assessment-snapshot-primary-chapter
                        data-chapter-kind={chapter.chapterKind}
                        data-primary-id={chapter.primaryId}
                        data-chapter-index={chapter.chapterIndex}
                    >
                        <ChapterHeader
                            chapter={chapter}
                            structureLabels={profile.structureLabels}
                            layout={layout}
                        />
                        {chapter.rows.map((row) => (
                            <div
                                key={`${chapter.primaryId}-row-${row.rowIndex}`}
                                className="flex items-start"
                                style={{ columnGap: `${renderPlan.domainGapRem}rem` }}
                                data-assessment-snapshot-domain-row
                                data-row-index={row.rowIndex}
                                data-chapter-id={chapter.primaryId}
                            >
                                {row.zones.map((zone) => (
                                    <DomainColumn
                                        key={zone.zoneId}
                                        zone={zone}
                                        cycles={cycles}
                                        targetsById={targetsById}
                                        cycleDateLabels={cycleDateLabels}
                                        layout={layout}
                                        structureLabels={profile.structureLabels}
                                        layoutMode={renderPlan.mode}
                                        headerBands={headerBands}
                                        isSecondaryZone={zone.zoneKind === 'secondary'}
                                    />
                                ))}
                            </div>
                        ))}
                    </section>
                ))}
            </div>
        </div>
    );
}
