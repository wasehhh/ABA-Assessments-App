import { describe, expect, it } from 'vitest';
import { ContentPackData, Domain, PackDefaultScoring, Target } from '../types';
import {
    effectiveScoringEquals,
    isCanonicalScoringPack,
    resolveEffectiveScoring,
} from './effectiveScoring';
import {
    NEW_PACK_DEFAULT_SCORING,
    NEW_PACK_DEFAULT_SCALE_CSV,
    clearAllTargetScoringOverrides,
    clonePackData,
    domainsHaveScoringOverrides,
    migrateLegacyPackToCanonical,
    normalizeCanonicalPackForSave,
    seedBuilderWorkingPack,
} from './assessmentPackCanonical';

function makeTarget(
    targetId: string,
    scoring?: Target['scoring'],
    extras: Partial<Target> = {}
): Target {
    return {
        target_id: targetId,
        title: extras.title ?? targetId,
        success_criteria: extras.success_criteria ?? '',
        materials: extras.materials ?? '',
        ...extras,
        ...(scoring ? { scoring } : {}),
    };
}

function numericScoring(
    scale: number[],
    scaleLabels: Record<number, string> = {},
    extras: Partial<NonNullable<Target['scoring']>> = {}
): NonNullable<Target['scoring']> {
    return {
        type: 'numeric',
        scale,
        scale_labels: scaleLabels,
        no_opportunity_allowed: false,
        ...extras,
    };
}

function makePack(
    domains: Domain[],
    extras: Partial<ContentPackData> = {}
): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Fixture Pack',
        description: 'Clinical content must survive',
        version: '1.0',
        domains,
        ...extras,
    };
}

function domainA(targets: Target[], extras: Partial<Domain> = {}): Domain {
    return {
        domain_id: extras.domain_id ?? 'A',
        title: extras.title ?? 'Domain A',
        targets,
        ...extras,
    };
}

function assertEffectiveEquality(before: ContentPackData, after: ContentPackData) {
    const beforeTargets = before.domains.flatMap((domain, domainIndex) =>
        domain.targets.map((target, targetIndex) => ({
            domainIndex,
            targetIndex,
            target,
        }))
    );
    const afterTargets = after.domains.flatMap((domain, domainIndex) =>
        domain.targets.map((target, targetIndex) => ({
            domainIndex,
            targetIndex,
            target,
        }))
    );
    expect(afterTargets.length).toBe(beforeTargets.length);
    beforeTargets.forEach((entry, index) => {
        expect(
            effectiveScoringEquals(
                resolveEffectiveScoring(entry.target, before),
                resolveEffectiveScoring(afterTargets[index].target, after)
            )
        ).toBe(true);
    });
}

function overrideCount(pack: ContentPackData): number {
    return pack.domains.reduce(
        (sum, domain) =>
            sum + domain.targets.filter((target) => target.scoring !== undefined).length,
        0
    );
}

describe('seedBuilderWorkingPack', () => {
    it('seeds a new pack as uniform with 0,1,2,3,4 and empty labels', () => {
        const seed = seedBuilderWorkingPack();
        expect(seed.scoring_mode).toBe('uniform');
        expect(seed.default_scoring).toEqual(NEW_PACK_DEFAULT_SCORING);
        expect(seed.domains).toEqual([]);
        expect(NEW_PACK_DEFAULT_SCALE_CSV).toBe('0,1,2,3,4');
    });

    it('does not mutate the opened pack (Cancel leaves DB baseline intact)', () => {
        const original = makePack([
            domainA([makeTarget('A1', numericScoring([0, 1, 2, 3, 4]))]),
        ]);
        const snapshot = clonePackData(original);
        seedBuilderWorkingPack(original);
        expect(original).toEqual(snapshot);
        expect(isCanonicalScoringPack(original)).toBe(false);
    });
});

