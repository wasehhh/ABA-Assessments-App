import { describe, expect, it } from 'vitest';
import { ContentPackData } from '../types';
import {
    createEmptyReportAuthoring,
    getAuthoringFinalizeValidationError,
    mergeReportAuthoringPartial,
    ReportAuthoringValidationError,
    validateAuthoringForFinalize,
} from './reportAuthoringValidation';
import { ReportAuthoring } from './reportAuthoringTypes';

const pack: ContentPackData = {
    pack_id: 'pack-1',
    org_id: 'org-1',
    title: 'Auth Pack',
    description: '',
    version: '1.0',
    domains: [
        {
            domain_id: 'DOM_A',
            title: 'Domain A',
            targets: [
                {
                    target_id: 'T1',
                    title: 'Target 1',
                    success_criteria: '',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
            ],
        },
        {
            domain_id: 'DOM_B',
            title: 'Domain B',
            targets: [],
        },
    ],
};

function validAuthoring(): ReportAuthoring {
    return {
        template_version: 1,
        sections: {
            target_skills_focus: { focus_summary: 'Priority communication skills.' },
            measurable_treatment_goals: {
                goals: [
                    {
                        id: 'goal-1',
                        domain_id: 'DOM_A',
                        goal_statement: 'Learner will mand for preferred items.',
                        mastery_criterion: '80% across 3 sessions',
                        target_timeframe: '3_months',
                    },
                ],
            },
            recommended_therapy_hours: {
                weekly_hours: 12.5,
                clinical_justification: 'Direct service hours support acquisition goals.',
            },
            clinical_summary: {
                narrative: 'Learner demonstrated emerging skills this cycle.',
            },
        },
    };
}

describe('reportAuthoringValidation finalize rules', () => {
    it('accepts a fully populated authoring payload', () => {
        expect(() => validateAuthoringForFinalize(validAuthoring(), pack)).not.toThrow();
    });

    it('rejects missing focus_summary', () => {
        const authoring = validAuthoring();
        authoring.sections.target_skills_focus.focus_summary = '   ';
        expect(() => validateAuthoringForFinalize(authoring, pack)).toThrow(
            ReportAuthoringValidationError
        );
    });

    it('rejects zero goals and more than 35 goals', () => {
        const emptyGoals = validAuthoring();
        emptyGoals.sections.measurable_treatment_goals.goals = [];
        expect(() => validateAuthoringForFinalize(emptyGoals, pack)).toThrow(/at least one goal/i);

        const tooManyGoals = validAuthoring();
        tooManyGoals.sections.measurable_treatment_goals.goals = Array.from({ length: 36 }, (_, i) => ({
            id: `goal-${i}`,
            domain_id: 'DOM_A',
            goal_statement: 'Goal',
            mastery_criterion: 'Criterion',
            target_timeframe: '3_months' as const,
        }));
        expect(() => validateAuthoringForFinalize(tooManyGoals, pack)).toThrow(/at most 35 goals/i);
    });

    it('rejects more than 10 goals in a single domain', () => {
        const authoring = validAuthoring();
        authoring.sections.measurable_treatment_goals.goals = Array.from({ length: 11 }, (_, i) => ({
            id: `goal-${i}`,
            domain_id: 'DOM_A',
            goal_statement: 'Goal',
            mastery_criterion: 'Criterion',
            target_timeframe: '3_months' as const,
        }));
        expect(() => validateAuthoringForFinalize(authoring, pack)).toThrow(/at most 10 goals per domain/i);
    });

    it('rejects unknown domain_id and missing therapy-hour fields', () => {
        const unknownDomain = validAuthoring();
        unknownDomain.sections.measurable_treatment_goals.goals[0]!.domain_id = 'DOM_MISSING';
        expect(() => validateAuthoringForFinalize(unknownDomain, pack)).toThrow(/unknown domain_id/i);

        const missingHours = validAuthoring();
        missingHours.sections.recommended_therapy_hours.weekly_hours = Number.NaN;
        expect(() => validateAuthoringForFinalize(missingHours, pack)).toThrow(/weekly hours/i);

        const missingJustification = validAuthoring();
        missingJustification.sections.recommended_therapy_hours.clinical_justification = '';
        expect(() => validateAuthoringForFinalize(missingJustification, pack)).toThrow(
            /clinical_justification/i
        );
    });

    it('allows partial draft saves via merge without validation', () => {
        const base = createEmptyReportAuthoring();
        const merged = mergeReportAuthoringPartial(base, {
            sections: {
                target_skills_focus: { focus_summary: 'Draft only text' },
            },
        });

        expect(merged.sections.target_skills_focus.focus_summary).toBe('Draft only text');
        expect(merged.sections.measurable_treatment_goals.goals).toEqual([]);
        expect(() => validateAuthoringForFinalize(merged, pack)).toThrow(
            ReportAuthoringValidationError
        );
    });

    it('exposes finalize validation messages for UI reuse', () => {
        expect(getAuthoringFinalizeValidationError(validAuthoring(), pack)).toBeNull();
        expect(getAuthoringFinalizeValidationError(createEmptyReportAuthoring(), pack)).toMatch(
            /focus_summary|goal|Clinical Summary|weekly hours/i
        );
    });
});

describe('reportAuthoringRoles', () => {
    it('matches assessmentScoreEditRules phrasing for authoring roles', async () => {
        const { canManageReportAuthoring, canViewReportDraft } = await import('./reportAuthoringRoles');

        expect(canManageReportAuthoring('admin')).toBe(true);
        expect(canManageReportAuthoring('senior_therapist')).toBe(true);
        expect(canManageReportAuthoring('therapist')).toBe(false);
        expect(canManageReportAuthoring('viewer')).toBe(false);

        expect(canViewReportDraft('therapist')).toBe(true);
        expect(canViewReportDraft('viewer')).toBe(false);
    });
});
