import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { PrimaryChapterPlan, RenderPlan } from '../../../utils/snapshotLayoutEngine';
import { DomainColumn } from './DomainColumn';
import { resolveDomainZoneHeaderBands } from './domainZoneLayout';
import { buildTargetByIdMap } from './snapshotRenderHelpers';
import {
    formatStructureCount,
    toDisplayTitleCase,
} from './snapshotVisualSystem';
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

    const countLabel = formatStructureCount(chapter.targetCount, structureLabels.target);

    return (
        <header
            className="mb-4 border-b border-gray-300 pb-2.5"
            data-assessment-snapshot-primary-chapter-header
        >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h2 className="text-base font-semibold tracking-tight text-gray-900 sm:text-[1.05rem]">
                    {toDisplayTitleCase(chapter.primaryTitle)}
                </h2>
                <p className={`text-gray-400 ${layout.domainMetaClass}`}>{countLabel}</p>
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
                className="assessment-snapshot-domain-grid space-y-10"
                data-assessment-snapshot-domain-grid
            >
                {renderPlan.chapters.map((chapter) => (
                    <section
                        key={`${chapter.chapterKind}-${chapter.primaryId}`}
                        className="assessment-snapshot-primary-chapter space-y-4"
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
                        {chapter.rows.map((row) => {
                            const composeCentered = row.zones.length === 1;

                            return (
                                <div
                                    key={`${chapter.primaryId}-row-${row.rowIndex}`}
                                    className={
                                        composeCentered
                                            ? 'flex w-full justify-center'
                                            : 'flex items-start'
                                    }
                                    style={
                                        composeCentered
                                            ? undefined
                                            : { columnGap: `${renderPlan.domainGapRem}rem` }
                                    }
                                    data-assessment-snapshot-domain-row
                                    data-row-index={row.rowIndex}
                                    data-chapter-id={chapter.primaryId}
                                    data-compose-centered={composeCentered ? 'true' : undefined}
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
                                            composeCentered={composeCentered}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </section>
                ))}
            </div>
        </div>
    );
}
