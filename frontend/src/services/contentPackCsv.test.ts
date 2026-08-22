import { describe, expect, it } from 'vitest';
import { parseContentPackCsv } from '../services/contentPackCsv';
import {
    effectiveScoringEquals,
    isCanonicalScoringPack,
    resolveEffectiveScoring,
} from '../utils/effectiveScoring';
import {
    UNIFORM_WITH_OVERRIDES_UPLOAD_WARNING,
    migrateLegacyPackToCanonical,
    prepareContentPackForUpload,
} from '../utils/assessmentPackCanonical';
import { ContentPackData, Domain, Target } from '../types';

const LEGACY_CSV = [
    'domain_id,domain_title,domain_description,target_id,title,description,success_criteria,materials,instructions,examples,notes',
    'A,"Cooperation, Reinforcer",Domain context,A1,Gross motor imitation,Skill description,Independent for 8/10 trials,"Mirror, mat",Observe learner,Eg: clap,Starter',
    'A,,,A2,Attends reinforcer,Orients toward preferred stimuli,Orient within 3s for 80% probes,"Toys, reinforcers",Paired stimulus,,',
].join('\n');

function overrideCount(pack: ContentPackData): number {
    return pack.domains.reduce(
        (sum, domain) =>
            sum + domain.targets.filter((target) => target.scoring !== undefined).length,
        0
    );
}

function makeTarget(
    targetId: string,
    scoring?: Target['scoring']
): Target {
    return {
        target_id: targetId,
        title: targetId,
        success_criteria: '',
        materials: '',
        ...(scoring ? { scoring } : {}),
    };
}

function makePack(
    domains: Domain[],
    extras: Partial<ContentPackData> = {}
): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Upload Fixture',
        description: '',
        version: '1.0',
        domains,
        ...extras,
    };
}

function assertEffectiveEquality(before: ContentPackData, after: ContentPackData) {
    const beforeTargets = before.domains.flatMap((domain) => domain.targets);
    const afterTargets = after.domains.flatMap((domain) => domain.targets);
    expect(afterTargets.length).toBe(beforeTargets.length);
    beforeTargets.forEach((target, index) => {
        expect(
            effectiveScoringEquals(
                resolveEffectiveScoring(target, before),
                resolveEffectiveScoring(afterTargets[index], after)
            )
        ).toBe(true);
    });
}

