import { supabase } from '../lib/supabase';
import { Assessment, AssessmentCycle, AssessmentScore, ContentPackData, UserProfile } from '../types';
import { ReportPriorCycleInput } from '../utils/reportPresentLevelsChange';
import { assessmentService } from './assessments';
import { buildEmbeddedComputedFromReportProfile } from './reportEmbeddedComputed';
import { canManageReportAuthoring } from './reportAuthoringRoles';
import {
    AssessmentCommunicationReport,
    ReportAuthoring,
    ReportCommunicationStatus,
} from './reportAuthoringTypes';
import {
    createEmptyReportAuthoring,
    mergeReportAuthoringPartial,
    ReportAuthoringValidationError,
    validateAuthoringForFinalize,
} from './reportAuthoringValidation';

export class ReportAuthoringError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ReportAuthoringError';
    }
}

export { ReportAuthoringValidationError };

/** User-facing refuse when a goal domain title cannot be resolved from the frozen pack. */
export const GOAL_DOMAIN_TITLE_RESOLVE_ERROR =
    "Unable to finalize this report: a treatment goal's domain title could not be resolved from the frozen pack. The report was not signed.";

export function stampGoalDomainTitlesFromPack(
    authoring: ReportAuthoring,
    packSnapshot: ContentPackData
): ReportAuthoring {
    const titleByDomainId = new Map(
        packSnapshot.domains.map((domain) => [domain.domain_id, domain.title])
    );

    return {
        ...authoring,
        sections: {
            ...authoring.sections,
            measurable_treatment_goals: {
                goals: authoring.sections.measurable_treatment_goals.goals.map((goal) => {
                    const title = titleByDomainId.get(goal.domain_id);
                    if (title == null || title.trim() === '') {
                        throw new ReportAuthoringError(GOAL_DOMAIN_TITLE_RESOLVE_ERROR);
                    }
                    return {
                        ...goal,
                        domain_title: title.trim(),
                    };
                }),
            },
        },
    };
}

/** User-facing refuse when prior-cycle history cannot be loaded for cycle_number > 1. */
export const PRIOR_CYCLE_HISTORY_LOAD_ERROR =
    "Unable to finalize this report: this cycle's prior assessment history could not be loaded. The report was not signed.";

async function getCurrentUserProfile(): Promise<UserProfile> {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
        throw authError;
    }
    if (!user) {
        throw new ReportAuthoringError('You must be signed in to manage assessment reports.');
    }

    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (profileError) {
        throw profileError;
    }
    if (!profile) {
        throw new ReportAuthoringError('Your user profile could not be loaded.');
    }

    return profile as UserProfile;
}

function assertAuthoringRole(profile: UserProfile): void {
    if (!canManageReportAuthoring(profile.role)) {
        throw new ReportAuthoringError(
            'Only senior therapists and admins may create, edit, or finalize assessment reports.'
        );
    }
}

async function loadApprovedAssessment(assessmentId: string): Promise<Assessment> {
    const assessment = await assessmentService.getById(assessmentId);
    if (!assessment) {
        throw new ReportAuthoringError('Assessment not found.');
    }
    if (assessment.status !== 'approved') {
        throw new ReportAuthoringError(
            'Assessment reports can only be authored after the assessment is approved.'
        );
    }
    return assessment;
}

async function loadCycleForAssessment(
    assessmentId: string,
    cycleId: string
): Promise<AssessmentCycle> {
    const cycles = await assessmentService.getCycles(assessmentId);
    const cycle = cycles.find((entry) => entry.id === cycleId);
    if (!cycle) {
        throw new ReportAuthoringError('Assessment cycle not found for this assessment.');
    }
    return cycle;
}

function normalizeReportRow(row: AssessmentCommunicationReport): AssessmentCommunicationReport {
    return {
        ...row,
        authoring: row.authoring ?? createEmptyReportAuthoring(),
    };
}

async function getReportsForScope(
    assessmentId: string,
    cycleId: string
): Promise<AssessmentCommunicationReport[]> {
    const { data, error } = await supabase
        .from('assessment_communication_reports')
        .select('*')
        .eq('assessment_id', assessmentId)
        .eq('cycle_id', cycleId)
        .order('version', { ascending: true });

    if (error) {
        throw error;
    }

    return (data ?? []).map((row) => normalizeReportRow(row as AssessmentCommunicationReport));
}

