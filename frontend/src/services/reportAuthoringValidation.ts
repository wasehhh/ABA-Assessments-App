import { ContentPackData } from '../types';
import {
    REPORT_AUTHORING_TEMPLATE_VERSION,
    REPORT_TARGET_TIMEFRAMES,
    ReportAuthoring,
    ReportAuthoringSections,
    ReportMeasurableTreatmentGoal,
    ReportTargetTimeframe,
} from './reportAuthoringTypes';

export const REPORT_AUTHORING_LIMITS = {
    focusSummary: 1500,
    goalStatement: 800,
    masteryCriterion: 300,
    clinicalJustification: 1200,
    clinicalSummary: 4000,
    goalsMin: 1,
    goalsMax: 35,
    goalsPerDomainMax: 10,
    weeklyHoursMin: 0,
    weeklyHoursMax: 168,
} as const;

export class ReportAuthoringValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ReportAuthoringValidationError';
    }
}

export function createEmptyReportAuthoring(): ReportAuthoring {
    return {
        template_version: REPORT_AUTHORING_TEMPLATE_VERSION,
        sections: {
            target_skills_focus: { focus_summary: '' },
            measurable_treatment_goals: { goals: [] },
            recommended_therapy_hours: {
                weekly_hours: 0,
                clinical_justification: '',
            },
            clinical_summary: { narrative: '' },
        },
    };
}

