import { AssessmentScore, ContentPackData, Target } from '../../types';
import { denseTargetScoring } from '../../utils/targetScoringAccess';
import { buildSnapshotCycleDateLabels } from '../../components/assessmentSnapshot/v1/snapshotCycleReference';
import {
    buildLearnerMapProfile,
    LearnerMapProfile,
} from '../../services/learnerMapProfile';

export type AssessmentSnapshotStressScenarioId =
    | 'alpha-small'
    | 'production-acg'
    | 'ablls-like'
    | 'clinic-index-544'
    | 'vb-mapp-like'
    | 'peak-184'
    | 'afls-flat'
    | 'extreme-250';

export interface AssessmentSnapshotStressScenario {
    id: AssessmentSnapshotStressScenarioId;
    label: string;
    description: string;
    profile: LearnerMapProfile;
    cycleDateLabels: Record<string, string>;
}

const MOCK_GENERATED_AT = new Date('2026-06-10T12:00:00.000Z');

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

const MOCK_CYCLE_ANCHOR_DATES = [
    '2026-01-15T00:00:00.000Z',
    '2026-03-20T00:00:00.000Z',
    '2026-06-10T00:00:00.000Z',
    '2026-09-05T00:00:00.000Z',
    '2026-11-18T00:00:00.000Z',
    '2027-01-08T00:00:00.000Z',
];

