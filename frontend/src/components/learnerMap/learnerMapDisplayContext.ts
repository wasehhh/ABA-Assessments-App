import { LearnerMapProfile } from '../../services/learnerMapProfile';

export interface LearnerMapDisplayContext {
    learnerName: string;
    assessmentName: string;
    organizationName: string;
    isMockData?: boolean;
}

export function buildMockDisplayContext(
    _profile: LearnerMapProfile,
    scenarioLabel: string
): LearnerMapDisplayContext {
    return {
        learnerName: 'Mock Learner (Dev Preview)',
        assessmentName: `Mock Assessment — ${scenarioLabel}`,
        organizationName: 'Mock Organization (Dev Preview)',
        isMockData: true,
    };
}

export const LEARNER_MAP_CLINICAL_DISCLAIMER =
    'This longitudinal competency record summarizes assessment results across multiple cycles and is intended to support clinical review and supervision. It does not replace clinical judgment, diagnosis, or treatment planning by a qualified clinician.';
