import { assessmentService } from '../services/assessments';
import { reportAuthoringService, ReportAuthoringError } from '../services/reportAuthoring';
import { AssessmentCommunicationReport } from '../services/reportAuthoringTypes';
import { AssessmentCycle } from '../types';

export type DraftWorkspaceLoadResult =
    | { kind: 'draft'; report: AssessmentCommunicationReport }
    | { kind: 'needs_new_version' };

export type NewVersionDraftResult =
    | { kind: 'created'; report: AssessmentCommunicationReport }
    | { kind: 'existing_draft'; report: AssessmentCommunicationReport };

export async function loadCycleReferenceScores(
    assessmentId: string,
    selectedCycle: AssessmentCycle,
    cycles: AssessmentCycle[]
): Promise<{ scores: any[]; previousScores: any[] }> {
    const scores = await assessmentService.getScores(assessmentId, selectedCycle.id);
    let previousScores: any[] = [];
    if (selectedCycle.cycle_number > 1) {
        const previousCycle = cycles.find(
            (entry) => entry.cycle_number === selectedCycle.cycle_number - 1
        );
        if (previousCycle) {
            previousScores = await assessmentService.getScores(assessmentId, previousCycle.id);
        }
    }
    return { scores, previousScores };
}

export async function loadOrCreateDraftReport(
    assessmentId: string,
    cycleId: string
): Promise<DraftWorkspaceLoadResult> {
    const versions = await reportAuthoringService.listReportVersions(assessmentId, cycleId);
    const existingDraft = versions.find((row) => row.status === 'draft');
    if (existingDraft) {
        return { kind: 'draft', report: existingDraft };
    }

    const hasFinalized = versions.some((row) => row.status === 'finalized');
    if (hasFinalized) {
        return { kind: 'needs_new_version' };
    }

    const created = await reportAuthoringService.createDraftReport(assessmentId, cycleId);
    return { kind: 'draft', report: created };
}

export async function beginNewVersionDraftFromFinalized(
    assessmentId: string,
    cycleId: string
): Promise<NewVersionDraftResult> {
    try {
        const created = await reportAuthoringService.createNewVersionDraftFromFinalized(
            assessmentId,
            cycleId
        );
        return { kind: 'created', report: created };
    } catch (error) {
        if (!(error instanceof ReportAuthoringError)) {
            throw error;
        }

        const versions = await reportAuthoringService.listReportVersions(assessmentId, cycleId);
        const existingDraft = versions.find((row) => row.status === 'draft');
        if (existingDraft) {
            return { kind: 'existing_draft', report: existingDraft };
        }

        throw error;
    }
}