function makeTarget(domainIndex: number, targetIndex: number, options?: { idPrefix?: string }): Target {
    const prefix = options?.idPrefix ?? `D${domainIndex + 1}T`;
    const useYesNo = (domainIndex + targetIndex) % 9 === 0;
    const useShortScale = (domainIndex + targetIndex) % 11 === 0;
    const useLabeledScale = (domainIndex + targetIndex) % 13 === 0;

    if (useYesNo) {
        return {
            target_id: `${prefix}${targetIndex + 1}`,
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

    if (useShortScale) {
        return {
            target_id: `${prefix}${targetIndex + 1}`,
            title: `Target ${domainIndex + 1}.${targetIndex + 1}`,
            success_criteria: 'Demonstrates skill independently.',
            materials: '',
            scoring: {
                type: 'numeric',
                scale: [0, 1, 2],
                scale_labels: {},
                no_opportunity_allowed: false,
            },
        };
    }

    if (useLabeledScale) {
        return {
            target_id: `${prefix}${targetIndex + 1}`,
            title: `Target ${domainIndex + 1}.${targetIndex + 1}`,
            success_criteria: 'Demonstrates skill independently.',
            materials: '',
            scoring: {
                type: 'numeric',
                scale: [0, 1, 2, 3, 4],
                scale_labels: {
                    '0': 'Not Observed',
                    '1': 'Emerging',
                    '2': 'Partial',
                    '3': 'Independent',
                    '4': 'Generalized',
                },
                no_opportunity_allowed: false,
            },
        };
    }

    return {
        target_id: `${prefix}${targetIndex + 1}`,
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

function makeCycles(count: number) {
    return Array.from({ length: count }, (_, index) => ({
        id: `cycle-${index + 1}`,
        cycle_number: index + 1,
        status: index === 0 ? ('locked' as const) : ('in_progress' as const),
        start_date: MOCK_CYCLE_ANCHOR_DATES[index] ?? null,
        end_date: null,
        created_at: MOCK_CYCLE_ANCHOR_DATES[index] ?? '2026-01-01T00:00:00.000Z',
    }));
}

function maxScoreForTarget(target: Target): number {
    const scoring = denseTargetScoring(target);
    if (scoring.type === 'yesno') {
        return 1;
    }
    const scale = scoring.scale;
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

function slugifyDomainId(domainName: string): string {
    return domainName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

function buildVbMappLevel(
    levelId: string,
    levelTitle: string,
    domainNames: string[]
): ContentPackData['domains'][number] {
    const levelNumber = Number(levelId.replace(/\D/g, '')) || 1;
    const secondary_groups = domainNames.map((name) => ({
        secondary_group_id: `sg_${levelId.toLowerCase()}_${slugifyDomainId(name)}`,
        title: name,
    }));

    const targets = domainNames.flatMap((name, domainIndex) => {
        const groupId = secondary_groups[domainIndex].secondary_group_id;
        const milestoneCount = 3 + ((levelNumber + domainIndex) % 3);

        return Array.from({ length: milestoneCount }, (_, milestoneIndex) => ({
            ...makeTarget(levelNumber - 1, domainIndex * 10 + milestoneIndex, {
                idPrefix: `${levelId}_`,
            }),
            target_id: `${levelId}_${slugifyDomainId(name).toUpperCase()}_${milestoneIndex + 1}`,
            title: `${name} milestone ${milestoneIndex + 1}`,
            secondary_group_id: groupId,
        }));
    });

    return {
        domain_id: levelId,
        title: levelTitle,
        secondary_groups,
        targets,
    };
}

function buildScenarioProfile(options: {
    assessmentId: string;
    pack: ContentPackData;
    cycleCount: number;
}): { profile: LearnerMapProfile; cycleDateLabels: Record<string, string> } {
    const cycles = makeCycles(options.cycleCount);
    const scoresByCycle = buildScoresForPack(options.pack, cycles, options.assessmentId);
    const cycleDateLabels = buildSnapshotCycleDateLabels(cycles);

    return {
        profile: buildLearnerMapProfile({
            assessment: {
                id: options.assessmentId,
                pack_snapshot: options.pack,
            },
            cycles: cycles.map((cycle, index) => ({
                cycle,
                scores: scoresByCycle[index],
            })),
            generatedAt: MOCK_GENERATED_AT,
        }),
        cycleDateLabels,
    };
}

function buildFlatPack(options: {
    packId: string;
    title: string;
    targetCount: number;
    idPrefix?: string;
}): ContentPackData {
    return {
        pack_id: options.packId,
        org_id: 'org-dev-stress',
        title: options.title,
        description: 'Development-only stress fixture for Assessment Snapshot print QA.',
        version: 'dev-stress',
        domains: [
            {
                domain_id: 'DOM_FLAT',
                title: options.title,
                targets: Array.from({ length: options.targetCount }, (_, index) =>
                    makeTarget(0, index, { idPrefix: options.idPrefix ?? 'T' })
                ),
            },
        ],
    };
}

const alphaSmallPack: ContentPackData = {
    pack_id: 'pack-alpha-small',
    org_id: 'org-dev-stress',
    title: 'Small Alpha',
    description: 'Stress fixture — small alpha assessment.',
    version: 'dev-stress',
    domains: Array.from({ length: 3 }, (_, domainIndex) => ({
        domain_id: `DOM_ALPHA_${domainIndex + 1}`,
        title: DOMAIN_NAME_SAMPLES[domainIndex],
        targets: Array.from({ length: 10 }, (_, targetIndex) =>
            makeTarget(domainIndex, targetIndex)
        ),
    })),
};

/** Production-shaped A-C, G case for PR13.6B capacity-informed factoring QA. */
const productionAcgPack: ContentPackData = {
    pack_id: 'pack-production-acg',
    org_id: 'org-dev-stress',
    title: 'Production A-C, G',
    description: 'Stress fixture — A19 / B27 / C57 / G47 for capacity-informed print factoring.',
    version: 'dev-stress',
    domains: [
        { id: 'A', title: 'Domain A', count: 19 },
        { id: 'B', title: 'Domain B', count: 27 },
        { id: 'C', title: 'Domain C', count: 57 },
        { id: 'G', title: 'Domain G', count: 47 },
    ].map((domain, domainIndex) => ({
        domain_id: `DOM_${domain.id}`,
        title: domain.title,
        targets: Array.from({ length: domain.count }, (_, targetIndex) =>
            makeTarget(domainIndex, targetIndex, { idPrefix: `${domain.id}` })
        ),
    })),
};

const abllsLikePack: ContentPackData = {
    pack_id: 'pack-ablls-like',
    org_id: 'org-dev-stress',
    title: 'ABLLS-like',
    description: 'Stress fixture — many domains with dense targets.',
    version: 'dev-stress',
    domains: Array.from({ length: 15 }, (_, domainIndex) => ({
        domain_id: `DOM_ABLLS_${domainIndex + 1}`,
        title: DOMAIN_NAME_SAMPLES[domainIndex % DOMAIN_NAME_SAMPLES.length],
        targets: Array.from({ length: 40 }, (_, targetIndex) =>
            makeTarget(domainIndex, targetIndex)
        ),
    })),
};

const ABLLS_LIKE_CLINICAL_LABELS = [
    'Looks at a person who is talking to him for 3 seconds',
    'Takes a reinforcer when offered without prompting from an adult',
    'Responds to his own name when called from a short distance',
    'Imitates a motor action with an object after a model is presented',
    'Follows a one-step instruction involving a familiar object in the room',
    'Requests a preferred item using a single word or approximation',
    'Matches identical objects in a field of three with no prompts',
    'Waits appropriately for a turn during a structured group activity',
    'Identifies a common object by pointing when the name is spoken',
    'Completes a simple inset puzzle of at least four pieces independently',
    'Maintains engagement in a preferred solitary play activity for two minutes',
    'Gives an object to a peer or adult when asked during a structured task',
];

/**
 * Clinic-shaped scale fixture for Target Index pagination QA (PR14A-4).
 * ~544 targets · ~25 primary groups · secondary grouping on ~1/3 · 4 cycles ·
 * ids seeded so compaction, disambiguation, and non-authored fallback all fire.
 * Titles are sentence-length ABLLS-R–like labels so wrap-aware row costing is exercised.
 * Additive — does not replace ablls-like.
 */
function buildClinicIndex544Pack(): ContentPackData {
    const PRIMARY_COUNT = 25;
    const TOTAL_TARGETS = 544;
    const basePerDomain = Math.floor(TOTAL_TARGETS / PRIMARY_COUNT);
    const remainder = TOTAL_TARGETS % PRIMARY_COUNT;

    let globalIndex = 0;
    const domains = Array.from({ length: PRIMARY_COUNT }, (_, domainIndex) => {
        const count = basePerDomain + (domainIndex < remainder ? 1 : 0);
        const useSecondary = domainIndex % 3 === 0;
        const domainId = `DOM_CLINIC_${String(domainIndex + 1).padStart(2, '0')}`;
        const domainTitle =
            DOMAIN_NAME_SAMPLES[domainIndex % DOMAIN_NAME_SAMPLES.length] ??
            `Clinic Domain ${domainIndex + 1}`;

        const secondary_groups = useSecondary
            ? [
                  {
                      secondary_group_id: `${domainId}_SG_A`,
                      title: 'Skill Area A',
                  },
                  {
                      secondary_group_id: `${domainId}_SG_B`,
                      title: 'Skill Area B',
                  },
              ]
            : undefined;

        const targets: Target[] = Array.from({ length: count }, (_, targetIndex) => {
            const g = globalIndex;
            globalIndex += 1;
            const seed = g % 11;
            const clinicalLabel =
                ABLLS_LIKE_CLINICAL_LABELS[g % ABLLS_LIKE_CLINICAL_LABELS.length]!;
            let target_id: string;
            let title: string;

            if (seed === 0) {
                // Non-authored fallback — UUID + title-derived clinical code.
                const letter = String.fromCharCode(65 + (g % 26));
                const num = (g % 90) + 1;
                target_id = `00000000-0000-4000-a000-${String(g).padStart(12, '0')}`;
                title = `${clinicalLabel} (${letter}${num})`;
            } else if (seed === 1 || seed === 2) {
                // Disambiguation — short colliding codes via DOM strip vs raw id.
                const code = `C${domainIndex + 1}X${Math.floor(targetIndex / 2)}`;
                target_id = seed === 1 ? `DOM_${domainIndex + 1}_${code}` : code;
                title = clinicalLabel;
            } else {
                // Compaction — long structured authored id.
                target_id = `L${(domainIndex % 3) + 1}_CLINIC_SKILL_AREA_${g + 1}`;
                title = clinicalLabel;
            }

            const target: Target = {
                target_id,
                title,
                success_criteria: 'Demonstrates skill independently.',
                materials: '',
                scoring: {
                    type: 'numeric',
                    scale: [0, 1, 2, 3, 4],
                    scale_labels: {},
                    no_opportunity_allowed: true,
                },
            };

            if (useSecondary && secondary_groups) {
                target.secondary_group_id =
                    targetIndex < Math.ceil(count / 2)
                        ? secondary_groups[0]!.secondary_group_id
                        : secondary_groups[1]!.secondary_group_id;
            }

            return target;
        });

        return {
            domain_id: domainId,
            title: domainTitle,
            ...(secondary_groups ? { secondary_groups } : {}),
            targets,
        };
    });

    return {
        pack_id: 'pack-clinic-index-544',
        org_id: 'org-dev-stress',
        title: 'Clinic Index 544',
        description:
            'Clinic-shaped scale fixture — long labels; triggers Target Index; pagination QA.',
        version: 'dev-stress',
        structure_labels: {
            primary_group: 'Domain',
            secondary_group: 'Skill Area',
            target: 'Target',
        },
        domains,
    };
}

const clinicIndex544Pack = buildClinicIndex544Pack();

const vbMappLikePack: ContentPackData = {
    pack_id: 'pack-vb-mapp-like',
    org_id: 'org-dev-stress',
    title: 'VB-MAPP-like',
    description: 'Stress fixture — Level → Domain → Milestone hierarchy.',
    version: 'dev-stress',
    structure_labels: {
        primary_group: 'Level',
        secondary_group: 'Domain',
        target: 'Milestone',
    },
    domains: [
        buildVbMappLevel('L1', 'Level 1', [
            'Mand',
            'Tact',
            'Listener Responding',
            'Visual Performance',
            'Play',
            'Social',
        ]),
        buildVbMappLevel('L2', 'Level 2', [
            'Mand',
            'Tact',
            'Listener Responding',
            'Visual Performance',
            'Social',
            'Intraverbal',
        ]),
        buildVbMappLevel('L3', 'Level 3', [
            'Mand',
            'Tact',
            'Listener Responding',
            'Intraverbal',
            'Reading',
            'Writing',
            'Math',
        ]),
    ],
};

const peak184Pack = buildFlatPack({
    packId: 'pack-peak-184',
    title: 'PEAK DT Module',
    targetCount: 184,
    idPrefix: 'P',
});

const aflsFlatPack = buildFlatPack({
    packId: 'pack-afls-flat',
    title: 'AFLS Flat Skills',
    targetCount: 205,
    idPrefix: 'AFLS_',
});

const extreme250Pack = buildFlatPack({
    packId: 'pack-extreme-250',
    title: 'Extreme Custom Flat',
    targetCount: 250,
    idPrefix: 'X',
});

export const ASSESSMENT_SNAPSHOT_STRESS_SCENARIOS: AssessmentSnapshotStressScenario[] = [
    {
        id: 'alpha-small',
        label: 'Alpha Small',
        description: '3 domains · 10 targets each · 2 cycles',
        ...buildScenarioProfile({
            assessmentId: 'assess-alpha-small',
            pack: alphaSmallPack,
            cycleCount: 2,
        }),
    },
    {
        id: 'production-acg',
        label: 'Production A-C, G',
        description: 'A19 · B27 · C57 · G47 · 2 cycles (capacity-informed factoring)',
        ...buildScenarioProfile({
            assessmentId: 'assess-production-acg',
            pack: productionAcgPack,
            cycleCount: 2,
        }),
    },
    {
        id: 'ablls-like',
        label: 'ABLLS-like',
        description: '15 domains · 40 targets each · 4 cycles',
        ...buildScenarioProfile({
            assessmentId: 'assess-ablls-like',
            pack: abllsLikePack,
            cycleCount: 4,
        }),
    },
    {
        id: 'clinic-index-544',
        label: 'Clinic Index 544',
        description:
            '25 domains · 544 targets · ~1/3 secondary · 4 cycles · index-triggering ids',
        ...buildScenarioProfile({
            assessmentId: 'assess-clinic-index-544',
            pack: clinicIndex544Pack,
            cycleCount: 4,
        }),
    },
    {
        id: 'vb-mapp-like',
        label: 'VB-MAPP-like',
        description: '3 levels · 6–7 domains each · 3 cycles',
        ...buildScenarioProfile({
            assessmentId: 'assess-vb-mapp-like',
            pack: vbMappLikePack,
            cycleCount: 3,
        }),
    },
    {
        id: 'peak-184',
        label: 'PEAK 184',
        description: '1 group · 184 targets · 3 cycles',
        ...buildScenarioProfile({
            assessmentId: 'assess-peak-184',
            pack: peak184Pack,
            cycleCount: 3,
        }),
    },
    {
        id: 'afls-flat',
        label: 'AFLS Flat',
        description: '1 group · 205 targets · 2 cycles',
        ...buildScenarioProfile({
            assessmentId: 'assess-afls-flat',
            pack: aflsFlatPack,
            cycleCount: 2,
        }),
    },
    {
        id: 'extreme-250',
        label: 'Extreme 250',
        description: '1 group · 250 targets · 6 cycles',
        ...buildScenarioProfile({
            assessmentId: 'assess-extreme-250',
            pack: extreme250Pack,
            cycleCount: 6,
        }),
    },
];

export function getAssessmentSnapshotStressScenario(
    id: AssessmentSnapshotStressScenarioId
): AssessmentSnapshotStressScenario {
    const scenario = ASSESSMENT_SNAPSHOT_STRESS_SCENARIOS.find((entry) => entry.id === id);
    if (!scenario) {
        return ASSESSMENT_SNAPSHOT_STRESS_SCENARIOS[0];
    }
    return scenario;
}
