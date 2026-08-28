import { AssessmentLandscapeRollup } from './assessmentLandscape';
import { StateDistribution } from './domainProfile';
import { CompetencyState } from '../utils/scoreInterpretation';
import { ReportPresentLevelsChangeResult } from '../utils/reportPresentLevelsChange';

export type ReportCommunicationStatus = 'draft' | 'finalized' | 'superseded';

export type ReportTargetTimeframe = '3_months' | '6_months' | '12_months';

export const REPORT_TARGET_TIMEFRAMES: readonly ReportTargetTimeframe[] = [
    '3_months',
    '6_months',
    '12_months',
] as const;

export const REPORT_AUTHORING_TEMPLATE_VERSION = 1 as const;

/**
 * Schema version of `embedded_computed`, not of the six-slot authoring form.
 * Distinct name from `authoring.template_version` so the two cannot be conflated.
 * Value 5 matches the contract's counts-only change-metric body (the number
 * Architecture placed on the wrong object).
 */
export const REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION = 5 as const;

export interface ReportMeasurableTreatmentGoal {
    id: string;
    domain_id: string;
    /** Frozen pack domain title, written at finalize. Not an authoring input. */
    domain_title?: string;
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

/** Slim Present Levels written at finalize (contract §5.2.2 / template_version 5 embed). */
export type ReportEmbeddedPresentLevelsChange = ReportPresentLevelsChangeResult;

/** Fat Present Levels retained on pre-cut rows; non-authoritative for render. */
export interface ReportEmbeddedPresentLevelsLegacy {
    rollup: AssessmentLandscapeRollup;
    assessment_band_distribution: StateDistribution;
    domains: ReportEmbeddedPresentLevelsDomainSummaryRow[];
}

export type ReportEmbeddedPresentLevels =
    | ReportEmbeddedPresentLevelsChange
    | ReportEmbeddedPresentLevelsLegacy;

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
    /**
     * Declares which computed body this snapshot is. Absent on legacy rows.
     * Not `template_version` — that field versions the authoring form.
     */
    computed_schema_version?: typeof REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION;
    provenance: ReportEmbeddedComputedProvenance;
    overview: ReportEmbeddedComputedOverview;
    present_levels: ReportEmbeddedPresentLevels;
    /** Absent on new finalizes. Legacy rows may still carry this key; it must not render. */
    target_skills?: ReportEmbeddedTargetSkills;
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
