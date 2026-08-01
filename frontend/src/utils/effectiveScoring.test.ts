import { describe, expect, it } from 'vitest';
import { ContentPackData, PackDefaultScoring, Target } from '../types';
import { analyticsService } from '../services/analytics';
import { interpretTargetScore } from './scoreInterpretation';
import {
    CANONICAL_NUMERIC_FALLBACK_SCALE,
    effectiveScoringEquals,
    getEffectiveAllowedValues,
    getEffectiveMaxScore,
    hasTargetScoringOverride,
    isCanonicalScoringPack,
    isLegacyDenseScoringPack,
    isScoreAllowedByEffectiveScoring,
    normalizePackScoringMode,
    resolveEffectiveScoring,
    resolveTargetAuthoredScoringState,
    resolveTargetAuthoredScoringSource,
} from './effectiveScoring';

const CLASSIC_DEFAULT = [0, 1, 2, 3, 4] as const;

function makeTarget(overrides: Partial<Target> & Pick<Target, 'target_id'>): Target {
    return {
        title: overrides.title ?? overrides.target_id,
        success_criteria: '',
        materials: '',
        scoring: {
            type: 'numeric',
            scale_labels: {},
            no_opportunity_allowed: true,
        },
        ...overrides,
    };
}

function makeInheritedTarget(overrides: Partial<Target> & Pick<Target, 'target_id'>): Target {
    const { scoring: _unusedScoring, ...rest } = overrides;
    void _unusedScoring;
    return {
        title: rest.title ?? rest.target_id,
        success_criteria: '',
        materials: '',
        ...rest,
    };
}

function makePack(
    targets: Target[],
    extras?: Partial<
        Pick<ContentPackData, 'scoring_mode' | 'default_scoring' | 'scoring_scales'>
    >
): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Runtime Pack',
        description: '',
        version: '1.0',
        ...extras,
        domains: [
            {
                domain_id: 'A',
                title: 'Domain A',
                targets,
            },
        ],
    };
}

function classicDefaultScoring(
    overrides: Partial<PackDefaultScoring> = {}
): PackDefaultScoring {
    return {
        type: 'numeric',
        scale: [...CLASSIC_DEFAULT],
        scale_labels: {},
        no_opportunity_allowed: false,
        ...overrides,
    };
}

describe('resolveEffectiveScoring — Phase A', () => {
    it('uses explicit numeric scale for allowed values and max', () => {
        const target = makeTarget({
            target_id: 'T1',
            scoring: {
                type: 'numeric',
                scale: [0, 0.5, 1],
                scale_labels: { 0.5: 'Partial' },
                no_opportunity_allowed: true,
            },
        });
        const pack = makePack([target]);
        const effective = resolveEffectiveScoring(target, pack);
        expect(effective.allowedValues).toEqual([0, 0.5, 1]);
        expect(effective.maxScore).toBe(1);
        expect(effective.scaleLabels[0.5]).toBe('Partial');
        expect(effective.provenance).toBe('inline');
    });

    it('applies the single canonical numeric fallback', () => {
        const target = makeTarget({
            target_id: 'T2',
            scoring: {
                type: 'numeric',
                scale_labels: {},
                no_opportunity_allowed: true,
            },
        });
        const pack = makePack([target]);
        const effective = resolveEffectiveScoring(target, pack);
        expect(effective.allowedValues).toEqual([...CANONICAL_NUMERIC_FALLBACK_SCALE]);
        expect(effective.maxScore).toBe(4);
        expect(effective.provenance).toBe('canonical_fallback');
    });

    it('resolves named scale catalog entries with inline override winning', () => {
        const target = makeTarget({
            target_id: 'T3',
            scoring: {
                type: 'numeric',
                scale_id: 'half',
                scale: [0, 1],
                scale_labels: {},
                no_opportunity_allowed: true,
            },
        });
        const pack = makePack([target], {
            scoring_scales: [
                {
                    scale_id: 'half',
                    title: 'Half',
                    type: 'numeric',
                    scale: [0, 0.5, 1],
                    scale_labels: { 0: 'None', 0.5: 'Half', 1: 'Full' },
                    no_opportunity_allowed: false,
                },
            ],
        });
        const effective = resolveEffectiveScoring(target, pack);
        expect(effective.allowedValues).toEqual([0, 1]);
        expect(effective.maxScore).toBe(1);
        expect(effective.resolvedFromScaleId).toBe('half');
    });

    it('uses named scale when inline scale is absent', () => {
        const target = makeTarget({
            target_id: 'T4',
            scoring: {
                type: 'numeric',
                scale_id: 'half',
                scale_labels: {},
                no_opportunity_allowed: true,
            },
        });
        const pack = makePack([target], {
            scoring_scales: [
                {
                    scale_id: 'half',
                    title: 'Half',
                    type: 'numeric',
                    scale: [0, 0.5, 1],
                    scale_labels: { 0.5: 'Partial' },
                    no_opportunity_allowed: false,
                },
            ],
        });
        const effective = resolveEffectiveScoring(target, pack);
        expect(effective.allowedValues).toEqual([0, 0.5, 1]);
        expect(effective.maxScore).toBe(1);
        expect(effective.scaleLabels[0.5]).toBe('Partial');
        expect(effective.provenance).toBe('named_scale');
    });

    it('normalizes yes/no and checkbox cardinality', () => {
        const yesNo = makeTarget({
            target_id: 'YN',
            scoring: { type: 'yesno', scale_labels: {}, no_opportunity_allowed: false },
        });
        const checkbox = makeTarget({
            target_id: 'CB',
            scoring: {
                type: 'checkbox',
                task_steps: ['a', 'b', 'c'],
                scale_labels: {},
                no_opportunity_allowed: true,
            },
        });
        const pack = makePack([yesNo, checkbox]);
        expect(resolveEffectiveScoring(yesNo, pack).allowedValues).toEqual([0, 1]);
        expect(resolveEffectiveScoring(yesNo, pack).maxScore).toBe(1);
        expect(resolveEffectiveScoring(checkbox, pack).allowedValues).toEqual([0, 1, 2, 3]);
        expect(resolveEffectiveScoring(checkbox, pack).maxScore).toBe(3);
    });
});

