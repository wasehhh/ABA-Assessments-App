import { LearnerMapExportMode } from './learnerMapExportMode';

const STORAGE_KEY_PREFIX = 'learner-map-full-export-ack:';

export function learnerMapFullExportAckStorageKey(assessmentId: string): string {
    return `${STORAGE_KEY_PREFIX}${assessmentId}`;
}

export function setLearnerMapFullExportAcknowledged(assessmentId: string): void {
    try {
        sessionStorage.setItem(learnerMapFullExportAckStorageKey(assessmentId), '1');
    } catch {
        // sessionStorage may be unavailable; preview route will treat as unacknowledged.
    }
}

export function hasLearnerMapFullExportAcknowledged(assessmentId: string): boolean {
    try {
        return sessionStorage.getItem(learnerMapFullExportAckStorageKey(assessmentId)) === '1';
    } catch {
        return false;
    }
}

export function requiresLearnerMapFullExportAcknowledgment(exportMode: LearnerMapExportMode): boolean {
    return exportMode === 'full';
}

export function isLearnerMapFullExportAcknowledged(
    assessmentId: string,
    exportMode: LearnerMapExportMode
): boolean {
    if (!requiresLearnerMapFullExportAcknowledgment(exportMode)) {
        return true;
    }

    return hasLearnerMapFullExportAcknowledged(assessmentId);
}
