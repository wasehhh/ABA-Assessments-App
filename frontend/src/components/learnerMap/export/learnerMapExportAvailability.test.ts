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
            reason:
                'Learner Map export becomes available after a second assessment cycle has been completed.',
            guidance: 'Complete a second cycle, then return here to export.',
        });
    });

    it('requires scored data', () => {
        expect(getLearnerMapExportAvailability(makeProfile(0), 2)).toEqual({
            available: false,
            reason: 'Score at least one target before Learner Map export becomes available.',
            guidance: 'Enter scores in the assessment matrix, then open Learner Map again.',
        });
    });

    it('explains when the profile cannot be prepared', () => {
        expect(getLearnerMapExportAvailability(null, 2)).toEqual({
            available: false,
            reason: 'Unable to prepare a Learner Map export for this assessment.',
            guidance: 'Review the assessment data and try again from the Learner Map.',
        });
    });

    it('is available when profile and cycles are sufficient', () => {
        expect(getLearnerMapExportAvailability(makeProfile(3), 2)).toEqual({
            available: true,
        });
    });
});