describe('Phase A runtime consistency (G1–G6, G8)', () => {
    const decimal = makeTarget({
        target_id: 'DEC',
        scoring: {
            type: 'numeric',
            scale: [0, 0.5, 1],
            scale_labels: {},
            no_opportunity_allowed: true,
        },
    });
    const classic = makeTarget({
        target_id: 'CL',
        scoring: {
            type: 'numeric',
            scale: [...CLASSIC_DEFAULT],
            scale_labels: {},
            no_opportunity_allowed: true,
        },
    });
    const snapshotPack = makePack([decimal, classic]);

    it('Matrix allowed values ≡ interpretation scaleValues ≡ analytics max', () => {
        for (const target of [decimal, classic]) {
            const effective = resolveEffectiveScoring(target, snapshotPack);
            const interpretation = interpretTargetScore(target, null, snapshotPack);
            expect(interpretation.scaleValues).toEqual(effective.allowedValues);
            expect(interpretation.targetMax).toBe(effective.maxScore);
            expect(getEffectiveAllowedValues(target, snapshotPack)).toEqual(
                effective.allowedValues
            );
            expect(getEffectiveMaxScore(target, snapshotPack)).toBe(effective.maxScore);
        }

        const stats = analyticsService.calculateDomainStats(snapshotPack, [
            {
                id: 's1',
                assessment_id: 'a1',
                assessment_cycle_id: 'c1',
                client_id: 'cl',
                pack_snapshot_id: 'p',
                target_id: 'DEC',
                domain_id: 'A',
                score: 0.5,
                note: null,
                evidence_files: [],
                assessor_user_id: 'u',
                scored_at: '',
                created_at: '',
                updated_at: '',
            },
        ]);
        expect(stats[0].maxScore).toBe(1 + 4);
        expect(stats[0].totalScore).toBe(0.5);
    });

    it('validation membership matches Effective allowed values', () => {
        const effective = resolveEffectiveScoring(decimal, snapshotPack);
        expect(isScoreAllowedByEffectiveScoring(0.5, effective)).toBe(true);
        expect(isScoreAllowedByEffectiveScoring(0.25, effective)).toBe(false);
        expect(isScoreAllowedByEffectiveScoring(null, effective)).toBe(true);
    });

    it('export max meaning matches Effective Scoring for pack_snapshot', () => {
        const decimalMax = resolveEffectiveScoring(decimal, snapshotPack).maxScore;
        const classicMax = resolveEffectiveScoring(classic, snapshotPack).maxScore;
        expect(decimalMax).toBe(1);
        expect(classicMax).toBe(4);

        expect(getEffectiveMaxScore(decimal, snapshotPack)).toBe(decimalMax);
        expect(getEffectiveMaxScore(classic, snapshotPack)).toBe(classicMax);
    });

    it('G8: live pack edits do not change frozen snapshot Effective Scoring', () => {
        const frozenTarget = makeTarget({
            target_id: 'F1',
            scoring: {
                type: 'numeric',
                scale: [0, 0.5, 1],
                scale_labels: {},
                no_opportunity_allowed: true,
            },
        });
        const frozenSnapshot = makePack([frozenTarget]);

        const liveEdited = makePack([
            makeTarget({
                target_id: 'F1',
                scoring: {
                    type: 'numeric',
                    scale: [...CLASSIC_DEFAULT],
                    scale_labels: {},
                    no_opportunity_allowed: true,
                },
            }),
        ]);

        const fromSnapshot = resolveEffectiveScoring(frozenTarget, frozenSnapshot);
        expect(fromSnapshot.allowedValues).toEqual([0, 0.5, 1]);
        expect(fromSnapshot.maxScore).toBe(1);

        const fromLive = resolveEffectiveScoring(liveEdited.domains[0].targets[0], liveEdited);
        expect(fromLive.allowedValues).toEqual([...CLASSIC_DEFAULT]);
        expect(fromLive.maxScore).toBe(4);
        expect(fromSnapshot.allowedValues).not.toEqual(fromLive.allowedValues);
    });
});

