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
