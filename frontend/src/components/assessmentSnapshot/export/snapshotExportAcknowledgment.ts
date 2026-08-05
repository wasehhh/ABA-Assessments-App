import {
    hasClinicalExportAcknowledged,
    isClinicalExportAcknowledged,
    clinicalExportAckStorageKey,
    setClinicalExportAcknowledged,
    requiresClinicalExportAcknowledgment,
} from '../../../clinicalExport/clinicalExportAcknowledgment';
import { SnapshotExportMode } from './snapshotExportMode';

const SNAPSHOT_ARTIFACT = 'snapshot' as const;

export function snapshotExportAckStorageKey(assessmentId: string): string {
    return clinicalExportAckStorageKey(SNAPSHOT_ARTIFACT, assessmentId);
}

export function setSnapshotExportAcknowledged(assessmentId: string): void {
    setClinicalExportAcknowledged(SNAPSHOT_ARTIFACT, assessmentId);
}

export function hasSnapshotExportAcknowledged(assessmentId: string): boolean {
    return hasClinicalExportAcknowledged(SNAPSHOT_ARTIFACT, assessmentId);
}

export function requiresSnapshotExportAcknowledgment(
    exportMode: SnapshotExportMode
): boolean {
    return requiresClinicalExportAcknowledgment(exportMode, () => true);
}

export function isSnapshotExportAcknowledged(
    assessmentId: string,
    exportMode: SnapshotExportMode = 'full'
): boolean {
    return isClinicalExportAcknowledged(
        SNAPSHOT_ARTIFACT,
        assessmentId,
        exportMode,
        () => true
    );
}
