import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ContentPackData, Domain } from '../types';
import {
    clearAllTargetScoringOverrides,
    domainsHaveScoringOverrides,
    migrateLegacyPackToCanonical,
    normalizeCanonicalPackForSave,
    seedBuilderWorkingPack,
} from '../utils/assessmentPackCanonical';
import { isCanonicalScoringPack, resolveEffectiveScoring, effectiveScoringEquals } from '../utils/effectiveScoring';
import { normalizePackIdentifiers } from '../utils/assessmentPackAuthoring';

const builderSource = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'AssessmentBuilder.tsx'),
    'utf8'
);

function numericTarget(targetId: string, scale: number[], scaleLabels: Record<number, string> = {}) {
    return {
        target_id: targetId,
        title: targetId,
        success_criteria: '',
        materials: '',
        scoring: {
            type: 'numeric' as const,
            scale,
            scale_labels: scaleLabels,
            no_opportunity_allowed: false,
        },
    };
}

function packWithDomains(domains: Domain[]): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Test Pack',
        description: '',
        version: '1.0',
        domains,
    };
}

describe('AssessmentBuilder B3 open/save contracts', () => {
    it('no longer uses deriveInitialGlobalScaleState or dense densify save helpers', () => {
        expect(builderSource).not.toContain('deriveInitialGlobalScaleState');
        expect(builderSource).not.toContain('prepareBuilderPackForSave');
        expect(builderSource).not.toContain('applyGlobalScaleLabels');
        expect(builderSource).not.toContain('New targets snapshot');
        expect(builderSource).not.toContain('does not rewrite existing target scales');
        expect(builderSource).toContain('seedBuilderWorkingPack');
        expect(builderSource).toContain('normalizeCanonicalPackForSave');
        expect(builderSource).toContain('ConfirmDialog');
        expect(builderSource).toContain('clearAllTargetScoringOverrides');
        expect(builderSource).toContain('domainsHaveScoringOverrides');
    });

    it('opens a dense pack into an in-memory canonical working copy', () => {
        const dense = packWithDomains([
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [
                    numericTarget('A1', [0, 1, 2], { 0: 'None', 1: 'Emerging', 2: 'Mastered' }),
                    numericTarget('A2', [0, 1, 2], { 0: 'None', 1: 'Emerging', 2: 'Mastered' }),
                ],
            },
        ]);

        const seed = seedBuilderWorkingPack(dense);
        expect(seed.scoring_mode).toBe('uniform');
        expect(seed.default_scoring.scale).toEqual([0, 1, 2]);
        expect(seed.domains.every((domain) => domain.targets.every((t) => !t.scoring))).toBe(
            true
        );

        const workingPack: ContentPackData = {
            ...dense,
            scoring_mode: seed.scoring_mode,
            default_scoring: seed.default_scoring,
            domains: seed.domains,
        };
        expect(isCanonicalScoringPack(workingPack)).toBe(true);
        expect(isCanonicalScoringPack(dense)).toBe(false);
    });

    it('Cancel recovery: seeding / migrate does not mutate the DB pack baseline', () => {
        const dense = packWithDomains([
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [numericTarget('A1', [0, 1, 2, 3, 4])],
            },
        ]);
        const baseline = structuredClone(dense);
        seedBuilderWorkingPack(dense);
        migrateLegacyPackToCanonical(dense);
        expect(dense).toEqual(baseline);
    });

    it('Custom → Uniform confirm accept clears overrides; dismiss leaves them intact', () => {
        const domains: Domain[] = [
            {
                domain_id: 'A',
                title: 'A',
                targets: [
                    {
                        target_id: 'A1',
                        title: 'A1',
                        success_criteria: '',
                        materials: '',
                    },
                    numericTarget('A2', [0, 1]),
                ],
            },
        ];

        expect(domainsHaveScoringOverrides(domains)).toBe(true);

        // Dismiss: working copy unchanged
        const dismissed = domains;
        expect(domainsHaveScoringOverrides(dismissed)).toBe(true);
        expect(dismissed[0].targets[1].scoring?.scale).toEqual([0, 1]);

        // Accept: clear overrides (Builder confirm handler)
        const accepted = clearAllTargetScoringOverrides(domains);
        expect(domainsHaveScoringOverrides(accepted)).toBe(false);
        expect(accepted[0].targets[1]).not.toHaveProperty('scoring');
        expect(domainsHaveScoringOverrides(domains)).toBe(true);
    });

    it('save path persists Inherited targets without a scoring key and keeps catalog', () => {
        const dense = packWithDomains([
            {
                domain_id: 'A',
                title: 'Domain A',
                targets: [
                    numericTarget('A1', [0, 1, 2, 3, 4]),
                    numericTarget('A2', [0, 1]),
                ],
            },
        ]);
        dense.scoring_scales = [
            {
                scale_id: 'unused',
                title: 'Unused',
                type: 'numeric',
                scale: [0, 1],
            },
        ];

        const migrated = migrateLegacyPackToCanonical(dense);
        expect(migrated.scoring_mode).toBe('custom');
        expect(migrated.domains[0].targets[0].scoring).toBeUndefined();
        expect(migrated.domains[0].targets[1].scoring?.scale).toEqual([0, 1]);

        const saved = normalizePackIdentifiers(normalizeCanonicalPackForSave(migrated));
        expect(saved.scoring_scales?.[0].scale_id).toBe('unused');
        expect(saved.domains[0].targets[0]).not.toHaveProperty('scoring');
        expect(saved.domains[0].targets[1].scoring?.scale).toEqual([0, 1]);
        expect(
            effectiveScoringEquals(
                resolveEffectiveScoring(dense.domains[0].targets[0], dense),
                resolveEffectiveScoring(saved.domains[0].targets[0], saved)
            )
        ).toBe(true);
    });
});

