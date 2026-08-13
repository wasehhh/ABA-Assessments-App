/**
 * Clinician-facing export chrome copy (§5.5 honesty under cycle scope).
 * Kept outside the route page so honesty tests do not mount the full export route.
 */

/** Complete-scope export page chrome. Visually approved; do not alter casually. */
export const SNAPSHOT_EXPORT_PAGE_INTRO_COMPLETE =
    'Full evidence record — every domain, target, and cycle from the frozen pack snapshot. Preview matches the HTML channel (screen layout).';

/**
 * Partial-scope export page chrome. Domains/targets remain complete; cycles follow
 * Snapshot selection. Does not restate the cycle list (header Cycles field carries it).
 */
export const SNAPSHOT_EXPORT_PAGE_INTRO_PARTIAL =
    'Full evidence record — every domain and target from the frozen pack snapshot for the cycles currently selected on Snapshot. Preview matches the HTML channel (screen layout).';

/** Page intro paragraph — same placement/tone under both scopes; not a banner. */
export function SnapshotExportPageIntro({
    isPartialCycleScope,
}: {
    isPartialCycleScope: boolean;
}) {
    return (
        <p
            className="mt-1 text-sm text-gray-600"
            data-snapshot-export-page-intro={isPartialCycleScope ? 'partial' : 'complete'}
        >
            {isPartialCycleScope
                ? SNAPSHOT_EXPORT_PAGE_INTRO_PARTIAL
                : SNAPSHOT_EXPORT_PAGE_INTRO_COMPLETE}
        </p>
    );
}
