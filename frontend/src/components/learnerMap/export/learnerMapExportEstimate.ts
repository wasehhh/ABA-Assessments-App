import { LearnerMapDomain } from '../../../services/learnerMapProfile';
import { segmentDomainTargets } from './learnerMapAppendixSegmentation';
import { LearnerMapExportMode, resolveAppendixDomains } from './learnerMapExportMode';

export const LEARNER_MAP_LARGE_APPENDIX_SEGMENT_THRESHOLD = 20;

export interface LearnerMapAppendixSizeEstimate {
    domainCount: number;
    targetCount: number;
    segmentCount: number;
}

export function estimateAppendixSize(
    domains: LearnerMapDomain[],
    mode: LearnerMapExportMode,
    selectedDomainIds?: string[]
): LearnerMapAppendixSizeEstimate | null {
    if (mode === 'standard') {
        return null;
    }

    const appendixDomains = resolveAppendixDomains(domains, mode, selectedDomainIds);
    let targetCount = 0;
    let segmentCount = 0;

    for (const domain of appendixDomains) {
        targetCount += domain.targets.length;
        segmentCount += segmentDomainTargets(domain.targets).length;
    }

    return {
        domainCount: appendixDomains.length,
        targetCount,
        segmentCount,
    };
}

export function formatAppendixSizeEstimateLabel(
    mode: LearnerMapExportMode,
    estimate: LearnerMapAppendixSizeEstimate | null
): string {
    if (mode === 'standard') {
        return 'No target-level appendix.';
    }

    if (!estimate || estimate.domainCount === 0) {
        return 'Select domains to estimate appendix size.';
    }

    const prefix = mode === 'full' ? 'Full appendix' : 'Selected appendix';
    const domainLabel = estimate.domainCount === 1 ? 'domain' : 'domains';
    const targetLabel = estimate.targetCount === 1 ? 'target' : 'targets';
    const segmentLabel = estimate.segmentCount === 1 ? 'segment' : 'segments';

    return `${prefix}: ${estimate.domainCount} ${domainLabel} · ${estimate.targetCount} ${targetLabel} · ${estimate.segmentCount} ${segmentLabel}`;
}

export function isLargeAppendixExport(segmentCount: number): boolean {
    return segmentCount >= LEARNER_MAP_LARGE_APPENDIX_SEGMENT_THRESHOLD;
}

export function isAllDomainsSelected(
    selectedDomainIds: string[],
    totalDomainCount: number
): boolean {
    return totalDomainCount > 0 && selectedDomainIds.length === totalDomainCount;
}