describe('AssessmentBuilder C1 editing session contracts', () => {
    it('uses session snapshot module for dirty detection (not buildReportProfile or counters)', () => {
        expect(builderSource).toContain('buildBuilderSessionSnapshot');
        expect(builderSource).toContain('builderSessionSnapshotsEqual');
        expect(builderSource).toContain('baselineSnapshotRef');
        expect(builderSource).not.toMatch(/dirtyChangeCount|setIsDirty\(/);
    });

    it('gates Cancel behind confirm when dirty and never calls packService from Builder', () => {
        expect(builderSource).toContain('handleCancelClick');
        expect(builderSource).toContain('cancelConfirmOpen');
        expect(builderSource).toContain('Discard unsaved changes');
        expect(builderSource).not.toContain('packService');
    });

    it('registers beforeunload only while dirty', () => {
        expect(builderSource).toContain("addEventListener('beforeunload'");
        expect(builderSource).toMatch(/if \(!isDirty\)[\s\S]*return;/);
    });

    it('exposes onSessionChange for parent navigation guard wiring', () => {
        expect(builderSource).toContain('onSessionChange?.({ isDirty })');
    });

    it('updates baseline snapshot after successful save without removing B3 normalize path', () => {
        expect(builderSource).toContain('baselineSnapshotRef.current = buildBuilderSessionSnapshot');
        expect(builderSource).toContain('normalizeCanonicalPackForSave');
        expect(builderSource).toContain('seedBuilderWorkingPack');
    });

    it('renders clickable validation summary issues with scroll/focus helper', () => {
        expect(builderSource).toContain('focusBuilderIssueAnchor');
        expect(builderSource).toContain('builder-issue-title');
        expect(builderSource).toContain('builder-issue-default_scale');
    });

    it('reveals Advanced pack settings when validation targets a field inside it', () => {
        expect(builderSource).toContain('revealBuilderIssueAnchor');
        expect(builderSource).toMatch(
            /if \(mergedIssues\.length > 0\)[\s\S]*revealBuilderIssueAnchor\(issue\)[\s\S]*return;/
        );
        expect(builderSource).toContain('onClick={() => focusBuilderIssueAnchor(issue)}');
        expect(builderSource).not.toMatch(/<details[^>]*\sopen=\{/);
    });

    it('blocks save on validation issues without clearing working copy state', () => {
        expect(builderSource).toMatch(/if \(mergedIssues\.length > 0\)[\s\S]*return;/);
        expect(builderSource).toContain('setAuthoringIssues(mergedIssues)');
    });

    it('uses e.g. placeholders for empty IDs and surfaces missing IDs in the form', () => {
        expect(builderSource).toContain('placeholder="e.g., A"');
        expect(builderSource).not.toMatch(/placeholder="A"/);
        expect(builderSource).toMatch(/placeholder="e.g., A"\s*\/>/);
        expect(builderSource).toContain('issueFor(\'domain_id\'');
    });

    it('pluralizes structure-label chrome as a single string', () => {
        expect(builderSource).toContain('pluralizeStructureLabel(primaryLabel)');
        expect(builderSource).not.toContain('{primaryLabel}s');
        expect(builderSource).not.toContain('{targetLabelText}s');
    });
});
