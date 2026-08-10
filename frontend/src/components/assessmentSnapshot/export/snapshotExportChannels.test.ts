import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    HTML_CHANNEL_BUTTON_LABEL,
    PDF_CHANNEL_BUTTON_LABEL,
} from '../../../pages/AssessmentSnapshotExport';
import { SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM } from '../../../utils/snapshotLayoutEngine';
import { SNAPSHOT_HTML_EXPORT_VIEWPORT_REM } from './snapshotExportHtml';

describe('Snapshot export page channels (PR14B)', () => {
    it('offers exactly two channel actions with OQ-6 placeholder labels', () => {
        const source = readFileSync(
            resolve(__dirname, '../../../pages/AssessmentSnapshotExport.tsx'),
            'utf8'
        );

        expect(HTML_CHANNEL_BUTTON_LABEL).toBe('HTML');
        expect(PDF_CHANNEL_BUTTON_LABEL).toBe('PDF');
        expect(source).toContain('data-snapshot-export-action="html"');
        expect(source).toContain('data-snapshot-export-action="pdf"');
        expect(source).toContain('HTML_CHANNEL_BUTTON_LABEL');
        expect(source).toContain('PDF_CHANNEL_BUTTON_LABEL');
        // No third Print control on the export page.
        expect(source).not.toMatch(/data-snapshot-export-action=["']print["']/);
        expect(source).not.toContain('Print / Save PDF');
        expect(source).not.toMatch(/>\s*Print\s*</);
    });

    it('freezes HTML export viewport at the shared screen default', () => {
        expect(SNAPSHOT_HTML_EXPORT_VIEWPORT_REM).toBe(96);
        expect(SNAPSHOT_HTML_EXPORT_VIEWPORT_REM).toBe(SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM);
    });
});
