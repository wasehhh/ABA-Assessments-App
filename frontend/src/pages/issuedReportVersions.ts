import { AssessmentCommunicationReport } from '../services/reportAuthoringTypes';

export function issuedReportVersions(
    rows: AssessmentCommunicationReport[]
): AssessmentCommunicationReport[] {
    return rows.filter((row) => row.status === 'finalized' || row.status === 'superseded');
}

export function shouldShowVersionHistoryLink(rows: AssessmentCommunicationReport[]): boolean {
    return issuedReportVersions(rows).length > 1;
}

export function issuedVersionStatusLabel(
    status: AssessmentCommunicationReport['status']
): 'Current' | 'Superseded' | null {
    if (status === 'finalized') {
        return 'Current';
    }
    if (status === 'superseded') {
        return 'Superseded';
    }
    return null;
}

/** Honest label when `finalized_by` cannot be resolved to a person. */
export const UNRESOLVED_FINALIZED_BY_LABEL = '—';

export function formatFinalizedByDisplayName(profile: {
    full_name: string | null;
    email: string | null;
} | null): string {
    if (!profile) {
        return UNRESOLVED_FINALIZED_BY_LABEL;
    }
    const name = profile.full_name?.trim();
    if (name) {
        return name;
    }
    const email = profile.email?.trim();
    if (email) {
        return email;
    }
    return UNRESOLVED_FINALIZED_BY_LABEL;
}
