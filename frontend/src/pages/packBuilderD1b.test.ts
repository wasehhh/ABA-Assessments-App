import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const contentPacksSource = readFileSync(resolve(__dirname, './ContentPacks.tsx'), 'utf8');
const builderSource = readFileSync(
    resolve(__dirname, '../components/AssessmentBuilder.tsx'),
    'utf8'
);
const targetEditorSource = readFileSync(
    resolve(__dirname, '../components/AssessmentBuilderTargetEditor.tsx'),
    'utf8'
);
const guardSource = readFileSync(
    resolve(__dirname, '../context/AssessmentBuilderNavigationGuard.tsx'),
    'utf8'
);

function filledAccentClassNames(source: string): string[] {
    return source.match(/className="[^"]*\bbg-(green|emerald|blue)-600\b[^"]*"/g) ?? [];
}

function sliceBetween(source: string, startMarker: string, endMarker: string): string {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
}

describe('D1b B2 authoring order', () => {
    it('places Advanced pack settings below the title band and above domains, collapsed by default', () => {
        const titleIdx = builderSource.indexOf('data-builder-title-block');
        const advancedIdx = builderSource.indexOf('data-builder-advanced-pack-settings');
        const domainsIdx = builderSource.indexOf('data-builder-domains-block');
        expect(titleIdx).toBeGreaterThan(-1);
        expect(titleIdx).toBeLessThan(advancedIdx);
        expect(advancedIdx).toBeLessThan(domainsIdx);

        const detailsTag = builderSource.match(
            /<details\s+data-builder-advanced-pack-settings[^>]*>/
        );
        expect(detailsTag?.[0]).toBeDefined();
        expect(detailsTag?.[0]).not.toMatch(/\bopen\b/);
        expect(builderSource).toMatch(
            /<summary[^>]*>\s*Advanced pack settings\s*<\/summary>/
        );
    });

    it('relocates structure labels, scoring mode, default scale, and score criteria into Advanced', () => {
        const advancedBlock = sliceBetween(
            builderSource,
            'data-builder-advanced-pack-settings',
            'data-builder-domains-block'
        );
        expect(advancedBlock).toContain('Structure Labels');
        expect(advancedBlock).toContain('id="useGlobalScale"');
        expect(advancedBlock).toContain('Default Scoring Scale');
        expect(advancedBlock).toContain('Score Criteria Definitions');
        expect(advancedBlock).toContain('Download CSV Template');

        const titleBlock = sliceBetween(
            builderSource,
            'data-builder-title-block',
            'data-builder-advanced-pack-settings'
        );
        expect(titleBlock).toContain('Assessment Title');
        expect(titleBlock).not.toContain('Structure Labels');
        expect(titleBlock).not.toContain('Score Criteria Definitions');

        const domainsBlock = builderSource.slice(
            builderSource.indexOf('data-builder-domains-block')
        );
        expect(domainsBlock).not.toContain('Structure Labels');
        expect(domainsBlock).not.toContain('Score Criteria Definitions');
        expect(domainsBlock).not.toContain('id="useGlobalScale"');
    });

    it('keeps scoring-mode behaviour and Custom→Uniform confirm inside Advanced unchanged', () => {
        const advancedBlock = sliceBetween(
            builderSource,
            'data-builder-advanced-pack-settings',
            'data-builder-domains-block'
        );
        expect(advancedBlock).toContain(
            'onChange={(e) => requestScoringModeChange(e.target.checked)}'
        );
        expect(builderSource).toContain('const requestScoringModeChange');
        expect(builderSource).toContain('const confirmSwitchToUniform');
        expect(builderSource).toContain('clearAllTargetScoringOverrides');
        expect(builderSource).toContain('setScoringMode(\'custom\')');
        expect(builderSource).toContain('setScoringMode(\'uniform\')');
        expect(builderSource).toContain('title="Switch to same scale for all targets?"');
        expect(builderSource).toContain('isOpen={uniformConfirmOpen}');
        expect(builderSource).toContain('onConfirm={confirmSwitchToUniform}');
    });

    it('puts the only Advanced-hosted validation anchor, default_scale, inside the collapsed disclosure', () => {
        const advancedBlock = sliceBetween(
            builderSource,
            'data-builder-advanced-pack-settings',
            'data-builder-domains-block'
        );
        expect(advancedBlock).toContain('id="builder-issue-default_scale"');
        const titleBlock = sliceBetween(
            builderSource,
            'data-builder-title-block',
            'data-builder-advanced-pack-settings'
        );
        expect(titleBlock).toContain('id="builder-issue-title"');
        expect(titleBlock).not.toContain('builder-issue-default_scale');
    });
});

