import { describe, expect, it } from 'vitest';
import { ContentPackData, Target } from '../types';
import {
    CANONICAL_NUMERIC_FALLBACK_SCALE,
    getEffectiveAllowedValues,
    getEffectiveMaxScore,
    isScoreAllowedByEffectiveScoring,
    resolveEffectiveScoring,
} from './effectiveScoring';
import { analyticsService } from '../services/analytics';
import { interpretTargetScore } from './scoreInterpretation';

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

function makePack(targets: Target[], scoringScales?: ContentPackData['scoring_scales']): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Runtime Pack',
        description: '',
        version: '1.0',
        ...(scoringScales ? { scoring_scales: scoringScales } : {}),
        domains: [
            {
                domain_id: 'A',
                title: 'Domain A',
                targets,
            },
        ],
    };
}

describe('resolveEffectiveScoring', () => {
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
        const pack = makePack([target], [
            {
                scale_id: 'half',
                title: 'Half',
                type: 'numeric',
                scale: [0, 0.5, 1],
                scale_labels: { 0: 'None', 0.5: 'Half', 1: 'Full' },
                no_opportunity_allowed: false,
            },
        ]);
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
        const pack = makePack([target], [
            {
                scale_id: 'half',
                title: 'Half',
                type: 'numeric',
                scale: [0, 0.5, 1],
                scale_labels: { 0.5: 'Partial' },
                no_opportunity_allowed: false,
            },
        ]);
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
            scale: [0, 1, 2, 3, 4],
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

        // CSV export uses the same Effective max (see exportUtils + exportUtils.test).
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
                    scale: [0, 1, 2, 3, 4],
                    scale_labels: {},
                    no_opportunity_allowed: true,
                },
            }),
        ]);

        const fromSnapshot = resolveEffectiveScoring(frozenTarget, frozenSnapshot);
        // Re-resolving the frozen target against the live pack would be incorrect for G8;
        // assessment runtime must keep using frozenSnapshot.
        expect(fromSnapshot.allowedValues).toEqual([0, 0.5, 1]);
        expect(fromSnapshot.maxScore).toBe(1);

        const fromLive = resolveEffectiveScoring(liveEdited.domains[0].targets[0], liveEdited);
        expect(fromLive.allowedValues).toEqual([0, 1, 2, 3, 4]);
        expect(fromLive.maxScore).toBe(4);
        expect(fromSnapshot.allowedValues).not.toEqual(fromLive.allowedValues);
    });
});
