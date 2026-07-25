import { LearnerMapCycleSummary, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { StructureLabels } from '../../../types';
import { DomainSegmentPlan } from '../../../utils/snapshotPrintRenderPlan';
import { CycleColumnHeader } from '../v1/CycleColumnHeader';
import { DomainZoneHeaderBands } from '../v1/domainZoneLayout';
import { resolveZoneThreadLabelDisplays } from '../v1/snapshotThreadDisplay';
import {
    formatTargetOrdinalRange,
    toDisplayTitleCase,
} from '../v1/snapshotVisualSystem';
import { TargetThread } from '../v1/TargetThread';
import { ThreadsLayoutTokens } from '../v1/threadsLayout';

interface Props {
    segment: DomainSegmentPlan;
    cycles: LearnerMapCycleSummary[];
    targetsById: Map<string, LearnerMapTarget>;
    cycleDateLabels?: Record<string, string>;
    layout: ThreadsLayoutTokens;
    structureLabels: StructureLabels;
    headerBands: DomainZoneHeaderBands;
}

/**
 * One domain segment inside a print column. Repeats the durable continuation
 * identity (domain title, target range, optional quiet "continued" label) so a
 * split domain is unmistakable whether it sits beside its previous segment, wraps
 * to a new row, or crosses a page — no physical connector required.
 */
export function PrintDomainSegment({
    segment,
    cycles,
    targetsById,
    cycleDateLabels,
    layout,
    structureLabels,
    headerBands,
}: Props) {
    const displayTitle = toDisplayTitleCase(segment.domainTitle);
    const rangeLabel = formatTargetOrdinalRange(
        segment.targetStartOrdinal,
        segment.targetEndOrdinal,
        structureLabels.target
    );

    const labelTargets = segment.threads.map((thread) => {
        const target = targetsById.get(thread.targetId);
        return {
            targetId: target?.targetId ?? thread.targetId,
            title: target?.title ?? thread.title,
        };
    });
    const labels = resolveZoneThreadLabelDisplays(labelTargets, 'print');
    const labelByTargetId = new Map(
        segment.threads.map((thread, index) => [thread.targetId, labels[index]!])
    );

    return (
        <section
            className="grid w-full assessment-snapshot-print-segment"
            style={{
                gridTemplateRows: `${headerBands.primaryTitleBandRem}rem ${headerBands.targetCountBandRem}rem ${headerBands.cycleAxisBandRem}rem minmax(0, 1fr)`,
            }}
            data-assessment-snapshot-domain-segment
            data-domain-id={segment.domainId}
            data-domain-key={segment.domainKey}
            data-segment-number={segment.segmentNumber}
            data-segment-count={segment.segmentCount}
            data-segment-continued={segment.isContinuation ? 'true' : undefined}
            data-connects-previous={segment.connectsToPreviousInRow ? 'true' : undefined}
            data-target-start={segment.targetStartOrdinal}
            data-target-end={segment.targetEndOrdinal}
        >
            <header
                className={`flex flex-col items-center justify-end overflow-hidden border-t border-gray-500 px-0.5 pt-0.5 text-center assessment-snapshot-domain-zone-header ${headerBands.titleBandClass}`}
                data-assessment-snapshot-domain-zone-header
                data-assessment-snapshot-segment-title
            >
                <h3
                    className={`max-w-full hyphens-auto break-words font-semibold leading-snug tracking-tight text-black line-clamp-3 ${layout.domainTitleClass}`}
                    title={segment.domainTitle}
                >
                    {displayTitle}
                    {segment.isContinuation ? (
                        <span className="font-normal text-gray-700"> · continued</span>
                    ) : null}
                </h3>
            </header>

            <div
                className={`flex items-end justify-center overflow-hidden px-0.5 text-center ${headerBands.countBandClass}`}
                data-assessment-snapshot-segment-range
            >
                <p className={`leading-none text-gray-700 ${layout.domainMetaClass}`}>
                    {rangeLabel}
                    {segment.segmentCount > 1 ? (
                        <span className="text-gray-600">
                            {' '}
                            ({segment.segmentNumber}/{segment.segmentCount})
                        </span>
                    ) : null}
                </p>
            </div>

            <div
                className={`flex items-end overflow-hidden ${headerBands.cycleBandClass}`}
                data-assessment-snapshot-cycle-axis-band
            >
                <CycleColumnHeader
                    cycles={cycles}
                    layout={layout}
                    labelOffsetClass={layout.labelOffsetClass}
                    layoutMode="print"
                />
            </div>

            <div className={layout.threadRowGapClass} data-assessment-snapshot-thread-body>
                {segment.threads.map((thread) => (
                    <TargetThread
                        key={thread.targetId}
                        thread={thread}
                        target={targetsById.get(thread.targetId)}
                        cycles={cycles}
                        cycleDateLabels={cycleDateLabels}
                        layout={layout}
                        layoutMode="print"
                        labelDisplay={labelByTargetId.get(thread.targetId)}
                    />
                ))}
            </div>
        </section>
    );
}