async function getReportById(reportId: string): Promise<AssessmentCommunicationReport> {
    const { data, error } = await supabase
        .from('assessment_communication_reports')
        .select('*')
        .eq('id', reportId)
        .maybeSingle();

    if (error) {
        throw error;
    }
    if (!data) {
        throw new ReportAuthoringError('Assessment communication report not found.');
    }

    return normalizeReportRow(data as AssessmentCommunicationReport);
}

async function getNextVersion(assessmentId: string, cycleId: string): Promise<number> {
    const reports = await getReportsForScope(assessmentId, cycleId);
    if (reports.length === 0) {
        return 1;
    }
    return Math.max(...reports.map((report) => report.version)) + 1;
}

async function assertNoDraftForScope(assessmentId: string, cycleId: string): Promise<void> {
    const reports = await getReportsForScope(assessmentId, cycleId);
    if (reports.some((report) => report.status === 'draft')) {
        throw new ReportAuthoringError(
            'A draft report already exists for this assessment and cycle.'
        );
    }
}

async function loadFinalizePresentLevelsInputs(
    assessmentId: string,
    cycle: AssessmentCycle
): Promise<{ scores: AssessmentScore[]; priorCycles: ReportPriorCycleInput[] }> {
    const scores = await assessmentService.getScores(assessmentId, cycle.id);

    if (cycle.cycle_number <= 1) {
        return { scores, priorCycles: [] };
    }

    let cycles: AssessmentCycle[] | null;
    try {
        cycles = await assessmentService.getCycles(assessmentId);
    } catch {
        throw new ReportAuthoringError(PRIOR_CYCLE_HISTORY_LOAD_ERROR);
    }

    if (!Array.isArray(cycles)) {
        throw new ReportAuthoringError(PRIOR_CYCLE_HISTORY_LOAD_ERROR);
    }

    const priorRecords = cycles
        .filter((entry) => entry.cycle_number < cycle.cycle_number)
        .sort((left, right) => left.cycle_number - right.cycle_number);

    if (priorRecords.length === 0) {
        throw new ReportAuthoringError(PRIOR_CYCLE_HISTORY_LOAD_ERROR);
    }

    const priorCycles: ReportPriorCycleInput[] = [];
    try {
        for (const prior of priorRecords) {
            const priorScores = await assessmentService.getScores(assessmentId, prior.id);
            priorCycles.push({
                cycle_id: prior.id,
                cycle_number: prior.cycle_number,
                start_date: prior.start_date,
                end_date: prior.end_date,
                scores: priorScores ?? [],
            });
        }
    } catch (error) {
        if (error instanceof ReportAuthoringError) {
            throw error;
        }
        throw new ReportAuthoringError(PRIOR_CYCLE_HISTORY_LOAD_ERROR);
    }

    if (priorCycles.length === 0) {
        throw new ReportAuthoringError(PRIOR_CYCLE_HISTORY_LOAD_ERROR);
    }

    return { scores, priorCycles };
}

