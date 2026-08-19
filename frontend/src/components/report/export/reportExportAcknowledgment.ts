import {
    clinicalExportAckStorageKey,
    hasClinicalExportAcknowledged,
    setClinicalExportAcknowledged,
} from '../../../clinicalExport/clinicalExportAcknowledgment';

export const REPORT_ARTIFACT = 'report' as const;
export const REPORT_EXPORT_MODE = 'standard' as const;

export function reportExportAckStorageKey(assessmentId: string): string {
    return clinicalExportAckStorageKey(REPORT_ARTIFACT, assessmentId);
}

export function setReportExportAcknowledged(assessmentId: string): void {
    setClinicalExportAcknowledged(REPORT_ARTIFACT, assessmentId);
}

export function hasReportExportAcknowledged(assessmentId: string): boolean {
    return hasClinicalExportAcknowledged(REPORT_ARTIFACT, assessmentId);
}
