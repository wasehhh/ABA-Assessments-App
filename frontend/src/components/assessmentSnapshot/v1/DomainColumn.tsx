import { LearnerMapCycleSummary, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { StructureLabels } from '../../../types';
import { DomainZonePlan } from '../../../utils/snapshotLayoutEngine';
import { CycleColumnHeader } from './CycleColumnHeader';
import {
    shouldRenderSecondaryHeader,
    zoneTargetCount,
} from './snapshotRenderHelpers';
import { domainAccentClass } from './targetThreadsShared';
import { ThreadsLayoutTokens } from './threadsLayout';
import { TargetThread } from './TargetThread';

interface Props {
    zone: DomainZonePlan;
    cycles: LearnerMapCycleSummary[];
    targetsById: Map<string, LearnerMapTarget>;
    cycleDateLabels?: Record<string, string>;
    layout: ThreadsLayoutTokens;
    structureLabels: StructureLabels;
}

export function DomainColumn({
    zone,
    cycles,
    targetsById,
    cycleDateLabels,
    layout,
    structureLabels,
}: Props) {
    const targetLabel = structureLabels.target;
    const targetCount = zoneTargetCount(zone);
    const targetCountLabel = `${targetCount} ${targetLabel.toLowerCase()}${targetCount === 1 ? '' : 's'}`;

    return (
        <section
            className={`shrink-0 grow-0 ${layout.domainZoneClass}`}
            style={{ width: `${zone.columnWidthRem}rem` }}
            data-assessment-snapshot-domain
            data-assessment-snapshot-domain-column
            data-domain-id={zone.domainId}
            data-domain-index={zone.domainIndex}
            data-domain-target-count={targetCount}
        >
            <header className="mb-2 px-0.5">
                <div className="flex flex-col items-center gap-1 text-center">
                    <span
                        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${domainAccentClass(zone.domainIndex)}`}
                        aria-hidden
                    />
                    <h2
                        className={`max-w-full hyphens-auto break-words font-bold uppercase leading-snug tracking-wide text-gray-900 ${layout.domainTitleClass}`}
                    >
                        {zone.domainTitle}
                    </h2>
                    <p className={`text-gray-500 ${layout.domainMetaClass}`}>{targetCountLabel}</p>
                </div>
            </header>

            <CycleColumnHeader
                cycles={cycles}
                cycleDateLabels={cycleDateLabels}
                layout={layout}
                labelOffsetClass={layout.labelOffsetClass}
            />

            <div className={layout.threadRowGapClass}>
                {zone.parts.map((part) => (
                    <div
                        key={`${zone.domainId}-part-${part.partIndex}`}
                        className={part.partNumber > 1 ? 'mt-2 space-y-1' : 'space-y-1'}
                        data-assessment-snapshot-presentation-part
                        data-part-number={part.partNumber}
                        data-part-total={part.totalParts}
                    >
                        {part.partNumber > 1 ? (
                            // Part header copy mirrors RenderPlan title format
                            // ({domainTitle} · Part N · Targets X–Y) using existing typography —
                            // not part.title, which is a single-line plan label for export/print.
                            <div className="space-y-0.5 px-0.5 text-center">
                                <h3
                                    className={`max-w-full hyphens-auto break-words font-bold uppercase leading-snug tracking-wide text-gray-900 ${layout.domainTitleClass}`}
                                >
                                    {zone.domainTitle}
                                </h3>
                                <p
                                    className={`font-semibold uppercase tracking-wide text-gray-600 ${layout.domainMetaClass}`}
                                >
                                    Part {part.partNumber}
                                </p>
                                <p className={`text-gray-500 ${layout.domainMetaClass}`}>
                                    Targets {part.targetRange.start}–{part.targetRange.end}
                                </p>
                            </div>
                        ) : null}

                        {part.secondarySections.map((section, sectionIndex) => (
                            <div
                                key={
                                    section.secondaryGroupId ??
                                    (section.title || `section-${sectionIndex}`)
                                }
                                className="space-y-1"
                                data-assessment-snapshot-secondary-group
                            >
                                {shouldRenderSecondaryHeader(section.title) ? (
                                    <p
                                        className={`px-0.5 text-center font-semibold uppercase tracking-wide text-gray-500 ${layout.domainMetaClass}`}
                                    >
                                        {section.title}
                                    </p>
                                ) : null}
                                <div className={layout.threadRowGapClass}>
                                    {section.threads.map((thread) => (
                                        <TargetThread
                                            key={thread.targetId}
                                            thread={thread}
                                            target={targetsById.get(thread.targetId)}
                                            cycles={cycles}
                                            cycleDateLabels={cycleDateLabels}
                                            layout={layout}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
}
