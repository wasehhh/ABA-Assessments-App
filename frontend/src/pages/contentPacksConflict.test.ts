import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packBuilderSource = readFileSync(resolve(__dirname, './PackBuilder.tsx'), 'utf8');
const builderSource = readFileSync(
    resolve(__dirname, '../components/AssessmentBuilder.tsx'),
    'utf8'
);

describe('ContentPacks save conflict detection (PR C1b)', () => {
    it('routes edit saves through updateIfRevisionMatches with session-open revision', () => {
        expect(packBuilderSource).toContain('updateIfRevisionMatches');
        expect(packBuilderSource).toContain('sessionOpenedAtRevisionRef');
        expect(packBuilderSource).toContain('editingPack.updated_at');
        expect(packBuilderSource).not.toMatch(
            /if \(editingPack\)[\s\S]*packService\.update\(editingPack\.id/
        );
    });

    it('shows Reload-only conflict dialog and does not close builder on conflict', () => {
        expect(packBuilderSource).toContain('This pack was changed by someone else.');
        expect(packBuilderSource).toContain('confirmText="Reload"');
        expect(packBuilderSource).toContain('variant="alert"');
        expect(packBuilderSource).not.toContain('Overwrite');
        expect(packBuilderSource).toMatch(
            /if \(!result\.ok\)[\s\S]*setConflictDialogOpen\(true\)[\s\S]*return;/
        );
    });

    it('reloads from server by refetching pack and remounting Builder', () => {
        expect(packBuilderSource).toContain('reloadEditingPackFromServer');
        expect(packBuilderSource).toContain('packService.getById(editingPack.id)');
        expect(packBuilderSource).toContain('setBuilderRemountKey');
        expect(packBuilderSource).toContain('key={`${editingPack?.id ?? \'new\'}-${builderRemountKey}`}');
    });

    it('passes session revision metadata into AssessmentBuilder', () => {
        expect(packBuilderSource).toContain('sessionOpenedAtRevision={sessionOpenedAtRevisionRef.current');
        expect(builderSource).toContain('sessionOpenedAtRevision?: string');
        expect(builderSource).toContain('packId?: string');
    });
});