export const reportAuthoringService = {
    async createDraftReport(assessmentId: string, cycleId: string): Promise<AssessmentCommunicationReport> {
        const profile = await getCurrentUserProfile();
        assertAuthoringRole(profile);

        const assessment = await loadApprovedAssessment(assessmentId);
        const cycle = await loadCycleForAssessment(assessmentId, cycleId);
        await assertNoDraftForScope(assessmentId, cycleId);

        const existingReports = await getReportsForScope(assessmentId, cycleId);
        if (existingReports.some((report) => report.status === 'finalized')) {
            throw new ReportAuthoringError(
                'A finalized report already exists for this assessment and cycle. Create a new version from the finalized report instead.'
            );
        }

        const version = await getNextVersion(assessmentId, cycleId);
        const authoring = createEmptyReportAuthoring();
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('assessment_communication_reports')
            .insert([
                {
                    org_id: assessment.org_id,
                    assessment_id: assessmentId,
                    cycle_id: cycle.id,
                    status: 'draft' satisfies ReportCommunicationStatus,
                    version,
                    authoring,
                    created_by: profile.id,
                    last_edited_by: profile.id,
                    created_at: now,
                    updated_at: now,
                },
            ])
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return normalizeReportRow(data as AssessmentCommunicationReport);
    },

    async saveDraftReport(
        reportId: string,
        authoringPartial: Partial<ReportAuthoring> | { sections?: Partial<ReportAuthoring['sections']> }
    ): Promise<AssessmentCommunicationReport> {
        const profile = await getCurrentUserProfile();
        assertAuthoringRole(profile);

        const existing = await getReportById(reportId);
        if (existing.status !== 'draft') {
            throw new ReportAuthoringError('Only draft reports can be edited.');
        }

        await loadApprovedAssessment(existing.assessment_id);

        const mergedAuthoring = mergeReportAuthoringPartial(existing.authoring, authoringPartial);
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('assessment_communication_reports')
            .update({
                authoring: mergedAuthoring,
                last_edited_by: profile.id,
                updated_at: now,
            })
            .eq('id', reportId)
            .eq('status', 'draft')
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return normalizeReportRow(data as AssessmentCommunicationReport);
    },

    async finalizeReport(reportId: string): Promise<AssessmentCommunicationReport> {
        const profile = await getCurrentUserProfile();
        assertAuthoringRole(profile);

        const existing = await getReportById(reportId);
        if (existing.status !== 'draft') {
            throw new ReportAuthoringError('Only draft reports can be finalized.');
        }

        const assessment = await loadApprovedAssessment(existing.assessment_id);
        const cycle = await loadCycleForAssessment(existing.assessment_id, existing.cycle_id);
        validateAuthoringForFinalize(existing.authoring, assessment.pack_snapshot as ContentPackData);
        const authoringToPersist = stampGoalDomainTitlesFromPack(
            existing.authoring,
            assessment.pack_snapshot as ContentPackData
        );

        const { scores, priorCycles } = await loadFinalizePresentLevelsInputs(
            existing.assessment_id,
            cycle
        );
        const snapshotAt = new Date();
        const embeddedComputed = buildEmbeddedComputedFromReportProfile({
            assessment: {
                id: assessment.id,
                client_id: assessment.client_id,
                pack_snapshot: assessment.pack_snapshot,
                assessment_date: assessment.assessment_date,
                status: assessment.status,
                client: assessment.client,
            },
            cycle,
            scores,
            priorCycles,
            finalizedByUserId: profile.id,
            authoringClinicianName: profile.full_name,
            snapshotAt,
        });

        const finalizedAt = snapshotAt.toISOString();

        const { data, error } = await supabase
            .from('assessment_communication_reports')
            .update({
                status: 'finalized',
                authoring: authoringToPersist,
                embedded_computed: embeddedComputed,
                embedded_generated_at: finalizedAt,
                finalized_by: profile.id,
                finalized_at: finalizedAt,
                last_edited_by: profile.id,
                updated_at: finalizedAt,
            })
            .eq('id', reportId)
            .eq('status', 'draft')
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        const { error: supersedeError } = await supabase
            .from('assessment_communication_reports')
            .update({ status: 'superseded', updated_at: finalizedAt })
            .eq('assessment_id', existing.assessment_id)
            .eq('cycle_id', existing.cycle_id)
            .eq('status', 'finalized')
            .lt('version', existing.version);

        if (supersedeError) {
            throw supersedeError;
        }

        return normalizeReportRow(data as AssessmentCommunicationReport);
    },

    async createNewVersionDraftFromFinalized(
        assessmentId: string,
        cycleId: string
    ): Promise<AssessmentCommunicationReport> {
        const profile = await getCurrentUserProfile();
        assertAuthoringRole(profile);

        await loadApprovedAssessment(assessmentId);
        await loadCycleForAssessment(assessmentId, cycleId);
        await assertNoDraftForScope(assessmentId, cycleId);

        const currentFinalized = await this.getCurrentFinalizedVersion(assessmentId, cycleId);
        if (!currentFinalized) {
            throw new ReportAuthoringError(
                'No finalized report exists to duplicate into a new draft version.'
            );
        }

        const version = currentFinalized.version + 1;
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('assessment_communication_reports')
            .insert([
                {
                    org_id: currentFinalized.org_id,
                    assessment_id: assessmentId,
                    cycle_id: cycleId,
                    status: 'draft' satisfies ReportCommunicationStatus,
                    version,
                    authoring: currentFinalized.authoring,
                    created_by: profile.id,
                    last_edited_by: profile.id,
                    created_at: now,
                    updated_at: now,
                },
            ])
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        return normalizeReportRow(data as AssessmentCommunicationReport);
    },

    async listReportVersions(
        assessmentId: string,
        cycleId: string
    ): Promise<AssessmentCommunicationReport[]> {
        return getReportsForScope(assessmentId, cycleId);
    },

    async getCurrentFinalizedVersion(
        assessmentId: string,
        cycleId: string
    ): Promise<AssessmentCommunicationReport | null> {
        const { data, error } = await supabase
            .from('assessment_communication_reports')
            .select('*')
            .eq('assessment_id', assessmentId)
            .eq('cycle_id', cycleId)
            .eq('status', 'finalized')
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data ? normalizeReportRow(data as AssessmentCommunicationReport) : null;
    },
};