describe('PR B2 — detection helpers', () => {
    it('isCanonicalScoringPack requires both mode and default_scoring', () => {
        expect(isCanonicalScoringPack(makePack([], { scoring_mode: 'uniform' }))).toBe(false);
        expect(
            isCanonicalScoringPack(
                makePack([], {
                    default_scoring: classicDefaultScoring(),
                })
            )
        ).toBe(false);
        expect(
            isCanonicalScoringPack(
                makePack([], {
                    scoring_mode: 'uniform',
                    default_scoring: classicDefaultScoring(),
                })
            )
        ).toBe(true);
    });

    it('isLegacyDenseScoringPack is the inverse', () => {
        expect(isLegacyDenseScoringPack(makePack([]))).toBe(true);
        expect(
            isLegacyDenseScoringPack(
                makePack([], {
                    scoring_mode: 'custom',
                    default_scoring: classicDefaultScoring(),
                })
            )
        ).toBe(false);
    });

    it('hasTargetScoringOverride reflects optional target.scoring', () => {
        expect(hasTargetScoringOverride(makeInheritedTarget({ target_id: 'I1' }))).toBe(false);
        expect(hasTargetScoringOverride(makeTarget({ target_id: 'O1' }))).toBe(true);
    });

    it('normalizePackScoringMode coerces unknown values to custom', () => {
        expect(normalizePackScoringMode('uniform')).toBe('uniform');
        expect(normalizePackScoringMode('custom')).toBe('custom');
        expect(normalizePackScoringMode('bogus')).toBe('custom');
        expect(normalizePackScoringMode(undefined)).toBe('custom');
    });

    it('resolveTargetAuthoredScoringState distinguishes inherited, override, legacy', () => {
        const canonical = makePack([], {
            scoring_mode: 'custom',
            default_scoring: classicDefaultScoring(),
        });
        expect(
            resolveTargetAuthoredScoringState(
                makeInheritedTarget({ target_id: 'I' }),
                canonical
            )
        ).toBe('inherited');
        expect(
            resolveTargetAuthoredScoringState(makeTarget({ target_id: 'O' }), canonical)
        ).toBe('override');
        expect(
            resolveTargetAuthoredScoringState(makeTarget({ target_id: 'L' }), makePack([]))
        ).toBe('legacy');
    });
});

describe('PR B2 — Uniform inheritance', () => {
    it('inherited targets use pack default_scoring', () => {
        const pack = makePack([makeInheritedTarget({ target_id: 'I1' })], {
            scoring_mode: 'uniform',
            default_scoring: {
                type: 'numeric',
                scale: [0, 0.5, 1],
                scale_labels: { 1: 'Full' },
                no_opportunity_allowed: true,
            },
        });
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([0, 0.5, 1]);
        expect(effective.maxScore).toBe(1);
        expect(effective.authoredState).toBe('inherited');
        expect(effective.authoredSource).toBe('pack_default');
        expect(effective.provenance).toBe('pack_default');
    });

    it('Uniform ignores target overrides and emits a warning', () => {
        const pack = makePack(
            [
                makeTarget({
                    target_id: 'O1',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                }),
            ],
            {
                scoring_mode: 'uniform',
                default_scoring: classicDefaultScoring(),
            }
        );
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([...CLASSIC_DEFAULT]);
        expect(effective.authoredState).toBe('override');
        expect(effective.authoredSource).toBe('pack_default');
        expect(effective.warnings.some((w) => w.includes('overrides are ignored'))).toBe(true);
    });
});

