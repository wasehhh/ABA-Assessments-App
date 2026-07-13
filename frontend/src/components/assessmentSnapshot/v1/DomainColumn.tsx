import { LearnerMapCycleSummary, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { StructureLabels } from '../../../types';
import { ChildZonePlan, SnapshotLayoutMode } from '../../../utils/snapshotLayoutEngine';
import { CycleColumnHeader } from './CycleColumnHeader';
import { DomainZoneHeaderBands } from './domainZoneLayout';
import { zoneTargetCount } from './snapshotRenderHelpers';
import {
    formatPresentationPartHeading,
    formatPresentationTargetRange,
    formatStructureCount,
    toDisplayTitleCase,
} from './snapshotVisualSystem';
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
    isSecondaryZone: boolean;
    /** Lone zone in the row — optically center within the document measure. */
    composeCentered?: boolean;
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
    composeCentered = false,
}: Props) {
    const targetCount = zoneTargetCount(zone);
    const targetCountLabel = formatStructureCount(targetCount, structureLabels.target);
    const hasMultipleParts = zone.parts.some((part) => part.partNumber > 1);
    const repeatCycleHeaderPerPart = layoutMode === 'print' && hasMultipleParts;
    const displayTitle = toDisplayTitleCase(zone.zoneTitle);

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
            data-compose-centered={composeCentered ? 'true' : undefined}
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
                <h2
                    className={`max-w-full hyphens-auto break-words font-semibold leading-snug tracking-tight text-gray-900 line-clamp-3 ${layout.domainTitleClass}`}
                    title={zone.zoneTitle}
                >
                    {displayTitle}
                </h2>
            </header>

            <div
                className={`flex items-end justify-center overflow-hidden px-0.5 text-center ${headerBands.countBandClass}`}
                data-assessment-snapshot-target-count-band
            >
                <p className={`leading-none text-gray-400 ${layout.domainMetaClass}`}>
                    {targetCountLabel}
                </p>
            </div>

            {!repeatCycleHeaderPerPart ? (
                <div
                    className={`flex items-end overflow-hidden ${headerBands.cycleBandClass}`}
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
                    className={`overflow-hidden ${headerBands.cycleBandClass}`}
                    data-assessment-snapshot-cycle-axis-band
                    aria-hidden
                />
            )}

            <div className={layout.threadRowGapClass} data-assessment-snapshot-thread-body>
                {zone.parts.map((part) => (
                    <div
                        key={`${zone.zoneId}-part-${part.partIndex}`}
                        className={part.partNumber > 1 ? 'mt-3 space-y-1' : 'space-y-1'}
                        data-assessment-snapshot-presentation-part
                        data-part-number={part.partNumber}
                        data-part-total={part.totalParts}
                        data-part-continued={part.partNumber > 1 ? 'true' : undefined}
                    >
                        {part.partNumber > 1 ? (
                            <header
                                className="mb-1 space-y-0.5 px-0.5 text-center assessment-snapshot-part-continuation-header"
                                data-assessment-snapshot-part-continuation-header
                            >
                                <p
                                    className={`font-medium tracking-tight text-gray-500 ${layout.domainMetaClass}`}
                                >
                                    {formatPresentationPartHeading(part.partNumber, {
                                        continued: true,
                                    })}
                                </p>
                                <p className={`text-gray-400 ${layout.domainMetaClass}`}>
                                    {formatPresentationTargetRange(
                                        part.targetRange.start,
                                        part.targetRange.end,
                                        structureLabels.target
                                    )}
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