describe('contentPackCsv canonical upload form', () => {
    it('imports all-identical scale rows as Uniform with zero overrides (OQ-B3-9)', () => {
        const pack = parseContentPackCsv(LEGACY_CSV, 'Legacy Pack', 'Legacy');

        expect(isCanonicalScoringPack(pack)).toBe(true);
        expect(pack.scoring_mode).toBe('uniform');
        expect(pack.default_scoring?.scale).toEqual([0, 1, 2, 3, 4]);
        expect(overrideCount(pack)).toBe(0);
        pack.domains[0].targets.forEach((target) => {
            expect(target).not.toHaveProperty('scoring');
        });
        expect(pack.structure_labels).toBeUndefined();
    });

    it('imports mixed numeric scales as Custom with overrides only on exceptions', () => {
        const csv = [
            'domain_id,domain_title,target_id,title,success_criteria,scoring_type,scale',
            'A,Domain A,A1,Target A1,Criteria,numeric,"0,1,2,3,4"',
            'A,,A2,Target A2,Criteria,numeric,"0,1,2"',
            'C,Domain C,C1,Target C1,Criteria,numeric,"0,1,2,3,4"',
        ].join('\n');

        const pack = parseContentPackCsv(csv, 'Mixed Pack', '');

        expect(isCanonicalScoringPack(pack)).toBe(true);
        expect(pack.scoring_mode).toBe('custom');
        expect(pack.default_scoring?.scale).toEqual([0, 1, 2, 3, 4]);
        expect(pack.domains[0].targets[0].scoring).toBeUndefined();
        expect(pack.domains[0].targets[1].scoring?.scale).toEqual([0, 1, 2]);
        expect(pack.domains[1].targets[0].scoring).toBeUndefined();
        expect(overrideCount(pack)).toBe(1);
    });

    it('imports optional secondary group columns', () => {
        const csv = [
            'domain_id,domain_title,target_id,title,success_criteria,secondary_group_id,secondary_group_title',
            'A,Level 1,T1,Target 1,Criteria,sg_listen,Listening',
            'A,,T2,Target 2,Criteria,sg_listen,',
            'A,,T3,Target 3,Criteria,sg_motor,Motor',
        ].join('\n');

        const pack = parseContentPackCsv(csv, 'Grouped Pack', '');

        expect(pack.structure_labels?.secondary_group).toBe('Secondary Group');
        expect(pack.domains[0].secondary_groups?.map((entry) => entry.secondary_group_id)).toEqual([
            'sg_listen',
            'sg_motor',
        ]);
        expect(pack.domains[0].targets[0].secondary_group_id).toBe('sg_listen');
        expect(pack.domains[0].targets[2].secondary_group_id).toBe('sg_motor');
        expect(pack.scoring_mode).toBe('uniform');
    });

    it('imports optional scoring columns with scale labels onto pack default when Uniform', () => {
        const csv = [
            'domain_id,domain_title,target_id,title,success_criteria,scoring_type,scale,scale_labels',
            'A,Domain,T1,Target 1,Criteria,numeric,"0,1,2","0:Not Yet|1:Emerging|2:Mastered"',
        ].join('\n');

        const pack = parseContentPackCsv(csv, 'Labeled Pack', '');

        expect(pack.scoring_mode).toBe('uniform');
        expect(pack.default_scoring?.scale).toEqual([0, 1, 2]);
        expect(pack.default_scoring?.scale_labels).toEqual({
            0: 'Not Yet',
            1: 'Emerging',
            2: 'Mastered',
        });
        expect(pack.domains[0].targets[0].scoring).toBeUndefined();
    });

    it('imports decimal scales without dropping values', () => {
        const csv = [
            'domain_id,domain_title,target_id,title,success_criteria,scoring_type,scale,scale_labels',
            'A,Domain,T1,Target 1,Criteria,numeric,"0,0.5,1","0:None|0.5:Partial|1:Full"',
        ].join('\n');

        const pack = parseContentPackCsv(csv, 'Decimal Pack', '');
        expect(pack.scoring_mode).toBe('uniform');
        expect(pack.default_scoring?.scale).toEqual([0, 0.5, 1]);
    });

    it('rejects malformed scale tokens instead of silently dropping them', () => {
        const badToken = [
            'domain_id,domain_title,target_id,title,success_criteria,scoring_type,scale',
            'A,Domain,T1,Target 1,Criteria,numeric,"0,a,1"',
        ].join('\n');
        expect(() => parseContentPackCsv(badToken, 'Bad Pack', '')).toThrow(
            /"a" is not a valid numeric score/
        );

        const emptyEntry = [
            'domain_id,domain_title,target_id,title,success_criteria,scoring_type,scale',
            'A,Domain,T1,Target 1,Criteria,numeric,"0,,1"',
        ].join('\n');
        expect(() => parseContentPackCsv(emptyEntry, 'Bad Pack', '')).toThrow(/empty values/i);
    });

    it('preserves Effective Scoring vs pre-migration dense parse for identical-scale CSV', () => {
        const csv = [
            'domain_id,domain_title,target_id,title,success_criteria,scoring_type,scale,scale_labels',
            'A,Domain,T1,Target 1,Criteria,numeric,"0,1,2","0:Not Yet|1:Emerging|2:Mastered"',
            'A,,T2,Target 2,Criteria,numeric,"0,1,2","0:Not Yet|1:Emerging|2:Mastered"',
        ].join('\n');

        // Reconstruct the dense pre-migrate shape the parser used to emit.
        const dense: ContentPackData = {
            pack_id: 'dense',
            org_id: '',
            title: 'Labeled Pack',
            description: '',
            version: '1.0',
            domains: [
                {
                    domain_id: 'A',
                    title: 'Domain',
                    targets: [
                        makeTarget('T1', {
                            type: 'numeric',
                            scale: [0, 1, 2],
                            scale_labels: {
                                0: 'Not Yet',
                                1: 'Emerging',
                                2: 'Mastered',
                            },
                            no_opportunity_allowed: true,
                        }),
                        makeTarget('T2', {
                            type: 'numeric',
                            scale: [0, 1, 2],
                            scale_labels: {
                                0: 'Not Yet',
                                1: 'Emerging',
                                2: 'Mastered',
                            },
                            no_opportunity_allowed: true,
                        }),
                    ],
                },
            ],
        };

        const pack = parseContentPackCsv(csv, 'Labeled Pack', '');
        assertEffectiveEquality(dense, pack);
    });
});