function isNonEmptyTrimmed(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

function assertMaxLength(label: string, value: string, max: number): void {
    if (value.length > max) {
        throw new ReportAuthoringValidationError(
            `${label} must be at most ${max} characters.`
        );
    }
}

export function isValidWeeklyHours(value: number): boolean {
    if (!Number.isFinite(value)) {
        return false;
    }
    if (value < REPORT_AUTHORING_LIMITS.weeklyHoursMin) {
        return false;
    }
    if (value > REPORT_AUTHORING_LIMITS.weeklyHoursMax) {
        return false;
    }
    const scaled = Math.round(value * 10);
    return Math.abs(value * 10 - scaled) < 1e-9;
}

function assertValidWeeklyHours(value: number): void {
    if (!isValidWeeklyHours(value)) {
        throw new ReportAuthoringValidationError(
            'Recommended weekly hours must be between 0 and 168 with at most one decimal place.'
        );
    }
}

function assertValidTargetTimeframe(value: string): asserts value is ReportTargetTimeframe {
    if (!REPORT_TARGET_TIMEFRAMES.includes(value as ReportTargetTimeframe)) {
        throw new ReportAuthoringValidationError(
            'Each goal must use a target_timeframe of 3_months, 6_months, or 12_months.'
        );
    }
}

function validateGoal(
    goal: ReportMeasurableTreatmentGoal,
    index: number,
    packDomainIds: Set<string>,
    goalsByDomain: Map<string, number>
): void {
    const label = `Goal ${index + 1}`;

    if (!goal.id?.trim()) {
        throw new ReportAuthoringValidationError(`${label} requires an id.`);
    }
    if (!goal.domain_id?.trim()) {
        throw new ReportAuthoringValidationError(`${label} requires a domain_id.`);
    }
    if (!packDomainIds.has(goal.domain_id)) {
        throw new ReportAuthoringValidationError(
            `${label} references unknown domain_id "${goal.domain_id}".`
        );
    }

    goalsByDomain.set(goal.domain_id, (goalsByDomain.get(goal.domain_id) ?? 0) + 1);

    if (!isNonEmptyTrimmed(goal.goal_statement)) {
        throw new ReportAuthoringValidationError(`${label} requires a goal_statement.`);
    }
    assertMaxLength(`${label} goal_statement`, goal.goal_statement, REPORT_AUTHORING_LIMITS.goalStatement);

    if (!isNonEmptyTrimmed(goal.mastery_criterion)) {
        throw new ReportAuthoringValidationError(`${label} requires a mastery_criterion.`);
    }
    assertMaxLength(
        `${label} mastery_criterion`,
        goal.mastery_criterion,
        REPORT_AUTHORING_LIMITS.masteryCriterion
    );

    assertValidTargetTimeframe(goal.target_timeframe);
}

export function validateAuthoringForFinalize(
    authoring: ReportAuthoring,
    packSnapshot: ContentPackData
): void {
    if (authoring.template_version !== REPORT_AUTHORING_TEMPLATE_VERSION) {
        throw new ReportAuthoringValidationError(
            `Unsupported template_version ${authoring.template_version}.`
        );
    }

    const sections = authoring.sections;
    const packDomainIds = new Set(packSnapshot.domains.map((domain) => domain.domain_id));

    const focusSummary = sections.target_skills_focus?.focus_summary ?? '';
    if (!isNonEmptyTrimmed(focusSummary)) {
        throw new ReportAuthoringValidationError(
            'Target Skills / Areas of Focus requires a non-empty focus_summary.'
        );
    }
    assertMaxLength('focus_summary', focusSummary, REPORT_AUTHORING_LIMITS.focusSummary);

    const goals = sections.measurable_treatment_goals?.goals ?? [];
    if (goals.length < REPORT_AUTHORING_LIMITS.goalsMin) {
        throw new ReportAuthoringValidationError(
            'Measurable Treatment Goals requires at least one goal.'
        );
    }
    if (goals.length > REPORT_AUTHORING_LIMITS.goalsMax) {
        throw new ReportAuthoringValidationError(
            `Measurable Treatment Goals allows at most ${REPORT_AUTHORING_LIMITS.goalsMax} goals.`
        );
    }

    const goalsByDomain = new Map<string, number>();
    goals.forEach((goal, index) => validateGoal(goal, index, packDomainIds, goalsByDomain));

    for (const [domainId, count] of goalsByDomain.entries()) {
        if (count > REPORT_AUTHORING_LIMITS.goalsPerDomainMax) {
            throw new ReportAuthoringValidationError(
                `Domain "${domainId}" has ${count} goals; at most ${REPORT_AUTHORING_LIMITS.goalsPerDomainMax} goals per domain are allowed.`
            );
        }
    }

    const weeklyHours = sections.recommended_therapy_hours?.weekly_hours;
    if (weeklyHours === null || weeklyHours === undefined) {
        throw new ReportAuthoringValidationError(
            'Recommended Therapy Hours requires weekly_hours.'
        );
    }
    assertValidWeeklyHours(weeklyHours);

    const clinicalJustification = sections.recommended_therapy_hours?.clinical_justification ?? '';
    if (!isNonEmptyTrimmed(clinicalJustification)) {
        throw new ReportAuthoringValidationError(
            'Recommended Therapy Hours requires a non-empty clinical_justification.'
        );
    }
    assertMaxLength(
        'clinical_justification',
        clinicalJustification,
        REPORT_AUTHORING_LIMITS.clinicalJustification
    );

    const narrative = sections.clinical_summary?.narrative ?? '';
    if (!isNonEmptyTrimmed(narrative)) {
        throw new ReportAuthoringValidationError(
            'Clinical Summary requires a non-empty narrative.'
        );
    }
    assertMaxLength('clinical_summary.narrative', narrative, REPORT_AUTHORING_LIMITS.clinicalSummary);
}

export function mergeReportAuthoringPartial(
    existing: ReportAuthoring,
    partial: Partial<ReportAuthoring> | { sections?: Partial<ReportAuthoringSections> }
): ReportAuthoring {
    const partialSections = partial.sections;

    return {
        template_version:
            partial.template_version ?? existing.template_version ?? REPORT_AUTHORING_TEMPLATE_VERSION,
        sections: {
            target_skills_focus: {
                focus_summary:
                    partialSections?.target_skills_focus?.focus_summary ??
                    existing.sections.target_skills_focus.focus_summary,
            },
            measurable_treatment_goals: {
                goals:
                    partialSections?.measurable_treatment_goals?.goals ??
                    existing.sections.measurable_treatment_goals.goals,
            },
            recommended_therapy_hours: {
                weekly_hours:
                    partialSections?.recommended_therapy_hours?.weekly_hours ??
                    existing.sections.recommended_therapy_hours.weekly_hours,
                clinical_justification:
                    partialSections?.recommended_therapy_hours?.clinical_justification ??
                    existing.sections.recommended_therapy_hours.clinical_justification,
            },
            clinical_summary: {
                narrative:
                    partialSections?.clinical_summary?.narrative ??
                    existing.sections.clinical_summary.narrative,
            },
        },
    };
}
