import { LearnerMapTarget } from '../../../services/learnerMapProfile';

export const LEARNER_MAP_APPENDIX_TARGETS_PER_SEGMENT = 15;

export interface LearnerMapTargetSegment {
    targets: LearnerMapTarget[];
    startIndex: number;
    endIndex: number;
    segmentNumber: number;
    totalSegments: number;
}

export function segmentDomainTargets(
    targets: LearnerMapTarget[],
    segmentSize: number = LEARNER_MAP_APPENDIX_TARGETS_PER_SEGMENT
): LearnerMapTargetSegment[] {
    if (targets.length === 0) {
        return [];
    }

    const totalSegments = Math.ceil(targets.length / segmentSize);
    const segments: LearnerMapTargetSegment[] = [];

    for (let startIndex = 0; startIndex < targets.length; startIndex += segmentSize) {
        const slice = targets.slice(startIndex, startIndex + segmentSize);
        segments.push({
            targets: slice,
            startIndex,
            endIndex: startIndex + slice.length - 1,
            segmentNumber: Math.floor(startIndex / segmentSize) + 1,
            totalSegments,
        });
    }

    return segments;
}

export function formatAppendixSegmentContinuityLabel(
    segment: LearnerMapTargetSegment,
    totalTargets: number
): string {
    if (segment.totalSegments === 1) {
        return `Targets 1–${totalTargets} of ${totalTargets}`;
    }

    return `Segment ${segment.segmentNumber} of ${segment.totalSegments} · Targets ${segment.startIndex + 1}–${segment.endIndex + 1} of ${totalTargets}`;
}

export function appendixSegmentPlaceholderCount(
    targetCount: number,
    segmentSize: number = LEARNER_MAP_APPENDIX_TARGETS_PER_SEGMENT
): number {
    return Math.max(0, segmentSize - targetCount);
}

/** @deprecated Use formatAppendixSegmentContinuityLabel */
export function formatAppendixSegmentRange(
    segment: LearnerMapTargetSegment,
    totalTargets: number
): string {
    return formatAppendixSegmentContinuityLabel(segment, totalTargets);
}