describe('prepareContentPackForUpload (JSON / shared upload path)', () => {
    it('migrates a legacy dense JSON pack before upload', () => {
        const dense = makePack([
            {
                domain_id: 'A',
                title: 'A',
                targets: [
                    makeTarget('A1', {
                        type: 'numeric',
                        scale: [0, 1, 2, 3, 4],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    }),
                    makeTarget('A2', {
                        type: 'numeric',
                        scale: [0, 1, 2, 3, 4],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    }),
                ],
            },
        ]);

        const { pack, warnings } = prepareContentPackForUpload(dense);

        expect(isCanonicalScoringPack(pack)).toBe(true);
        expect(pack.scoring_mode).toBe('uniform');
        expect(overrideCount(pack)).toBe(0);
        expect(warnings).toEqual([]);
        assertEffectiveEquality(dense, pack);
    });

    it('renormalizes an already-canonical pack without changing Effective Scoring (OQ-B3-7)', () => {
        const canonical = makePack(
            [
                {
                    domain_id: 'A',
                    title: 'A',
                    targets: [
                        makeTarget('A1'),
                        makeTarget('A2', {
                            type: 'numeric',
                            scale: [0, 1, 2, 3, 4],
                            scale_labels: {},
                            no_opportunity_allowed: false,
                        }),
                        makeTarget('A3', {
                            type: 'numeric',
                            scale: [0, 1],
                            scale_labels: {},
                            no_opportunity_allowed: false,
                        }),
                    ],
                },
            ],
            {
                scoring_mode: 'custom',
                default_scoring: {
                    type: 'numeric',
                    scale: [0, 1, 2, 3, 4],
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
            }
        );

        const afterMigrateOnly = migrateLegacyPackToCanonical(canonical);
        expect(afterMigrateOnly.domains[0].targets[1].scoring).toBeUndefined();

        const { pack, warnings } = prepareContentPackForUpload(canonical);
        expect(warnings).toEqual([]);
        expect(pack.scoring_mode).toBe('custom');
        expect(pack.domains[0].targets[1].scoring).toBeUndefined();
        expect(pack.domains[0].targets[2].scoring?.scale).toEqual([0, 1]);
        assertEffectiveEquality(canonical, pack);
    });

    it('coerces Uniform+overrides JSON to Custom with warning and keeps overrides (OQ-B3-8)', () => {
        const corrupt = makePack(
            [
                {
                    domain_id: 'A',
                    title: 'A',
                    targets: [
                        makeTarget('A1'),
                        makeTarget('A2', {
                            type: 'numeric',
                            scale: [0, 1],
                            scale_labels: { 0: 'Keep' },
                            no_opportunity_allowed: false,
                        }),
                    ],
                },
            ],
            {
                scoring_mode: 'uniform',
                default_scoring: {
                    type: 'numeric',
                    scale: [0, 1, 2, 3, 4],
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
            }
        );

        const { pack, warnings } = prepareContentPackForUpload(corrupt);

        expect(pack.scoring_mode).toBe('custom');
        expect(pack.domains[0].targets[1].scoring?.scale).toEqual([0, 1]);
        expect(warnings).toEqual([UNIFORM_WITH_OVERRIDES_UPLOAD_WARNING]);
        // Upload must succeed with a prepared pack (not throw / reject).
        expect(isCanonicalScoringPack(pack)).toBe(true);
        expect(resolveEffectiveScoring(pack.domains[0].targets[1], pack).allowedValues).toEqual([
            0, 1,
        ]);
    });
});