describe('migrateLegacyPackToCanonical', () => {
    it('migrates all-identical dense numeric packs to Uniform with zero overrides', () => {
        const labels = { 0: 'None', 1: 'Emerging', 2: 'Mastered' };
        const before = makePack([
            domainA([
                makeTarget('A1', numericScoring([0, 1, 2], labels)),
                makeTarget('A2', numericScoring([0, 1, 2], labels)),
            ]),
            {
                domain_id: 'B',
                title: 'Domain B',
                targets: [makeTarget('B1', numericScoring([0, 1, 2], labels))],
            },
        ]);

        const after = migrateLegacyPackToCanonical(before);

        expect(isCanonicalScoringPack(after)).toBe(true);
        expect(after.scoring_mode).toBe('uniform');
        expect(after.default_scoring?.scale).toEqual([0, 1, 2]);
        expect(after.default_scoring?.scale_labels).toEqual(labels);
        expect(overrideCount(after)).toBe(0);
        after.domains.forEach((domain) => {
            domain.targets.forEach((target) => {
                expect(target).not.toHaveProperty('scoring');
            });
        });
        expect(after.title).toBe(before.title);
        expect(after.description).toBe(before.description);
        assertEffectiveEquality(before, after);
    });

    it('migrates mixed numeric scales to Custom with overrides only on exceptions', () => {
        const before = makePack([
            domainA([makeTarget('A1', numericScoring([0, 1, 2, 3, 4]))]),
            {
                domain_id: 'C',
                title: 'Domain C',
                targets: [makeTarget('C1', numericScoring([0, 1, 2]))],
            },
            {
                domain_id: 'G',
                title: 'Domain G',
                targets: [
                    makeTarget('G1', numericScoring([0, 1, 2, 3, 4])),
                    makeTarget('G2', numericScoring([0, 0.5, 1])),
                ],
            },
        ]);

        const after = migrateLegacyPackToCanonical(before);

        expect(after.scoring_mode).toBe('custom');
        expect(after.default_scoring?.scale).toEqual([0, 1, 2, 3, 4]);
        expect(after.domains[0].targets[0].scoring).toBeUndefined();
        expect(after.domains[1].targets[0].scoring?.scale).toEqual([0, 1, 2]);
        expect(after.domains[2].targets[0].scoring).toBeUndefined();
        expect(after.domains[2].targets[1].scoring?.scale).toEqual([0, 0.5, 1]);
        expect(overrideCount(after)).toBe(2);
        assertEffectiveEquality(before, after);
    });

    it('migrates a dense yes/no pack without changing Effective Scoring', () => {
        const yesNo = {
            type: 'yesno' as const,
            scale_labels: {},
            no_opportunity_allowed: false,
        };
        const before = makePack([
            domainA([makeTarget('YN1', yesNo), makeTarget('YN2', yesNo)]),
        ]);

        const after = migrateLegacyPackToCanonical(before);

        expect(after.scoring_mode).toBe('uniform');
        expect(after.default_scoring?.type).toBe('yesno');
        expect(overrideCount(after)).toBe(0);
        assertEffectiveEquality(before, after);
    });

    it('migrates a dense checkbox / task-step pack without changing Effective Scoring', () => {
        const checkbox = {
            type: 'checkbox' as const,
            task_steps: ['Step 1', 'Step 2', 'Step 3'],
            scale_labels: {},
            no_opportunity_allowed: true,
        };
        const before = makePack([
            domainA([makeTarget('TA1', checkbox), makeTarget('TA2', checkbox)]),
        ]);

        const after = migrateLegacyPackToCanonical(before);

        expect(after.scoring_mode).toBe('uniform');
        expect(after.default_scoring?.type).toBe('checkbox');
        expect(after.default_scoring?.task_steps).toEqual(['Step 1', 'Step 2', 'Step 3']);
        expect(overrideCount(after)).toBe(0);
        assertEffectiveEquality(before, after);
    });

    it('uses modal Effective as default for mixed types and preserves every target', () => {
        const numeric = numericScoring([0, 1, 2, 3, 4]);
        const yesNo = {
            type: 'yesno' as const,
            scale_labels: {},
            no_opportunity_allowed: false,
        };
        const before = makePack([
            domainA([
                makeTarget('A1', numeric),
                makeTarget('A2', numeric),
                makeTarget('A3', yesNo),
            ]),
        ]);

        const after = migrateLegacyPackToCanonical(before);

        expect(after.scoring_mode).toBe('custom');
        expect(after.default_scoring?.type).toBe('numeric');
        expect(after.domains[0].targets[0].scoring).toBeUndefined();
        expect(after.domains[0].targets[1].scoring).toBeUndefined();
        expect(after.domains[0].targets[2].scoring?.type).toBe('yesno');
        assertEffectiveEquality(before, after);
    });

    it('breaks modal ties by first occurrence in domain/target order', () => {
        const first = numericScoring([0, 1]);
        const second = numericScoring([0, 1, 2]);
        const before = makePack([
            domainA([makeTarget('A1', first), makeTarget('A2', second)]),
        ]);

        const after = migrateLegacyPackToCanonical(before);

        expect(after.scoring_mode).toBe('custom');
        expect(after.default_scoring?.scale).toEqual([0, 1]);
        expect(after.domains[0].targets[0].scoring).toBeUndefined();
        expect(after.domains[0].targets[1].scoring?.scale).toEqual([0, 1, 2]);
        assertEffectiveEquality(before, after);
    });

    it('retains named-scale catalog after migrate of a homogeneous scale_id pack', () => {
        const catalog = [
            {
                scale_id: 'classic',
                title: 'Classic 0-4',
                type: 'numeric' as const,
                scale: [0, 1, 2, 3, 4],
                scale_labels: { 0: 'Not Yet', 4: 'Mastered' },
            },
        ];
        const named = {
            type: 'numeric' as const,
            scale_id: 'classic',
            scale_labels: {},
            no_opportunity_allowed: false,
        };
        const before = makePack(
            [domainA([makeTarget('A1', named), makeTarget('A2', named)])],
            { scoring_scales: catalog }
        );

        const after = migrateLegacyPackToCanonical(before);

        expect(after.scoring_mode).toBe('uniform');
        expect(after.default_scoring?.scale_id).toBe('classic');
        expect(after.scoring_scales).toEqual(catalog);
        expect(overrideCount(after)).toBe(0);
        assertEffectiveEquality(before, after);

        const saved = normalizeCanonicalPackForSave(after);
        expect(saved.scoring_scales).toEqual(catalog);
        expect(saved.default_scoring?.scale_id).toBe('classic');
        expect(overrideCount(saved)).toBe(0);
        assertEffectiveEquality(before, saved);
    });

    it('preserves Effective Scoring for legacy targets with missing scale', () => {
        const before = makePack([
            domainA([
                makeTarget('A1', {
                    type: 'numeric',
                    scale_labels: {},
                    no_opportunity_allowed: false,
                }),
                makeTarget('A2'),
            ]),
        ]);

        const after = migrateLegacyPackToCanonical(before);

        expect(isCanonicalScoringPack(after)).toBe(true);
        expect(after.scoring_mode).toBe('uniform');
        expect(overrideCount(after)).toBe(0);
        assertEffectiveEquality(before, after);
    });

    it('is a no-op migrate for an already-canonical Uniform pack', () => {
        const defaultScoring: PackDefaultScoring = {
            type: 'numeric',
            scale: [0, 1, 2, 3, 4],
            scale_labels: { 4: 'Mastered' },
            no_opportunity_allowed: true,
        };
        const before = makePack(
            [
                domainA([
                    makeTarget('A1', undefined, { title: 'Keep title', notes: 'Keep notes' }),
                    makeTarget('A2'),
                ]),
            ],
            {
                scoring_mode: 'uniform',
                default_scoring: defaultScoring,
            }
        );

        const after = migrateLegacyPackToCanonical(before);

        expect(after.scoring_mode).toBe('uniform');
        expect(after.default_scoring).toEqual(defaultScoring);
        expect(overrideCount(after)).toBe(0);
        expect(after.domains[0].targets[0].title).toBe('Keep title');
        expect(after.domains[0].targets[0].notes).toBe('Keep notes');
        assertEffectiveEquality(before, after);
    });
});

