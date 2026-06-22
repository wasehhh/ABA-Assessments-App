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

export function buildProductionDisplayContext(
    assessment: {
        id: string;
        assessment_date?: string | null;
        pack_snapshot?: { title?: string };
        client?: { first_name?: string | null; last_name?: string | null } | null;
    },
    organizationName: string
): LearnerMapDisplayContext {
    const learnerName = assessment.client
        ? `${assessment.client.first_name ?? ''} ${assessment.client.last_name ?? ''}`.trim() ||
          '—'
        : '—';

    const assessmentName =
        assessment.pack_snapshot?.title?.trim() ||
        (assessment.assessment_date
            ? `Assessment · ${new Date(assessment.assessment_date).toLocaleDateString()}`
            : `Assessment ${assessment.id}`);

    return {
        learnerName,
        assessmentName,
        organizationName: organizationName || '—',
    };
}

export const LEARNER_MAP_CLINICAL_DISCLAIMER =
    'This longitudinal competency record summarizes assessment results across multiple cycles and is intended to support clinical review and supervision. It does not replace clinical judgment, diagnosis, or treatment planning by a qualified clinician.';
