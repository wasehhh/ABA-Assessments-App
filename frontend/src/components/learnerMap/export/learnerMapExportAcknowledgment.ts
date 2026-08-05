import {
    hasClinicalExportAcknowledged,
    isClinicalExportAcknowledged,
    clinicalExportAckStorageKey,
    setClinicalExportAcknowledged,
    requiresClinicalExportAcknowledgment,
} from '../../../clinicalExport/clinicalExportAcknowledgment';
import { LearnerMapExportMode } from './learnerMapExportMode';

const LEARNER_MAP_ARTIFACT = 'learner-map' as const;

/** Exact storage key — must remain `learner-map-full-export-ack:{assessmentId}`. */
export function learnerMapFullExportAckStorageKey(assessmentId: string): string {
    return clinicalExportAckStorageKey(LEARNER_MAP_ARTIFACT, assessmentId);
}

export function setLearnerMapFullExportAcknowledged(assessmentId: string): void {
    setClinicalExportAcknowledged(LEARNER_MAP_ARTIFACT, assessmentId);
}

export function hasLearnerMapFullExportAcknowledged(assessmentId: string): boolean {
    return hasClinicalExportAcknowledged(LEARNER_MAP_ARTIFACT, assessmentId);
}

export function requiresLearnerMapFullExportAcknowledgment(
    exportMode: LearnerMapExportMode
): boolean {
    return requiresClinicalExportAcknowledgment(
        exportMode,
        (mode) => mode === 'full'
    );
}

export function isLearnerMapFullExportAcknowledged(
    assessmentId: string,
    exportMode: LearnerMapExportMode
): boolean {
    return isClinicalExportAcknowledged(
        LEARNER_MAP_ARTIFACT,
        assessmentId,
        exportMode,
        (mode) => mode === 'full'
    );
}
