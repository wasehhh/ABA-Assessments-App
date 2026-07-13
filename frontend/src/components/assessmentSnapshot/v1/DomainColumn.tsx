import { LearnerMapCycleSummary, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { StructureLabels } from '../../../types';
import { ChildZonePlan, SnapshotLayoutMode } from '../../../utils/snapshotLayoutEngine';
import { CycleColumnHeader } from './CycleColumnHeader';
import { DomainZoneHeaderBands } from './domainZoneLayout';
import { zoneTargetCount } from './snapshotRenderHelpers';
import { domainAccentClass } from './targetThreadsShared';
import { ThreadsLayoutTokens } from './threadsLayout';
import { TargetThread } from './TargetThread';

interface Props {
    zone: ChildZonePlan;
    cycles: LearnerMapCycleSummary[];
    targetsById: Map<string, LearnerMapTarget>;
    cycleDateLabels?: Record<string, string>;
    layout: ThreadsLayoutTokens;
    structureLabels: StructureLabels;
    layoutMode: SnapshotLayoutMode;
    headerBands: DomainZoneHeaderBands;
    /** When true, zone is a secondary group under a chapter (show domain label lightly). */
    isSecondaryZone: boolean;
}

export function DomainColumn({
    zone,
    cycles,
    targetsById,
    cycleDateLabels,
    layout,
    structureLabels,
    layoutMode,
    headerBands,
    isSecondaryZone,
}: Props) {
    const targetLabel = structureLabels.target;
    const targetCount = zoneTargetCount(zone);
    const targetCountLabel = `${targetCount} ${targetLabel.toLowerCase()}${targetCount === 1 ? '' : 's'}`;
    const hasMultipleParts = zone.parts.some((part) => part.partNumber > 1);
    const repeatCycleHeaderPerPart = layoutMode === 'print' && hasMultipleParts;

    return (
        <section
            className={`grid shrink-0 grow-0 ${layout.domainZoneClass}`}
            style={{
                width: `${zone.columnWidthRem}rem`,
                gridTemplateRows: `${headerBands.primaryTitleBandRem}rem ${headerBands.targetCountBandRem}rem ${headerBands.cycleAxisBandRem}rem minmax(0, 1fr)`,
            }}
            data-assessment-snapshot-domain
            data-assessment-snapshot-domain-column
            data-assessment-snapshot-domain-zone
            data-zone-id={zone.zoneId}
            data-zone-kind={zone.zoneKind}
            data-is-secondary-zone={isSecondaryZone ? 'true' : undefined}
            data-primary-id={zone.primaryId}
            data-domain-id={zone.primaryId}
            data-domain-index={zone.zoneIndex}
            data-domain-target-count={targetCount}
        >
            <header
                className={`flex flex-col items-center justify-end overflow-hidden px-0.5 text-center assessment-snapshot-domain-zone-header ${headerBands.titleBandClass}`}
                data-assessment-snapshot-domain-zone-header
                data-assessment-snapshot-primary-title-band
            >
                <span
                    className={`mb-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${domainAccentClass(zone.zoneIndex)}`}
                    aria-hidden
                />
                <h2
                    className={`max-w-full hyphens-auto break-words font-bold uppercase leading-snug tracking-wide text-gray-900 line-clamp-3 ${layout.domainTitleClass}`}
                    title={zone.zoneTitle}
                >
                    {zone.zoneTitle}
                </h2>
            </header>

            <div
                className={`flex items-end justify-center px-0.5 text-center ${headerBands.countBandClass}`}
                data-assessment-snapshot-target-count-band
            >
                <p className={`text-gray-500 ${layout.domainMetaClass}`}>{targetCountLabel}</p>
            </div>

            {!repeatCycleHeaderPerPart ? (
                <div
                    className={`flex items-end ${headerBands.cycleBandClass}`}
                    data-assessment-snapshot-cycle-axis-band
                >
                    <CycleColumnHeader
                        cycles={cycles}
                        cycleDateLabels={cycleDateLabels}
                        layout={layout}
                        labelOffsetClass={layout.labelOffsetClass}
                    />
                </div>
            ) : (
                <div
                    className={headerBands.cycleBandClass}
                    data-assessment-snapshot-cycle-axis-band
                    aria-hidden
                />
            )}

            <div className={layout.threadRowGapClass} data-assessment-snapshot-thread-body>
                {zone.parts.map((part) => (
                    <div
                        key={`${zone.zoneId}-part-${part.partIndex}`}
                        className={part.partNumber > 1 ? 'mt-2 space-y-1' : 'space-y-1'}
                        data-assessment-snapshot-presentation-part
                        data-part-number={part.partNumber}
                        data-part-total={part.totalParts}
                        data-part-continued={part.partNumber > 1 ? 'true' : undefined}
                    >
                        {part.partNumber > 1 ? (
                            <header
                                className="space-y-0.5 rounded border border-dashed border-gray-300 bg-gray-50 px-1 py-1 text-center assessment-snapshot-part-continuation-header"
                                data-assessment-snapshot-part-continuation-header
                            >
                                <p
                                    className={`font-semibold uppercase tracking-wide text-gray-500 ${layout.domainMetaClass}`}
                                >
                                    Presentation · Part {part.partNumber}
                                    {part.totalParts > 1 ? ' (continued)' : ''}
                                </p>
                                <p className={`text-gray-500 ${layout.domainMetaClass}`}>
                                    {targetLabel}s {part.targetRange.start}–{part.targetRange.end}
                                </p>
                            </header>
                        ) : null}

                        {repeatCycleHeaderPerPart ? (
                            <CycleColumnHeader
                                cycles={cycles}
                                cycleDateLabels={cycleDateLabels}
                                layout={layout}
                                labelOffsetClass={layout.labelOffsetClass}
                            />
                        ) : null}

                        <div className={layout.threadRowGapClass}>
                            {part.threads.map((thread) => (
                                <TargetThread
                                    key={thread.targetId}
                                    thread={thread}
                                    target={targetsById.get(thread.targetId)}
                                    cycles={cycles}
                                    cycleDateLabels={cycleDateLabels}
                                    layout={layout}
                                    layoutMode={layoutMode}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
