import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const contentPacksSource = readFileSync(
    resolve(__dirname, './ContentPacks.tsx'),
    'utf8'
);
const builderSource = readFileSync(
    resolve(__dirname, '../components/AssessmentBuilder.tsx'),
    'utf8'
);

describe('ContentPacks save conflict detection (PR C1b)', () => {
    it('routes edit saves through updateIfRevisionMatches with session-open revision', () => {
        expect(contentPacksSource).toContain('updateIfRevisionMatches');
        expect(contentPacksSource).toContain('sessionOpenedAtRevisionRef');
        expect(contentPacksSource).toContain('editingPack.updated_at');
        expect(contentPacksSource).not.toMatch(
            /if \(editingPack\)[\s\S]*packService\.update\(editingPack\.id/
        );
    });

    it('shows Reload-only conflict dialog and does not close builder on conflict', () => {
        expect(contentPacksSource).toContain('This pack was changed by someone else.');
        expect(contentPacksSource).toContain('confirmText="Reload"');
        expect(contentPacksSource).toContain('variant="alert"');
        expect(contentPacksSource).not.toContain('Overwrite');
        expect(contentPacksSource).toMatch(
            /if \(!result\.ok\)[\s\S]*setConflictDialogOpen\(true\)[\s\S]*return;/
        );
    });

    it('reloads from server by refetching pack and remounting Builder', () => {
        expect(contentPacksSource).toContain('reloadEditingPackFromServer');
        expect(contentPacksSource).toContain('packService.getById(editingPack.id)');
        expect(contentPacksSource).toContain('setBuilderRemountKey');
        expect(contentPacksSource).toContain('key={`${editingPack?.id ?? \'new\'}-${builderRemountKey}`}');
    });

    it('passes session revision metadata into AssessmentBuilder', () => {
        expect(contentPacksSource).toContain('sessionOpenedAtRevision={sessionOpenedAtRevisionRef.current');
        expect(builderSource).toContain('sessionOpenedAtRevision?: string');
        expect(builderSource).toContain('packId?: string');
    });
});