describe('PR B2 — Custom inheritance and overrides', () => {
    it('Custom inherited targets use pack default', () => {
        const pack = makePack([makeInheritedTarget({ target_id: 'I1' })], {
            scoring_mode: 'custom',
            default_scoring: classicDefaultScoring(),
        });
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([...CLASSIC_DEFAULT]);
        expect(effective.authoredState).toBe('inherited');
    });

    it('Custom sparse override replaces inheritance', () => {
        const pack = makePack(
            [
                makeInheritedTarget({ target_id: 'I1' }),
                makeTarget({
                    target_id: 'O1',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                }),
            ],
            {
                scoring_mode: 'custom',
                default_scoring: classicDefaultScoring(),
            }
        );
        const inherited = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        const overridden = resolveEffectiveScoring(pack.domains[0].targets[1], pack);
        expect(inherited.allowedValues).toEqual([...CLASSIC_DEFAULT]);
        expect(overridden.allowedValues).toEqual([0, 1]);
        expect(overridden.authoredState).toBe('override');
        expect(overridden.authoredSource).toBe('target_override');
    });

    it('override equal to default still resolves as target_override', () => {
        const pack = makePack(
            [
                makeTarget({
                    target_id: 'O1',
                    scoring: {
                        type: 'numeric',
                        scale: [...CLASSIC_DEFAULT],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                }),
            ],
            {
                scoring_mode: 'custom',
                default_scoring: classicDefaultScoring(),
            }
        );
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([...CLASSIC_DEFAULT]);
        expect(effective.authoredSource).toBe('target_override');
    });

    it('does not partially inherit pack default into incomplete override', () => {
        const pack = makePack(
            [
                makeTarget({
                    target_id: 'O1',
                    scoring: {
                        type: 'numeric',
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                }),
            ],
            {
                scoring_mode: 'custom',
                default_scoring: {
                    type: 'numeric',
                    scale: [0, 2, 4],
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
            }
        );
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([...CANONICAL_NUMERIC_FALLBACK_SCALE]);
        expect(effective.allowedValues).not.toEqual([0, 2, 4]);
        expect(
            effective.warnings.some((w) => w.includes('no pack-default field fill'))
        ).toBe(true);
    });
});

describe('PR B2 — named scale inheritance', () => {
    const catalog = [
        {
            scale_id: 'half',
            title: 'Half',
            type: 'numeric' as const,
            scale: [0, 0.5, 1],
            scale_labels: { 0.5: 'Catalog Partial' },
            no_opportunity_allowed: false,
        },
    ];

    it('pack default named scale resolves through catalog', () => {
        const pack = makePack([makeInheritedTarget({ target_id: 'I1' })], {
            scoring_mode: 'custom',
            default_scoring: {
                type: 'numeric',
                scale_id: 'half',
                scale_labels: {},
                no_opportunity_allowed: true,
            },
            scoring_scales: catalog,
        });
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([0, 0.5, 1]);
        expect(effective.provenance).toBe('pack_default_named_scale');
        expect(effective.resolvedFromScaleId).toBe('half');
    });

    it('override named scale resolves through catalog', () => {
        const pack = makePack(
            [
                makeTarget({
                    target_id: 'O1',
                    scoring: {
                        type: 'numeric',
                        scale_id: 'half',
                        scale_labels: {},
                        no_opportunity_allowed: true,
                    },
                }),
            ],
            {
                scoring_mode: 'custom',
                default_scoring: classicDefaultScoring(),
                scoring_scales: catalog,
            }
        );
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([0, 0.5, 1]);
        expect(effective.authoredSource).toBe('target_override');
    });

    it('inline override wins over named catalog scale', () => {
        const pack = makePack(
            [
                makeTarget({
                    target_id: 'O1',
                    scoring: {
                        type: 'numeric',
                        scale_id: 'half',
                        scale: [0, 1],
                        scale_labels: {},
                        no_opportunity_allowed: true,
                    },
                }),
            ],
            {
                scoring_mode: 'custom',
                default_scoring: classicDefaultScoring(),
                scoring_scales: catalog,
            }
        );
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([0, 1]);
        expect(effective.provenance).toBe('named_scale_with_inline_override');
    });

    it('unknown scale_id uses inline fields only', () => {
        const pack = makePack(
            [
                makeTarget({
                    target_id: 'O1',
                    scoring: {
                        type: 'numeric',
                        scale_id: 'missing',
                        scale: [0, 2],
                        scale_labels: {},
                        no_opportunity_allowed: true,
                    },
                }),
            ],
            {
                scoring_mode: 'custom',
                default_scoring: classicDefaultScoring(),
                scoring_scales: catalog,
            }
        );
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([0, 2]);
        expect(effective.resolvedFromScaleId).toBeUndefined();
    });

    it('empty catalog behaves like no catalog', () => {
        const pack = makePack(
            [
                makeInheritedTarget({ target_id: 'I1' }),
            ],
            {
                scoring_mode: 'custom',
                default_scoring: {
                    type: 'numeric',
                    scale_id: 'half',
                    scale: [0, 3],
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
                scoring_scales: [],
            }
        );
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([0, 3]);
    });
});

describe('PR B2 — legacy dense compatibility', () => {
    it('legacy dense pack resolves per-target scoring', () => {
        const pack = makePack([
            makeTarget({
                target_id: 'L1',
                scoring: {
                    type: 'numeric',
                    scale: [0, 1],
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
            }),
            makeTarget({
                target_id: 'L2',
                scoring: {
                    type: 'yesno',
                    scale_labels: {},
                    no_opportunity_allowed: false,
                },
            }),
        ]);
        expect(resolveEffectiveScoring(pack.domains[0].targets[0], pack).allowedValues).toEqual([
            0, 1,
        ]);
        expect(resolveEffectiveScoring(pack.domains[0].targets[1], pack).allowedValues).toEqual([
            0, 1,
        ]);
        expect(resolveEffectiveScoring(pack.domains[0].targets[0], pack).authoredState).toBe(
            'legacy'
        );
    });

    it('legacy target missing scoring uses canonical fallback + warning', () => {
        const pack = makePack([makeInheritedTarget({ target_id: 'M1' })]);
        const source = resolveTargetAuthoredScoringSource(pack.domains[0].targets[0], pack);
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([...CANONICAL_NUMERIC_FALLBACK_SCALE]);
        expect(source.warnings.some((w) => w.includes('missing scoring'))).toBe(true);
    });
});

describe('PR B2 — unknown mode and G8 canonical', () => {
    it('unknown scoring_mode is treated as custom with warning', () => {
        const pack = makePack([makeInheritedTarget({ target_id: 'I1' })], {
            scoring_mode: 'bogus' as 'custom',
            default_scoring: classicDefaultScoring(),
        });
        const effective = resolveEffectiveScoring(pack.domains[0].targets[0], pack);
        expect(effective.allowedValues).toEqual([...CLASSIC_DEFAULT]);
        expect(effective.warnings.some((w) => w.includes('Unknown scoring_mode'))).toBe(true);
    });

    it('G8: frozen canonical pack default is independent of live default edits', () => {
        const inherited = makeInheritedTarget({ target_id: 'I1' });
        const frozenSnapshot = makePack([inherited], {
            scoring_mode: 'custom',
            default_scoring: {
                type: 'numeric',
                scale: [0, 0.5, 1],
                scale_labels: {},
                no_opportunity_allowed: true,
            },
        });

        const livePack = makePack([inherited], {
            scoring_mode: 'custom',
            default_scoring: classicDefaultScoring(),
        });

        const fromSnapshot = resolveEffectiveScoring(inherited, frozenSnapshot);
        const fromLive = resolveEffectiveScoring(inherited, livePack);
        expect(fromSnapshot.allowedValues).toEqual([0, 0.5, 1]);
        expect(fromLive.allowedValues).toEqual([...CLASSIC_DEFAULT]);
        expect(fromSnapshot.allowedValues).not.toEqual(fromLive.allowedValues);
    });
});

describe('PR B2 — purity and determinism', () => {
    it('does not mutate pack or target and returns stable results', () => {
        const target = makeInheritedTarget({ target_id: 'I1' });
        const pack = makePack([target], {
            scoring_mode: 'custom',
            default_scoring: classicDefaultScoring(),
        });
        const packJson = JSON.stringify(pack);
        const targetJson = JSON.stringify(target);

        const first = resolveEffectiveScoring(target, pack);
        const second = resolveEffectiveScoring(target, pack);

        expect(JSON.stringify(pack)).toBe(packJson);
        expect(JSON.stringify(target)).toBe(targetJson);
        expect(effectiveScoringEquals(first, second)).toBe(true);
    });
});
