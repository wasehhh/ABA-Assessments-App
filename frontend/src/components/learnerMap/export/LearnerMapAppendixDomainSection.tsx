import { LearnerMapCycleSummary, LearnerMapDomain } from '../../../services/learnerMapProfile';
import { domainHasAnyScoredTargets } from '../domainCellDisplay';
import { getDomainIdentity } from '../domainIdentity';
import { LearnerMapDomainSection } from '../LearnerMapDomainSection';
import {
    formatAppendixSegmentContinuityLabel,
    LEARNER_MAP_APPENDIX_TARGETS_PER_SEGMENT,
    segmentDomainTargets,
} from './learnerMapAppendixSegmentation';

interface Props {
    domain: LearnerMapDomain;
    cycles: LearnerMapCycleSummary[];
    domainIndex: number;
    cycleDateLabels?: Record<string, string>;
}

function segmentContinuityLabel(
    domain: LearnerMapDomain,
    segment: ReturnType<typeof segmentDomainTargets>[number]
): string {
    const base = formatAppendixSegmentContinuityLabel(segment, domain.targets.length);
    if (segment.segmentNumber > 1) {
        return `${domain.title} · ${base}`;
    }
    return base;
}

export function LearnerMapAppendixDomainSection({
    domain,
    cycles,
    domainIndex,
    cycleDateLabels,
}: Props) {
    const segments = segmentDomainTargets(domain.targets);
    const identity = getDomainIdentity(domainIndex);
    const hasScoredTargets = domainHasAnyScoredTargets(domain);

    return (
        <div
            className={`rounded-r-md border border-gray-200 border-l-4 ${identity.borderClass} ${identity.headerBgClass} px-2 py-2`}
            data-learner-map-export-domain-group
            data-domain-identity={identity.id}
        >
            <div
                className="border-b border-gray-200/80 pb-2"
                data-learner-map-export-domain-header
            >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Domain Detail
                </p>
                <h3
                    className={`mt-0.5 text-sm font-bold uppercase tracking-wide leading-snug ${identity.accentTextClass}`}
                >
                    {domain.title}
                </h3>
            </div>

            {!hasScoredTargets ? (
                <p
                    className="pt-2 text-sm leading-relaxed text-gray-600"
                    data-learner-map-export-domain-empty
                >
                    No targets have been scored in the selected cycles.
                </p>
            ) : segments.length === 0 ? (
                <div className="pt-2" data-learner-map-export-domain-segment>
                    <div data-learner-map-export-segment-table-group>
                        <LearnerMapDomainSection
                            domain={domain}
                            cycles={cycles}
                            exportLayout
                            appendixCompact
                            hideSectionHeader
                            fixedTargetColumns={LEARNER_MAP_APPENDIX_TARGETS_PER_SEGMENT}
                            cycleDateLabels={cycleDateLabels}
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-2 pt-2" data-learner-map-export-domain-section>
                    {segments.map((segment) => (
                        <div
                            key={`${domain.domainId}-${segment.segmentNumber}`}
                            className={
                                segment.segmentNumber > 1
                                    ? 'border-t border-dashed border-gray-300/90 pt-1.5'
                                    : 'pt-0.5'
                            }
                            data-learner-map-export-domain-segment
                            data-segment-number={segment.segmentNumber}
                            data-segment-total={segment.totalSegments}
                        >
                            <div
                                data-learner-map-export-segment-block={
                                    segment.segmentNumber === 1 ? 'start' : 'continued'
                                }
                            >
                                <p
                                    className="mb-1 text-[11px] font-medium tabular-nums text-gray-700"
                                    data-learner-map-export-segment-label
                                >
                                    {segmentContinuityLabel(domain, segment)}
                                </p>
                                <div data-learner-map-export-segment-table-group>
                                    <LearnerMapDomainSection
                                        domain={domain}
                                        cycles={cycles}
                                        targets={segment.targets}
                                        targetOffset={segment.startIndex}
                                        exportLayout
                                        appendixCompact
                                        hideSectionHeader
                                        fixedTargetColumns={LEARNER_MAP_APPENDIX_TARGETS_PER_SEGMENT}
                                        cycleDateLabels={cycleDateLabels}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
