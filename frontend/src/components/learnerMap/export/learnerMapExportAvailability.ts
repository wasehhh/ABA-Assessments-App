import { LearnerMapProfile } from '../../../services/learnerMapProfile';

export interface LearnerMapExportAvailability {
    available: boolean;
    reason?: string;
}

export function getLearnerMapExportAvailability(
    profile: LearnerMapProfile | null,
    cycleCount: number
): LearnerMapExportAvailability {
    if (cycleCount < 2) {
        return {
            available: false,
            reason: 'Learner Map export is available after a second assessment cycle.',
        };
    }

    if (!profile) {
        return {
            available: false,
            reason: 'Unable to build Learner Map for this assessment.',
        };
    }

    if (profile.totals.scoredCells === 0) {
        return {
            available: false,
            reason: 'Score at least one target before exporting a Learner Map.',
        };
    }

    return { available: true };
}
