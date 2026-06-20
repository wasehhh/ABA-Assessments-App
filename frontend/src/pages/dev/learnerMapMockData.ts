import { AssessmentScore, ContentPackData, Target } from '../../types';
import {
    buildLearnerMapProfile,
    LearnerMapProfile,
} from '../../services/learnerMapProfile';

export type LearnerMapMockScenarioId = 'small' | 'medium' | 'large';

export interface LearnerMapMockScenario {
    id: LearnerMapMockScenarioId;
    label: string;
    description: string;
    profile: LearnerMapProfile;
}

const MOCK_GENERATED_AT = new Date('2026-05-22T12:00:00.000Z');

const DOMAIN_NAME_SAMPLES = [
    'Cooperation & Reinforcer Effectiveness',
    'Visual Performance',
    'Receptive Language',
    'Motor Imitation',
    'Echoic',
    'Spontaneous Vocal Imitation',
    'Independent Play',
    'Social Play',
    'Group Instruction',
    'Follow Instructions',
    'Listener Responding',
    'Intraverbal',
    'Classroom Routines',
    'Generalized Responding',
    'Reading',
    'Writing',
    'Math',
    'Spelling',
    'Dressing',
    'Grooming',
];

function makeTarget(domainIndex: number, targetIndex: number): Target {
    const useYesNo = (domainIndex + targetIndex) % 7 === 0;

    if (useYesNo) {
        return {
            target_id: `D${domainIndex + 1}T${targetIndex + 1}`,
            title: `Target ${domainIndex + 1}.${targetIndex + 1}`,
            success_criteria: 'Demonstrates skill independently.',
            materials: '',
            scoring: {
                type: 'yesno',
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        };
    }

    return {
        target_id: `D${domainIndex + 1}T${targetIndex + 1}`,
        title: `Target ${domainIndex + 1}.${targetIndex + 1}`,
        success_criteria: 'Demonstrates skill independently.',
        materials: '',
        scoring: {
            type: 'numeric',
            scale: [0, 1, 2, 3, 4],
            scale_labels: {},
            no_opportunity_allowed: false,
        },
    };
}

function buildMockPack(options: {
    packId: string;
    title: string;
    domainCount: number;
    targetsPerDomain: number;
}): ContentPackData {
    const domains = Array.from({ length: options.domainCount }, (_, domainIndex) => ({
        domain_id: `DOM_${domainIndex + 1}`,
        title: DOMAIN_NAME_SAMPLES[domainIndex % DOMAIN_NAME_SAMPLES.length],
        targets: Array.from({ length: options.targetsPerDomain }, (_, targetIndex) =>
            makeTarget(domainIndex, targetIndex)
        ),
    }));

    return {
        pack_id: options.packId,
        org_id: 'org-dev-mock',
        title: options.title,
        description: 'Development-only mock pack for Learner Map visual QA.',
        version: 'dev-mock',
        domains,
    };
}

function makeCycles(count: number) {
    return Array.from({ length: count }, (_, index) => ({
        id: `cycle-${index + 1}`,
        cycle_number: index + 1,
        status: index === 0 ? ('locked' as const) : ('in_progress' as const),
    }));
}

function maxScoreForTarget(target: Target): number {
    if (target.scoring.type === 'yesno') {
        return 1;
    }
    const scale = target.scoring.scale;
    return scale && scale.length > 0 ? Math.max(...scale) : 4;
}

function scoreForCell(
    domainIndex: number,
    targetIndex: number,
    cycleIndex: number,
    maxScore: number
): number | null {
    const hash = (domainIndex * 17 + targetIndex * 31 + cycleIndex * 13) % 100;
    const unscoredThreshold = Math.max(8, 45 - cycleIndex * 12);

    if (hash < unscoredThreshold) {
        return null;
    }

    const base = hash % (maxScore + 1);
    return Math.min(maxScore, base + Math.floor(cycleIndex * 0.75));
}

function makeScore(
    targetId: string,
    domainId: string,
    score: number | null,
    cycleId: string,
    assessmentId: string
): AssessmentScore {
    return {
        id: `score-${cycleId}-${targetId}`,
        assessment_id: assessmentId,
        assessment_cycle_id: cycleId,
        client_id: 'client-dev-mock',
        pack_snapshot_id: 'pack-dev-mock',
        target_id: targetId,
        domain_id: domainId,
        score,
        note: null,
        evidence_files: [],
        assessor_user_id: 'user-dev-mock',
        scored_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

function buildScoresForPack(
    pack: ContentPackData,
    cycles: ReturnType<typeof makeCycles>,
    assessmentId: string
) {
    return cycles.map((cycle, cycleIndex) => {
        const scores: AssessmentScore[] = [];

        pack.domains.forEach((domain, domainIndex) => {
            domain.targets.forEach((target, targetIndex) => {
                const maxScore = maxScoreForTarget(target);
                const score = scoreForCell(domainIndex, targetIndex, cycleIndex, maxScore);

                if (score !== null) {
                    scores.push(
                        makeScore(
                            target.target_id,
                            domain.domain_id,
                            score,
                            cycle.id,
                            assessmentId
                        )
                    );
                }
            });
        });

        return scores;
    });
}

function buildScenarioProfile(options: {
    assessmentId: string;
    pack: ContentPackData;
    cycleCount: number;
}): LearnerMapProfile {
    const cycles = makeCycles(options.cycleCount);
    const scoresByCycle = buildScoresForPack(options.pack, cycles, options.assessmentId);

    return buildLearnerMapProfile({
        assessment: {
            id: options.assessmentId,
            pack_snapshot: options.pack,
        },
        cycles: cycles.map((cycle, index) => ({
            cycle,
            scores: scoresByCycle[index],
        })),
        generatedAt: MOCK_GENERATED_AT,
    });
}

const smallPack = buildMockPack({
    packId: 'pack-dev-small',
    title: 'Dev Mock — Small Assessment',
    domainCount: 2,
    targetsPerDomain: 4,
});

const mediumPack = buildMockPack({
    packId: 'pack-dev-medium',
    title: 'Dev Mock — Medium Assessment',
    domainCount: 6,
    targetsPerDomain: 15,
});

const largePack = buildMockPack({
    packId: 'pack-dev-large',
    title: 'Dev Mock — Large Assessment (ABLLS-scale)',
    domainCount: 12,
    targetsPerDomain: 35,
});

export const LEARNER_MAP_MOCK_SCENARIOS: LearnerMapMockScenario[] = [
    {
        id: 'small',
        label: 'Small',
        description: '2 domains · 4 targets each · 2 cycles',
        profile: buildScenarioProfile({
            assessmentId: 'assess-dev-small',
            pack: smallPack,
            cycleCount: 2,
        }),
    },
    {
        id: 'medium',
        label: 'Medium',
        description: '6 domains · 15 targets each · 3 cycles',
        profile: buildScenarioProfile({
            assessmentId: 'assess-dev-medium',
            pack: mediumPack,
            cycleCount: 3,
        }),
    },
    {
        id: 'large',
        label: 'Large',
        description: '12 domains · 35 targets each · 4 cycles',
        profile: buildScenarioProfile({
            assessmentId: 'assess-dev-large',
            pack: largePack,
            cycleCount: 4,
        }),
    },
];

export function getLearnerMapMockScenario(id: LearnerMapMockScenarioId): LearnerMapMockScenario {
    const scenario = LEARNER_MAP_MOCK_SCENARIOS.find((entry) => entry.id === id);
    if (!scenario) {
        return LEARNER_MAP_MOCK_SCENARIOS[0];
    }
    return scenario;
}
