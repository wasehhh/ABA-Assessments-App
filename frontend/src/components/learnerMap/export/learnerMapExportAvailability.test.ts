import { describe, expect, it } from 'vitest';
import { LearnerMapProfile } from '../../../services/learnerMapProfile';
import { getLearnerMapExportAvailability } from './learnerMapExportAvailability';

function makeProfile(targetsAssessed: number): LearnerMapProfile {
    const totalTargets = Math.max(targetsAssessed, 1);
    const targets = Array.from({ length: totalTargets }, (_, index) => ({
        targetId: `T${index + 1}`,
        title: `Target ${index + 1}`,
        displayTargetMax: '4',
        cells: [
            {
                cycleId: 'c1',
                cycleNumber: 1,
                rawScore: index < targetsAssessed ? 2 : null,
                displayScoreWithMax: index < targetsAssessed ? '2/4' : '—',
                competencyState: index < targetsAssessed ? ('in_progress' as const) : ('unscored' as const),
                normalizedRatio: index < targetsAssessed ? 0.5 : null,
                isUnscored: index >= targetsAssessed,
                movementFromPrevious: 'none' as const,
            },
        ],
    }));

    return {
        metadata: {
            assessmentId: 'assess-1',
            packTitle: 'Pack',
            packVersion: '1.0',
            generatedAt: '2026-01-01T00:00:00.000Z',
        },
        structureLabels: {
            primary_group: 'Domain',
            target: 'Target',
        },
        cycles: [],
        domains: [
            {
                domainId: 'DOM_1',
                title: 'Domain 1',
                targets,
            },
        ],
        totals: {
            totalDomains: 1,
            totalTargets,
            totalCycles: 2,
            totalCells: totalTargets * 2,
            scoredCells: targetsAssessed,
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

    it('requires scored targets', () => {
        expect(getLearnerMapExportAvailability(makeProfile(0), 2)).toEqual({
            available: false,
            reason: 'Score at least one target before Learner Map export becomes available.',
            guidance: 'Enter scores in the assessment matrix, then open Learner Map again.',
        });
    });

    it('blocks export when totals.scoredCells is positive but no targets are assessed', () => {
        const profile: LearnerMapProfile = {
            ...makeProfile(0),
            totals: {
                totalDomains: 1,
                totalTargets: 2,
                totalCycles: 2,
                totalCells: 4,
                scoredCells: 3,
            },
        };

        expect(getLearnerMapExportAvailability(profile, 2)).toEqual({
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
