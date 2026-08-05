/**
 * Snapshot export mode — PR14A: `full` only.
 * Unknown / absent URL modes coerce to `full` (never to a partial mode).
 */

export type SnapshotExportMode = 'full';

export interface SnapshotExportState {
    exportMode: SnapshotExportMode;
}

export const DEFAULT_SNAPSHOT_EXPORT_STATE: SnapshotExportState = {
    exportMode: 'full',
};

export function isSnapshotExportMode(value: string | null | undefined): value is SnapshotExportMode {
    return value === 'full';
}

/** Coerce any mode param to the only lawful PR14A value. */
export function coerceSnapshotExportMode(
    _value: string | null | undefined
): SnapshotExportMode {
    return 'full';
}
