import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    SNAPSHOT_EXPORT_DIALOG_BODY_COMPLETE,
    SNAPSHOT_EXPORT_DIALOG_BODY_PARTIAL,
    SnapshotExportDialog,
} from './SnapshotExportDialog';
import {
    SNAPSHOT_EXPORT_PAGE_INTRO_COMPLETE,
    SNAPSHOT_EXPORT_PAGE_INTRO_PARTIAL,
    SnapshotExportPageIntro,
} from './snapshotExportChromeCopy';

/**
 * §5.5 honesty — dialog and export-page chrome must not claim every cycle under partial scope.
 * Covers both sites that previously diverged (dialog branched; page did not).
 */
describe('snapshot export completeness copy (§5.5)', () => {
    it('under complete scope, dialog and page retain completeness claims', () => {
        expect(SNAPSHOT_EXPORT_DIALOG_BODY_COMPLETE).toContain(
            'always includes every domain, target, and cycle'
        );
        expect(SNAPSHOT_EXPORT_PAGE_INTRO_COMPLETE).toBe(
            'Full evidence record — every domain, target, and cycle from the frozen pack snapshot. Preview matches the HTML channel (screen layout).'
        );

        const dialog = renderToStaticMarkup(
            createElement(SnapshotExportDialog, {
                isOpen: true,
                assessmentId: 'assess-1',
                onClose: vi.fn(),
                isPartialCycleScope: false,
            })
        );
        const page = renderToStaticMarkup(
            createElement(SnapshotExportPageIntro, { isPartialCycleScope: false })
        );

        expect(dialog).toContain(SNAPSHOT_EXPORT_DIALOG_BODY_COMPLETE);
        expect(dialog).toContain('data-snapshot-export-dialog-body="complete"');
        expect(page).toContain(SNAPSHOT_EXPORT_PAGE_INTRO_COMPLETE);
        expect(page).toContain('data-snapshot-export-page-intro="complete"');
    });

    it('under partial scope, neither dialog nor page claims every cycle is included', () => {
        const cycleCompletenessClaims = [
            /every domain,\s*target,\s*and cycle/i,
            /always includes every domain, target, and cycle/i,
            /every domain, target, and cycle from the/i,
            /and cycle from the frozen pack/i,
        ];

        expect(SNAPSHOT_EXPORT_DIALOG_BODY_PARTIAL).toMatch(/every domain and target/i);
        expect(SNAPSHOT_EXPORT_DIALOG_BODY_PARTIAL).not.toMatch(/every cycle/i);
        expect(SNAPSHOT_EXPORT_DIALOG_BODY_PARTIAL).not.toMatch(/always includes/i);

        expect(SNAPSHOT_EXPORT_PAGE_INTRO_PARTIAL).toMatch(/every domain and target/i);
        expect(SNAPSHOT_EXPORT_PAGE_INTRO_PARTIAL).toContain(
            'Preview matches the HTML channel (screen layout).'
        );
        expect(SNAPSHOT_EXPORT_PAGE_INTRO_PARTIAL).not.toMatch(/every cycle/i);
        expect(SNAPSHOT_EXPORT_PAGE_INTRO_PARTIAL).not.toContain(', and cycle');

        const dialog = renderToStaticMarkup(
            createElement(SnapshotExportDialog, {
                isOpen: true,
                assessmentId: 'assess-1',
                onClose: vi.fn(),
                isPartialCycleScope: true,
            })
        );
        const page = renderToStaticMarkup(
            createElement(SnapshotExportPageIntro, { isPartialCycleScope: true })
        );

        expect(dialog).toContain(SNAPSHOT_EXPORT_DIALOG_BODY_PARTIAL);
        expect(dialog).toContain('data-snapshot-export-dialog-body="partial"');
        expect(page).toContain(SNAPSHOT_EXPORT_PAGE_INTRO_PARTIAL);
        expect(page).toContain('data-snapshot-export-page-intro="partial"');

        for (const claim of cycleCompletenessClaims) {
            expect(dialog).not.toMatch(claim);
            expect(page).not.toMatch(claim);
        }
    });
});
