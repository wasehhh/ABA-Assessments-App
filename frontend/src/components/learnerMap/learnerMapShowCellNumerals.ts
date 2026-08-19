/**
 * Per-assessment "Show cell numerals" preference for Learner Map grid cells.
 * Follows the Snapshot bead-numeral sessionStorage pattern with a distinct namespace.
 * Default is off — competency colour and movement markers are the interpretive payload.
 */

export const LEARNER_MAP_SHOW_CELL_NUMERALS_STORAGE_PREFIX = 'learner-map-show-cell-numerals:';

export const LEARNER_MAP_SHOW_CELL_NUMERALS_STORED_ON = '1';
export const LEARNER_MAP_SHOW_CELL_NUMERALS_STORED_OFF = '0';

export const LEARNER_MAP_CELL_NUMERALS_HINT_HIDDEN =
    'Cell numerals visually suppressed — scores remain in this document.';

export function learnerMapShowCellNumeralsStorageKey(assessmentId: string): string {
    return `${LEARNER_MAP_SHOW_CELL_NUMERALS_STORAGE_PREFIX}${assessmentId}`;
}

/** Missing or unreadable storage → numerals hidden (product default for movement view). */
export function readLearnerMapShowCellNumerals(assessmentId: string): boolean {
    try {
        return (
            sessionStorage.getItem(learnerMapShowCellNumeralsStorageKey(assessmentId)) ===
            LEARNER_MAP_SHOW_CELL_NUMERALS_STORED_ON
        );
    } catch {
        return false;
    }
}

export function writeLearnerMapShowCellNumerals(
    assessmentId: string,
    showCellNumerals: boolean
): void {
    try {
        sessionStorage.setItem(
            learnerMapShowCellNumeralsStorageKey(assessmentId),
            showCellNumerals
                ? LEARNER_MAP_SHOW_CELL_NUMERALS_STORED_ON
                : LEARNER_MAP_SHOW_CELL_NUMERALS_STORED_OFF
        );
    } catch {
        // sessionStorage may be unavailable; in-memory UI state still applies on this page.
    }
}
