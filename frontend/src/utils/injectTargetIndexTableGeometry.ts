/**
 * Inject Target Index table geometry into the live document.
 *
 * Static `index.css` cannot import TypeScript-generated CSS. The shared emit
 * path is {@link buildTargetIndexTableColumnCss}; this module and
 * SNAPSHOT_EXPORT_INLINE_CSS both consume it so column % / padding cannot
 * drift from the planner.
 */
import { buildTargetIndexTableColumnCss } from './snapshotTargetIndexColumns';

export const TARGET_INDEX_GEOMETRY_STYLE_ID =
    'assessment-snapshot-target-index-geometry';

export function ensureTargetIndexTableGeometryStyles(): void {
    if (typeof document === 'undefined') {
        return;
    }
    if (document.getElementById(TARGET_INDEX_GEOMETRY_STYLE_ID)) {
        return;
    }
    const style = document.createElement('style');
    style.id = TARGET_INDEX_GEOMETRY_STYLE_ID;
    style.setAttribute('data-assessment-snapshot-target-index-geometry', 'true');
    style.textContent = buildTargetIndexTableColumnCss();
    document.head.appendChild(style);
}

ensureTargetIndexTableGeometryStyles();
