import { LearnerMapProfile } from '../../../services/learnerMapProfile';

export interface LearnerMapExportAvailability {
    available: boolean;
    reason?: string;
    guidance?: string;
}

export function getLearnerMapExportAvailability(
    profile: LearnerMapProfile | null,
    cycleCount: number
): LearnerMapExportAvailability {
    if (cycleCount < 2) {
        return {
            available: false,
            reason:
                'Learner Map export becomes available after a second assessment cycle has been completed.',
            guidance: 'Complete a second cycle, then return here to export.',
        };
    }

    if (!profile) {
        return {
            available: false,
            reason: 'Unable to prepare a Learner Map export for this assessment.',
            guidance: 'Review the assessment data and try again from the Learner Map.',
        };
    }

    if (profile.totals.scoredCells === 0) {
        return {
            available: false,
            reason: 'Score at least one target before Learner Map export becomes available.',
            guidance: 'Enter scores in the assessment matrix, then open Learner Map again.',
        };
    }

    return { available: true };
}