describe('normalizeCanonicalPackForSave', () => {
    it('strips a redundant Custom override (N2) without changing Effective Scoring', () => {
        const defaultScoring: PackDefaultScoring = {
            type: 'numeric',
            scale: [0, 1, 2, 3, 4],
            scale_labels: {},
            no_opportunity_allowed: false,
        };
        const before = makePack(
            [
                domainA([
                    makeTarget('A1'),
                    makeTarget('A2', numericScoring([0, 1, 2, 3, 4])),
                    makeTarget('A3', numericScoring([0, 1])),
                ]),
            ],
            {
                scoring_mode: 'custom',
                default_scoring: defaultScoring,
            }
        );

        const opened = migrateLegacyPackToCanonical(before);
        expect(opened.domains[0].targets[1].scoring).toBeUndefined();
        expect(opened.domains[0].targets[2].scoring?.scale).toEqual([0, 1]);

        const saved = normalizeCanonicalPackForSave(opened);
        expect(saved.domains[0].targets[0]).not.toHaveProperty('scoring');
        expect(saved.domains[0].targets[1]).not.toHaveProperty('scoring');
        expect(saved.domains[0].targets[2].scoring?.scale).toEqual([0, 1]);
        assertEffectiveEquality(before, saved);
        assertEffectiveEquality(opened, saved);
    });

    it('clears Uniform stray overrides on save (N1) even when they differ from default', () => {
        const before = makePack(
            [
                domainA([
                    makeTarget('A1'),
                    makeTarget('A2', numericScoring([0, 1, 2])),
                ]),
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

        const opened = migrateLegacyPackToCanonical(before);
        expect(opened.scoring_mode).toBe('uniform');
        expect(opened.domains[0].targets[1].scoring?.scale).toEqual([0, 1, 2]);

        const saved = normalizeCanonicalPackForSave(opened);
        expect(overrideCount(saved)).toBe(0);
        saved.domains[0].targets.forEach((target) => {
            expect(target).not.toHaveProperty('scoring');
        });
        expect(saved.scoring_mode).toBe('uniform');
    });

    it('does not copy default scoring onto Inherited targets (N3)', () => {
        const pack = makePack(
            [domainA([makeTarget('A1'), makeTarget('A2', numericScoring([0, 1]))])],
            {
                scoring_mode: 'custom',
                default_scoring: {
                    type: 'numeric',
                    scale: [0, 1, 2, 3, 4],
                    scale_labels: { 0: 'None' },
                    no_opportunity_allowed: false,
                },
            }
        );

        const saved = normalizeCanonicalPackForSave(pack);
        expect(saved.domains[0].targets[0]).not.toHaveProperty('scoring');
        expect(saved.domains[0].targets[1].scoring?.scale).toEqual([0, 1]);
    });

    it('never strips scoring_scales (N5)', () => {
        const catalog = [
            {
                scale_id: 'half',
                title: 'Half',
                type: 'numeric' as const,
                scale: [0, 0.5, 1],
            },
        ];
        const pack = makePack(
            [domainA([makeTarget('A1')])],
            {
                scoring_mode: 'uniform',
                default_scoring: {
                    type: 'numeric',
                    scale_id: 'half',
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
                scoring_scales: catalog,
            }
        );

        const saved = normalizeCanonicalPackForSave(pack);
        expect(saved.scoring_scales).toEqual(catalog);
        expect(saved.default_scoring?.scale_id).toBe('half');
    });

    it('leaves non-scoring fields untouched (N6)', () => {
        const pack = makePack(
            [
                domainA(
                    [
                        makeTarget('A1', undefined, {
                            title: 'Imitation',
                            description: 'Motor',
                            success_criteria: '8/10',
                            materials: 'Mat',
                            examples: 'Clap',
                            instructions: 'Model first',
                            notes: 'Keep me',
                        }),
                    ],
                    { title: 'Cooperation', description: 'Domain prose' }
                ),
            ],
            {
                scoring_mode: 'uniform',
                default_scoring: clonePackData(NEW_PACK_DEFAULT_SCORING),
                structure_labels: { primary_group: 'Level', target: 'Item' },
            }
        );

        const saved = normalizeCanonicalPackForSave(pack);
        expect(saved.structure_labels).toEqual(pack.structure_labels);
        expect(saved.domains[0].title).toBe('Cooperation');
        expect(saved.domains[0].description).toBe('Domain prose');
        expect(saved.domains[0].targets[0]).toMatchObject({
            title: 'Imitation',
            description: 'Motor',
            success_criteria: '8/10',
            materials: 'Mat',
            examples: 'Clap',
            instructions: 'Model first',
            notes: 'Keep me',
        });
    });
});

describe('Custom → Uniform override clearing helpers', () => {
    it('detects overrides and clearAllTargetScoringOverrides removes them', () => {
        const domains: Domain[] = [
            domainA([
                makeTarget('A1'),
                makeTarget('A2', numericScoring([0, 1])),
            ]),
        ];
        expect(domainsHaveScoringOverrides(domains)).toBe(true);
        const cleared = clearAllTargetScoringOverrides(domains);
        expect(domainsHaveScoringOverrides(cleared)).toBe(false);
        expect(domainsHaveScoringOverrides(domains)).toBe(true);
        expect(cleared[0].targets[1]).not.toHaveProperty('scoring');
    });
});
