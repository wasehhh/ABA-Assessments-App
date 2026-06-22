import { describe, expect, it } from 'vitest';
import { CompetencyState } from '../../../utils/scoreInterpretation';
import {
    competencyLegendSwatchClass,
    competencySequenceCellClass,
    STATE_BUCKET_DISPLAY,
} from './stateDisplay';

const CANONICAL_SEGMENT_CLASS: Record<CompetencyState, string> = {
    unscored: 'bg-gray-300',
    not_yet: 'bg-orange-500',
    in_progress: 'bg-yellow-400',
    at_maximum: 'bg-green-600',
};

describe('stateDisplay competency color helpers', () => {
    it('STATE_BUCKET_DISPLAY uses canonical segmentClass tokens', () => {
        for (const bucket of STATE_BUCKET_DISPLAY) {
            expect(bucket.segmentClass).toBe(CANONICAL_SEGMENT_CLASS[bucket.key]);
        }
    });

    it.each(Object.entries(CANONICAL_SEGMENT_CLASS) as [CompetencyState, string][])(
        'competencyLegendSwatchClass(%s) includes %s',
        (state, segmentClass) => {
            expect(competencyLegendSwatchClass(state)).toContain(segmentClass);
        }
    );

    it.each(Object.entries(CANONICAL_SEGMENT_CLASS) as [CompetencyState, string][])(
        'competencySequenceCellClass(%s) includes %s',
        (state, segmentClass) => {
            expect(competencySequenceCellClass(state)).toContain(segmentClass);
        }
    );
});
