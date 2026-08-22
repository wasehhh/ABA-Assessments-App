import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContentPackData, Domain, PackDefaultScoring, Target } from '../types';
import {
    applyCustomizeOverride,
    applyRevertToInherited,
    formatEffectiveScoringSummary,
    resolveTargetEffectiveInWorkingPack,
    scoringOverrideFromPackDefault,
    withExistingOverrideScoring,
} from '../utils/assessmentBuilderOverrideUi';
import {
    effectiveScoringEquals,
    resolveEffectiveScoring,
} from '../utils/effectiveScoring';
import { ensureDenseTargetScoring } from '../utils/targetScoringAccess';

const targetEditorSource = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'AssessmentBuilderTargetEditor.tsx'),
    'utf8'
);
const builderSource = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'AssessmentBuilder.tsx'),
    'utf8'
);

function inheritedTarget(targetId: string): Target {
    return {
        target_id: targetId,
        title: targetId,
        success_criteria: '',
        materials: '',
    };
}

function makeWorkingPack(
    domains: Domain[],
    defaultScoring: PackDefaultScoring,
    scoringMode: 'uniform' | 'custom' = 'custom'
): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Working',
        description: '',
        version: '1.0',
        scoring_mode: scoringMode,
        default_scoring: defaultScoring,
        domains,
    };
}

const classicDefault: PackDefaultScoring = {
    type: 'numeric',
    scale: [0, 1, 2, 3, 4],
    scale_labels: { 0: 'None', 4: 'Mastered' },
    no_opportunity_allowed: true,
};

