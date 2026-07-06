import { LearnerMapCycleSummary, LearnerMapDomain, LearnerMapProfile } from './learnerMapProfile';
import { StructureLabels } from '../types';

/**
 * Evidence-only view of normalized assessment data for Assessment Snapshot.
 * Wraps LearnerMapProfile without duplicating normalization or scoring logic.
 */
export interface AssessmentSnapshotProfile {
    metadata: LearnerMapProfile['metadata'];
    structureLabels: StructureLabels;
    cycles: LearnerMapCycleSummary[];
    domains: LearnerMapDomain[];
}

export function buildAssessmentSnapshotProfile(
    learnerMapProfile: LearnerMapProfile
): AssessmentSnapshotProfile {
    return {
        metadata: learnerMapProfile.metadata,
        structureLabels: learnerMapProfile.structureLabels,
        cycles: learnerMapProfile.cycles,
        domains: learnerMapProfile.domains,
    };
}
