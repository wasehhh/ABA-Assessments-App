/**
 * Per-assessment "Show scores" preference for Assessment Snapshot beads.
 * Follows the PHI acknowledgement sessionStorage pattern (prefix + assessment id).
 * Default is checked (numerals visible) — higher-fidelity evidence record.
 */

export const SNAPSHOT_SHOW_SCORES_STORAGE_PREFIX = 'snapshot-show-scores:';

export const SNAPSHOT_SHOW_SCORES_STORED_ON = '1';
export const SNAPSHOT_SHOW_SCORES_STORED_OFF = '0';

export function snapshotShowScoresStorageKey(assessmentId: string): string {
    return `${SNAPSHOT_SHOW_SCORES_STORAGE_PREFIX}${assessmentId}`;
}

/** Missing or unreadable storage → numerals shown (product default). */
export function readSnapshotShowScores(assessmentId: string): boolean {
    try {
        return (
            sessionStorage.getItem(snapshotShowScoresStorageKey(assessmentId)) !==
            SNAPSHOT_SHOW_SCORES_STORED_OFF
        );
    } catch {
        return true;
    }
}

export function writeSnapshotShowScores(assessmentId: string, showScores: boolean): void {
    try {
        sessionStorage.setItem(
            snapshotShowScoresStorageKey(assessmentId),
            showScores ? SNAPSHOT_SHOW_SCORES_STORED_ON : SNAPSHOT_SHOW_SCORES_STORED_OFF
        );
    } catch {
        // sessionStorage may be unavailable; in-memory UI state still applies on this page.
    }
}
