import { describe, expect, it } from 'vitest';
import { LearnerMapProfile } from '../../../services/learnerMapProfile';
import { getLearnerMapExportAvailability } from './learnerMapExportAvailability';

function makeProfile(scoredCells: number): LearnerMapProfile {
    return {
        metadata: {
            assessmentId: 'assess-1',
            packTitle: 'Pack',
            packVersion: '1.0',
            generatedAt: '2026-01-01T00:00:00.000Z',
        },
        cycles: [],
        domains: [],
        totals: {
            totalDomains: 1,
            totalTargets: 1,
            totalCycles: 2,
            totalCells: 2,
            scoredCells,
        },
    };
}

describe('getLearnerMapExportAvailability', () => {
    it('requires at least two cycles', () => {
        expect(getLearnerMapExportAvailability(makeProfile(1), 1)).toEqual({
            available: false,
            reason: 'Learner Map export is available after a second assessment cycle.',
        });
    });

    it('requires scored data', () => {
        expect(getLearnerMapExportAvailability(makeProfile(0), 2)).toEqual({
            available: false,
            reason: 'Score at least one target before exporting a Learner Map.',
        });
    });

    it('is available when profile and cycles are sufficient', () => {
        expect(getLearnerMapExportAvailability(makeProfile(3), 2)).toEqual({
            available: true,
        });
    });
});
