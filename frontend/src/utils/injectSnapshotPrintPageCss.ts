/**
 * Inject Snapshot named `@page` geometry into the live document.
 *
 * Static `index.css` cannot import TypeScript constants. Emission lives in
 * {@link buildSnapshotPrintPageCss} so margin / usable height cannot drift from
 * {@link PRINT_PAGE_MARGIN_REM}.
 */
import { buildSnapshotPrintPageCss } from './snapshotPrintPageProfile';

export const SNAPSHOT_PRINT_PAGE_STYLE_ID = 'assessment-snapshot-print-page';

export function ensureSnapshotPrintPageStyles(): void {
    if (typeof document === 'undefined') {
        return;
    }
    if (document.getElementById(SNAPSHOT_PRINT_PAGE_STYLE_ID)) {
        return;
    }
    const style = document.createElement('style');
    style.id = SNAPSHOT_PRINT_PAGE_STYLE_ID;
    style.setAttribute('data-assessment-snapshot-print-page', 'true');
    style.textContent = buildSnapshotPrintPageCss();
    document.head.appendChild(style);
}

ensureSnapshotPrintPageStyles();