describe('D1b B5 control hierarchy', () => {
    it('makes Add Domain and Add Target peers in secondary styling', () => {
        expect(builderSource.match(/className=\{BUILDER_SECONDARY_ADD_CLASS\}/g)?.length).toBe(
            3
        );
        expect(builderSource).not.toContain('bg-emerald-600 hover:bg-emerald-700 text-white');
        expect(builderSource).toContain('Add {primaryLabel}');
        expect(builderSource).toContain('Add {targetLabelText}');
        expect(builderSource).toContain(
            'className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"'
        );
        expect(builderSource).toContain('Add {secondaryLabel}');
    });

    it('exposes accessible names on delete controls naming what they remove', () => {
        expect(builderSource).toContain('Remove {primaryLabel}');
        expect(builderSource).toContain(
            'aria-label={`Remove ${primaryLabel} ${domain.title || dIndex + 1}`}'
        );
        expect(builderSource).toContain('Remove {secondaryLabel}');
        expect(builderSource).toContain(
            'aria-label={`Remove ${secondaryLabel} ${group.title || groupIndex + 1}`}'
        );
        expect(targetEditorSource).toContain('Remove {targetLabelText}');
        expect(targetEditorSource).toContain(
            'aria-label={`Remove ${targetLabelText} ${target.title || target.target_id || targetIndex + 1}`}'
        );
        expect(targetEditorSource).toContain('text-red-600');
        expect(builderSource).toContain('text-red-600');
    });
});

describe('D1b B6 create paths and single-primary', () => {
    it('makes Build Custom the sole filled accent on #/packs', () => {
        const accents = filledAccentClassNames(contentPacksSource);
        expect(accents).toHaveLength(1);
        expect(accents[0]).toContain('bg-green-600');
        expect(contentPacksSource).toContain('Build Custom');
        expect(contentPacksSource).toContain(
            'className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"'
        );
        expect(contentPacksSource).toContain(
            'className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 hover:bg-gray-50"'
        );
        expect(contentPacksSource).not.toContain('bg-blue-600');
        expect(contentPacksSource).not.toContain('Download CSV Template');
    });

    it('makes Save the sole filled accent on builder routes', () => {
        const accents = filledAccentClassNames(builderSource);
        expect(accents).toHaveLength(1);
        expect(accents[0]).toContain('bg-green-600');
        expect(builderSource).toContain('Save Assessment Pack');
        expect(builderSource).toContain('form={formId}');
        expect(builderSource).not.toContain('flex-1 bg-green-600');
        expect(builderSource).toContain('underline hover:text-gray-900');
        expect(builderSource).toContain('Download CSV Template');
    });
});

describe('D1b B7 remaining flow-name copy', () => {
    it('uses Pack Builder in user-facing discard copy, not Assessment Builder', () => {
        expect(guardSource).toContain(
            'You have unsaved changes in the Pack Builder. Discard them and leave this session?'
        );
        expect(guardSource).not.toContain('Assessment Builder');
        expect(builderSource).not.toContain('Build Custom Assessment');
        expect(builderSource).not.toContain('Assessment Builder');
        expect(contentPacksSource).not.toContain('Build Custom Assessment');
        expect(contentPacksSource).not.toContain('Assessment Builder');
    });
});
