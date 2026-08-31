import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    PACKS_LIST_HASH,
    PACK_BUILDER_NEW_HASH,
    packBuilderEditHash,
    resolvePacksLocation,
} from './packBuilderRoutes';

const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const contentPacksSource = readFileSync(resolve(__dirname, './ContentPacks.tsx'), 'utf8');
const packBuilderSource = readFileSync(resolve(__dirname, './PackBuilder.tsx'), 'utf8');
const builderSource = readFileSync(
    resolve(__dirname, '../components/AssessmentBuilder.tsx'),
    'utf8'
);
const layoutSource = readFileSync(resolve(__dirname, '../components/Layout.tsx'), 'utf8');
const guardSource = readFileSync(
    resolve(__dirname, '../context/AssessmentBuilderNavigationGuard.tsx'),
    'utf8'
);

describe('resolvePacksLocation D1a routes', () => {
    it('mounts the builder on #/packs/build and #/packs/build/:packId, not on #/packs', () => {
        expect(resolvePacksLocation('#/packs')).toEqual({ kind: 'list' });
        expect(resolvePacksLocation('#/packs/build')).toEqual({ kind: 'builder-new' });
        expect(resolvePacksLocation('#/packs/build/abc-123')).toEqual({
            kind: 'builder-edit',
            packId: 'abc-123',
        });
        expect(resolvePacksLocation('#/packs?tab=archived')).toEqual({ kind: 'list' });
        expect(resolvePacksLocation('#/assessments')).toEqual({ kind: 'unrelated' });
    });

    it('wires App.tsx so the list route never mounts AssessmentBuilder', () => {
        expect(appSource).toContain('resolvePacksLocation');
        expect(appSource).toContain('<PackBuilder />');
        expect(appSource).toContain('<PackBuilder packId={packsLocation.packId} />');
        expect(contentPacksSource).not.toContain("from '../components/AssessmentBuilder'");
        expect(contentPacksSource).not.toContain('<AssessmentBuilder');
        expect(contentPacksSource).not.toContain('showBuilder');
        expect(contentPacksSource).toContain('Content Packs');
        expect(contentPacksSource).not.toContain('Pack Builder');
    });
});

describe('D1a Phase C guards on builder routes', () => {
    it('registers blocking on builder route mounted + dirty, not list showBuilder', () => {
        expect(packBuilderSource).toContain('navigationGuard.setBlocking(builderDirty)');
        expect(packBuilderSource).toContain('return () => navigationGuard.setBlocking(false)');
        expect(contentPacksSource).not.toContain('setBlocking');
        expect(contentPacksSource).not.toContain('showBuilder && builderDirty');
    });

    it('keeps beforeunload on AssessmentBuilder when dirty', () => {
        expect(builderSource).toContain("addEventListener('beforeunload'");
        expect(builderSource).toMatch(/if \(!isDirty\)[\s\S]*return;/);
        expect(builderSource).toContain("removeEventListener('beforeunload'");
    });

    it('keeps Layout in-app nav on requestNavigation', () => {
        expect(layoutSource).toContain('navigateWithOptionalGuard');
        expect(layoutSource).toContain("navigate('#/packs')");
        expect(layoutSource).not.toMatch(/window\.location\.hash = '#\/dashboard'/);
    });

    it('keeps Sign Out on requestLocalAction when blocking', () => {
        expect(layoutSource).toContain('requestLocalAction');
        expect(layoutSource).toMatch(
            /navigationGuard\?\.isBlocking[\s\S]*requestLocalAction\(\(\) => \{[\s\S]*performSignOut/
        );
    });

    it('keeps login redirect on requestNavigation when blocking', () => {
        expect(appSource).toContain("navigationGuard.requestNavigation('#/login')");
    });

    it('keeps browser back/forward hash revert + requestNavigation', () => {
        expect(appSource).toContain('history.replaceState');
        expect(appSource).toContain('navigationGuard.requestNavigation');
        expect(guardSource).toContain('requestNavigation');
    });

    it('gates Cancel with confirm and lands on #/packs', () => {
        expect(builderSource).toContain('handleCancelClick');
        expect(builderSource).toContain('cancelConfirmOpen');
        expect(builderSource).toContain('Discard unsaved changes');
        expect(builderSource).toMatch(/if \(!isDirty\)[\s\S]*onCancel\(\)/);
        expect(packBuilderSource).toContain('onCancel={leaveBuilder}');
        expect(packBuilderSource).toContain('PACKS_LIST_HASH');
        expect(packBuilderSource).toContain("window.location.hash = PACKS_LIST_HASH");
    });

    it('navigates to #/packs on save success', () => {
        expect(packBuilderSource).toMatch(
            /if \(!result\.ok\)[\s\S]*setConflictDialogOpen\(true\)[\s\S]*return;[\s\S]*goToPacksList\(\)/
        );
        expect(packBuilderSource).toMatch(
            /await packService\.upload\([\s\S]*goToPacksList\(\)/
        );
        expect(PACKS_LIST_HASH).toBe('#/packs');
    });

    it('uses requestNavigation for list ↔ builder and switching packId', () => {
        expect(contentPacksSource).toContain('requestNavigation(PACK_BUILDER_NEW_HASH)');
        expect(contentPacksSource).toContain('requestNavigation(packBuilderEditHash(pack.id))');
        expect(contentPacksSource).not.toContain('requestLocalAction');
        expect(contentPacksSource).not.toContain('requestBuilderSessionAction');
        expect(PACK_BUILDER_NEW_HASH).toBe('#/packs/build');
        expect(packBuilderEditHash('other-id')).toBe('#/packs/build/other-id');
    });

    it('keeps upload toggle list-only', () => {
        expect(contentPacksSource).toContain('const openUploadForm = () => {');
        expect(contentPacksSource).toMatch(/openUploadForm = \(\) => \{\s*setShowForm\(!showForm\);/);
        expect(packBuilderSource).not.toContain('showForm');
        expect(packBuilderSource).not.toContain('Upload Pack');
    });

    it('blocks save when revision is missing with the existing message', () => {
        expect(packBuilderSource).toContain(
            'Cannot save — pack revision is missing. Reload the page and try again.'
        );
    });
});

describe('D1a builder chrome and naming', () => {
    it('uses H1 Pack Builder on builder routes and removes H2 and info-box title', () => {
        expect(builderSource).toContain('>Pack Builder</h1>');
        expect(builderSource).not.toContain('Build Custom Assessment');
        expect(builderSource).not.toContain('Assessment Builder');
        expect(builderSource).toContain('data-pack-builder-sticky-chrome');
        expect(builderSource).toContain('Save Assessment Pack');
        expect(builderSource).toContain('form={formId}');
        expect(builderSource).not.toContain('flex-1 bg-green-600');
        expect(builderSource).toContain('data-builder-dirty-indicator');
        expect(builderSource).toContain('Unsaved changes');
        expect(packBuilderSource).toContain('sessionSubtitle={sessionSubtitle}');
        expect(packBuilderSource).toContain("'New pack'");
        expect(packBuilderSource).toContain('Editing: ${editingPack.title}');
    });
});