describe('B3.5 Inherited/Override UI helpers', () => {
    it('Inherited target has no scoring key and Effective matches pack default', () => {
        const target = inheritedTarget('A1');
        const pack = makeWorkingPack(
            [{ domain_id: 'A', title: 'A', targets: [target] }],
            classicDefault
        );

        expect(target).not.toHaveProperty('scoring');
        const effective = resolveTargetEffectiveInWorkingPack(target, pack);
        const defaultEffective = resolveEffectiveScoring(inheritedTarget('__d__'), pack);
        expect(effectiveScoringEquals(effective, defaultEffective)).toBe(true);
        expect(formatEffectiveScoringSummary(effective)).toContain('Numeric');
        expect(formatEffectiveScoringSummary(effective)).toContain('0,1,2,3,4');
        expect(formatEffectiveScoringSummary(effective)).toContain('0=None');
    });

    it('Customize seeds scoring as a deep copy of current default_scoring', () => {
        const domains: Domain[] = [
            { domain_id: 'A', title: 'A', targets: [inheritedTarget('A1')] },
        ];
        const atClick: PackDefaultScoring = {
            type: 'numeric',
            scale: [0, 0.5, 1],
            scale_labels: { 0: 'No', 1: 'Yes' },
            no_opportunity_allowed: false,
        };

        const next = applyCustomizeOverride(domains, 0, 0, atClick);
        const scoring = next[0].targets[0].scoring!;

        expect(scoring).toEqual(scoringOverrideFromPackDefault(atClick));
        expect(scoring.scale).toEqual([0, 0.5, 1]);
        expect(scoring.scale_labels).toEqual({ 0: 'No', 1: 'Yes' });
        // Deep copy: mutating the override must not mutate the default used at click.
        scoring.scale![0] = 99;
        scoring.scale_labels![0] = 'mutated';
        expect(atClick.scale![0]).toBe(0);
        expect(atClick.scale_labels![0]).toBe('No');
        expect(domains[0].targets[0]).not.toHaveProperty('scoring');
    });

    it('Revert removes scoring and Effective falls back to pack default', () => {
        const domains: Domain[] = [
            {
                domain_id: 'A',
                title: 'A',
                targets: [
                    {
                        ...inheritedTarget('A1'),
                        scoring: {
                            type: 'numeric',
                            scale: [0, 1],
                            scale_labels: {},
                            no_opportunity_allowed: false,
                        },
                    },
                ],
            },
        ];
        const packBefore = makeWorkingPack(domains, classicDefault);
        expect(resolveEffectiveScoring(domains[0].targets[0], packBefore).allowedValues).toEqual([
            0, 1,
        ]);

        const reverted = applyRevertToInherited(domains, 0, 0);
        expect(reverted[0].targets[0]).not.toHaveProperty('scoring');

        const packAfter = makeWorkingPack(reverted, classicDefault);
        const effective = resolveEffectiveScoring(reverted[0].targets[0], packAfter);
        const defaultEffective = resolveEffectiveScoring(inheritedTarget('__d__'), packAfter);
        expect(effectiveScoringEquals(effective, defaultEffective)).toBe(true);
        expect(effective.allowedValues).toEqual([0, 1, 2, 3, 4]);
    });

    it('changing pack default updates Inherited Effective while Override stays independent', () => {
        let domains: Domain[] = [
            {
                domain_id: 'A',
                title: 'A',
                targets: [
                    inheritedTarget('inherited'),
                    {
                        ...inheritedTarget('override'),
                        scoring: {
                            type: 'numeric',
                            scale: [0, 1],
                            scale_labels: { 0: 'Fixed' },
                            no_opportunity_allowed: false,
                        },
                    },
                ],
            },
        ];

        const originalDefault = classicDefault;
        let pack = makeWorkingPack(domains, originalDefault);
        const inheritedBefore = resolveEffectiveScoring(domains[0].targets[0], pack);
        const overrideBefore = resolveEffectiveScoring(domains[0].targets[1], pack);
        expect(inheritedBefore.allowedValues).toEqual([0, 1, 2, 3, 4]);
        expect(overrideBefore.allowedValues).toEqual([0, 1]);

        const nextDefault: PackDefaultScoring = {
            type: 'numeric',
            scale: [0, 2, 4],
            scale_labels: { 0: 'Low', 4: 'High' },
            no_opportunity_allowed: true,
        };
        pack = makeWorkingPack(domains, nextDefault);

        const inheritedAfter = resolveEffectiveScoring(domains[0].targets[0], pack);
        const overrideAfter = resolveEffectiveScoring(domains[0].targets[1], pack);
        expect(inheritedAfter.allowedValues).toEqual([0, 2, 4]);
        expect(inheritedAfter.scaleLabels).toEqual({ 0: 'Low', 4: 'High' });
        expect(overrideAfter.allowedValues).toEqual([0, 1]);
        expect(overrideAfter.scaleLabels).toEqual({ 0: 'Fixed' });
        expect(
            effectiveScoringEquals(overrideBefore, overrideAfter)
        ).toBe(true);

        // Customize after default change seeds the *current* default.
        domains = applyCustomizeOverride(domains, 0, 0, nextDefault);
        expect(domains[0].targets[0].scoring?.scale).toEqual([0, 2, 4]);
    });

    it('withExistingOverrideScoring never densifies Inherited targets', () => {
        const inherited = inheritedTarget('A1');
        const touched = withExistingOverrideScoring(inherited, (scoring) => {
            scoring.scale_labels = { 0: 'should not apply' };
        });
        expect(touched).toBe(false);
        expect(inherited).not.toHaveProperty('scoring');

        // Contrast: ensureDenseTargetScoring *would* attach a blob — the bug B3.5 forbids.
        const densifyVictim = inheritedTarget('A2');
        ensureDenseTargetScoring(densifyVictim);
        expect(densifyVictim.scoring).toBeDefined();
    });
});

describe('B3.5 TargetEditor densify discipline (source contracts)', () => {
    it('TargetEditor no longer imports dense densify helpers', () => {
        expect(targetEditorSource).not.toContain('denseTargetScoring');
        expect(targetEditorSource).not.toContain('ensureDenseTargetScoring');
        expect(targetEditorSource).toContain('Inherited');
        expect(targetEditorSource).toContain('Override');
        expect(targetEditorSource).toContain('Customize');
        expect(targetEditorSource).toContain('Revert to pack default');
        expect(targetEditorSource).toContain('resolveTargetEffectiveInWorkingPack');
    });

    it('Uniform still gates per-target scoring with useGlobalScale', () => {
        expect(targetEditorSource).toMatch(/showCustomScoringUi\s*=\s*!useGlobalScale/);
        expect(builderSource).toContain('onCustomizeOverride');
        expect(builderSource).toContain('applyCustomizeOverride');
        expect(builderSource).toContain('applyRevertToInherited');
        expect(builderSource).not.toContain('denseTargetScoring');
        expect(builderSource).not.toContain('ensureDenseTargetScoring');
    });
});
