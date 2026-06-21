import { describe, expect, it } from 'vitest';
import {
    appendixSegmentPlaceholderCount,
    LEARNER_MAP_APPENDIX_TARGETS_PER_SEGMENT,
} from './learnerMapAppendixSegmentation';

describe('appendixSegmentPlaceholderCount', () => {
    it('returns zero when segment is full', () => {
        expect(appendixSegmentPlaceholderCount(15)).toBe(0);
    });

    it('returns padding count for short final segments', () => {
        expect(appendixSegmentPlaceholderCount(5, LEARNER_MAP_APPENDIX_TARGETS_PER_SEGMENT)).toBe(
            10
        );
    });

    it('returns zero when target count exceeds segment size', () => {
        expect(appendixSegmentPlaceholderCount(20)).toBe(0);
    });
});
