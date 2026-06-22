import { describe, expect, it } from 'vitest';
import { LearnerMapDomain } from '../../../services/learnerMapProfile';
import {
    estimateAppendixSize,
    formatAppendixSizeEstimateLabel,
    isAllDomainsSelected,
    isLargeAppendixExport,
    LEARNER_MAP_LARGE_APPENDIX_SEGMENT_THRESHOLD,
} from './learnerMapExportEstimate';

function makeDomain(domainId: string, targetCount: number): LearnerMapDomain {
    return {
        domainId,
        title: domainId,
        targets: Array.from({ length: targetCount }, (_, index) => ({
            targetId: `${domainId}_T${index + 1}`,
            title: `Target ${index + 1}`,
            cells: [],
        })),
    };
}

describe('learnerMapExportEstimate', () => {
    const domains = [makeDomain('DOM_1', 20), makeDomain('DOM_2', 10), makeDomain('DOM_3', 5)];

    it('returns null estimate for standard mode', () => {
        expect(estimateAppendixSize(domains, 'standard')).toBeNull();
        expect(formatAppendixSizeEstimateLabel('standard', null)).toBe(
            'No target-level appendix.'
        );
    });

    it('estimates selected-domains appendix size', () => {
        const estimate = estimateAppendixSize(domains, 'selected-domains', ['DOM_1', 'DOM_3']);

        expect(estimate).toEqual({
            domainCount: 2,
            targetCount: 25,
            segmentCount: 3,
        });
        expect(formatAppendixSizeEstimateLabel('selected-domains', estimate)).toBe(
            'Selected appendix: 2 domains · 25 targets · 3 segments'
        );
    });

    it('returns zero counts and a safe label when selected-domains has no selection', () => {
        const estimate = estimateAppendixSize(domains, 'selected-domains', []);

        expect(estimate).toEqual({
            domainCount: 0,
            targetCount: 0,
            segmentCount: 0,
        });
        expect(formatAppendixSizeEstimateLabel('selected-domains', estimate)).toBe(
            'Select domains to estimate appendix size.'
        );
    });

    it('estimates full appendix size across all domains', () => {
        const estimate = estimateAppendixSize(domains, 'full');

        expect(estimate).toEqual({
            domainCount: 3,
            targetCount: 35,
            segmentCount: 4,
        });
        expect(formatAppendixSizeEstimateLabel('full', estimate)).toBe(
            'Full appendix: 3 domains · 35 targets · 4 segments'
        );
    });

    it('detects all domains selected', () => {
        expect(isAllDomainsSelected(['DOM_1', 'DOM_2', 'DOM_3'], 3)).toBe(true);
        expect(isAllDomainsSelected(['DOM_1'], 3)).toBe(false);
    });

    it('flags large appendix exports at segment threshold', () => {
        expect(isLargeAppendixExport(LEARNER_MAP_LARGE_APPENDIX_SEGMENT_THRESHOLD - 1)).toBe(
            false
        );
        expect(isLargeAppendixExport(LEARNER_MAP_LARGE_APPENDIX_SEGMENT_THRESHOLD)).toBe(true);
    });
});
