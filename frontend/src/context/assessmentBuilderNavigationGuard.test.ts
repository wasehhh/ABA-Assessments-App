import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const contentPacksSource = readFileSync(
    resolve(__dirname, '../pages/ContentPacks.tsx'),
    'utf8'
);
const layoutSource = readFileSync(resolve(__dirname, '../components/Layout.tsx'), 'utf8');
const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');

describe('Assessment Builder navigation guard wiring', () => {
    it('registers blocking state from ContentPacks when builder is dirty', () => {
        expect(contentPacksSource).toContain('useAssessmentBuilderNavigationGuard');
        expect(contentPacksSource).toContain('onSessionChange={handleBuilderSessionChange}');
        expect(contentPacksSource).toContain('navigationGuard.setBlocking(showBuilder && builderDirty)');
        expect(contentPacksSource).toContain('requestBuilderSessionAction');
    });

    it('guards pack switching and new-builder actions while dirty', () => {
        expect(contentPacksSource).toContain('requestBuilderSessionAction(() => {');
        expect(contentPacksSource).toContain('openNewBuilder');
        expect(contentPacksSource).toContain('openUploadForm');
    });

    it('routes Layout navigation through guarded hash API', () => {
        expect(layoutSource).toContain('navigateWithOptionalGuard');
        expect(layoutSource).not.toMatch(/window\.location\.hash = '#\/dashboard'/);
    });

    it('wraps authenticated router with navigation guard provider and reactive hash interception', () => {
        expect(appSource).toContain('AssessmentBuilderNavigationGuardProvider');
        expect(appSource).toContain('history.replaceState');
        expect(appSource).toContain('navigationGuard.requestNavigation');
    });
});
