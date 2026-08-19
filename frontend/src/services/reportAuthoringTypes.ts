import { AssessmentLandscapeRollup } from './assessmentLandscape';
import { StateDistribution } from './domainProfile';
import { CompetencyState } from '../utils/scoreInterpretation';

export type ReportCommunicationStatus = 'draft' | 'finalized' | 'superseded';

export type ReportTargetTimeframe = '3_months' | '6_months' | '12_months';

export const REPORT_TARGET_TIMEFRAMES: readonly ReportTargetTimeframe[] = [
    '3_months',
    '6_months',
    '12_months',
] as const;

export const REPORT_AUTHORING_TEMPLATE_VERSION = 1 as const;

export interface ReportMeasurableTreatmentGoal {
    id: string;
    domain_id: string;
    goal_statement: string;
    mastery_criterion: string;
    target_timeframe: ReportTargetTimeframe;
}

export interface ReportAuthoringSections {
    target_skills_focus: {
        focus_summary: string;
    };
    measurable_treatment_goals: {
        goals: ReportMeasurableTreatmentGoal[];
    };
    recommended_therapy_hours: {
        weekly_hours: number;
        clinical_justification: string;
    };
    clinical_summary: {
        narrative: string;
    };
}

export interface ReportAuthoring {
    template_version: typeof REPORT_AUTHORING_TEMPLATE_VERSION;
    sections: ReportAuthoringSections;
}

export interface ReportEmbeddedComputedProvenance {
    snapshot_at: string;
    pack_title: string;
    pack_version: string;
    assessment_id: string;
    cycle_id: string;
    cycle_number: number;
    pack_snapshot_frozen: true;
}

export interface ReportEmbeddedComputedOverview {
    client_name: string | null;
    client_id: string | null;
    pack_title: string;
    pack_version: string;
    assessment_id: string;
    cycle_id: string;
    cycle_number: number;
    cycle_start_date: string | null;
    cycle_end_date: string | null;
    assessment_date: string | null;
    authoring_clinician_name: string | null;
    authoring_clinician_user_id: string;
}

export interface ReportEmbeddedPresentLevelsDomainSummaryRow {
    domain_id: string;
    title: string;
    coverage: { scored: number; total: number };
    points_captured_percentage: number;
    state_distribution: StateDistribution;
}

export interface ReportEmbeddedPresentLevels {
    rollup: AssessmentLandscapeRollup;
    assessment_band_distribution: StateDistribution;
    domains: ReportEmbeddedPresentLevelsDomainSummaryRow[];
}

export interface ReportEmbeddedTargetSkillRow {
    target_id: string;
    title: string;
    display_score_with_max: string;
    competency_state: CompetencyState;
    normalized_ratio: number | null;
}

export interface ReportEmbeddedTargetSkillsDomain {
    domain_id: string;
    title: string;
    targets: ReportEmbeddedTargetSkillRow[];
}

export interface ReportEmbeddedTargetSkills {
    domains: ReportEmbeddedTargetSkillsDomain[];
}

export interface ReportEmbeddedComputed {
    provenance: ReportEmbeddedComputedProvenance;
    overview: ReportEmbeddedComputedOverview;
    present_levels: ReportEmbeddedPresentLevels;
    target_skills: ReportEmbeddedTargetSkills;
}

export interface AssessmentCommunicationReport {
    id: string;
    org_id: string;
    assessment_id: string;
    cycle_id: string;
    status: ReportCommunicationStatus;
    version: number;
    authoring: ReportAuthoring;
    embedded_computed: ReportEmbeddedComputed | null;
    embedded_generated_at: string | null;
    created_by: string;
    last_edited_by: string;
    finalized_by: string | null;
    finalized_at: string | null;
    created_at: string;
    updated_at: string;
}
