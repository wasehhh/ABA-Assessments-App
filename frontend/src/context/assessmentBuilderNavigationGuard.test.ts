import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const contentPacksSource = readFileSync(
    resolve(__dirname, '../pages/ContentPacks.tsx'),
    'utf8'
);
const packBuilderSource = readFileSync(
    resolve(__dirname, '../pages/PackBuilder.tsx'),
    'utf8'
);
const layoutSource = readFileSync(resolve(__dirname, '../components/Layout.tsx'), 'utf8');
const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');

describe('Assessment Builder navigation guard wiring', () => {
    it('registers blocking state from PackBuilder when the builder session is dirty', () => {
        expect(packBuilderSource).toContain('useAssessmentBuilderNavigationGuard');
        expect(packBuilderSource).toContain('onSessionChange={handleBuilderSessionChange}');
        expect(packBuilderSource).toContain('navigationGuard.setBlocking(builderDirty)');
        expect(contentPacksSource).not.toContain('setBlocking');
    });

    it('guards new-builder and edit-pack as requestNavigation between hashes', () => {
        expect(contentPacksSource).toContain('openNewBuilder');
        expect(contentPacksSource).toContain('requestNavigation(PACK_BUILDER_NEW_HASH)');
        expect(contentPacksSource).toContain('requestNavigation(packBuilderEditHash(pack.id))');
        expect(contentPacksSource).toContain('openUploadForm');
        expect(contentPacksSource).not.toContain('requestLocalAction');
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
