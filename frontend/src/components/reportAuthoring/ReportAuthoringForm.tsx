import { Trash2 } from 'lucide-react';
import { ReactNode } from 'react';
import { Domain } from '../../types';
import {
    REPORT_AUTHORING_LIMITS,
    getGoalAdditionBlockReason,
} from '../../services/reportAuthoringValidation';
import {
    REPORT_TARGET_TIMEFRAMES,
    ReportAuthoring,
    ReportMeasurableTreatmentGoal,
    ReportTargetTimeframe,
} from '../../services/reportAuthoringTypes';

interface Props {
    authoring: ReportAuthoring;
    packDomains: Domain[];
    onChange: (next: ReportAuthoring) => void;
    finalizeError?: string | null;
}

function createGoalId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `goal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function CharacterCounter({ value, max }: { value: string; max: number }) {
    return (
        <p className="mt-1 text-xs text-gray-500 tabular-nums">
            {value.length} / {max}
        </p>
    );
}

function SectionCard({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <div className="mt-4 space-y-3">{children}</div>
        </section>
    );
}

export function ReportAuthoringForm({
    authoring,
    packDomains,
    onChange,
    finalizeError,
}: Props) {
    const goals = authoring.sections.measurable_treatment_goals.goals;
    const goalBlockReason = getGoalAdditionBlockReason(authoring);
    const defaultDomainId = packDomains[0]?.domain_id ?? '';

    const updateAuthoring = (updater: (current: ReportAuthoring) => ReportAuthoring) => {
        onChange(updater(authoring));
    };

    const updateGoal = (goalId: string, patch: Partial<ReportMeasurableTreatmentGoal>) => {
        updateAuthoring((current) => ({
            ...current,
            sections: {
                ...current.sections,
                measurable_treatment_goals: {
                    goals: current.sections.measurable_treatment_goals.goals.map((goal) =>
                        goal.id === goalId ? { ...goal, ...patch } : goal
                    ),
                },
            },
        }));
    };

    const removeGoal = (goalId: string) => {
        updateAuthoring((current) => ({
            ...current,
            sections: {
                ...current.sections,
                measurable_treatment_goals: {
                    goals: current.sections.measurable_treatment_goals.goals.filter(
                        (goal) => goal.id !== goalId
                    ),
                },
            },
        }));
    };

    const addGoal = () => {
        if (goalBlockReason) {
            return;
        }
        const domainId = defaultDomainId;
        const domainBlock = domainId
            ? getGoalAdditionBlockReason(authoring, domainId)
            : null;
        if (domainBlock) {
            return;
        }

        const nextGoal: ReportMeasurableTreatmentGoal = {
            id: createGoalId(),
            domain_id: domainId,
            goal_statement: '',
            mastery_criterion: '',
            target_timeframe: '3_months',
        };

        updateAuthoring((current) => ({
            ...current,
            sections: {
                ...current.sections,
                measurable_treatment_goals: {
                    goals: [...current.sections.measurable_treatment_goals.goals, nextGoal],
                },
            },
        }));
    };

    return (
        <div className="space-y-6" data-report-authoring-form>
            {finalizeError ? (
                <div
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    role="alert"
                    data-report-authoring-finalize-error
                >
                    {finalizeError}
                </div>
            ) : null}

            <SectionCard title="Target Skills / Areas of Focus">
                <label className="block text-sm font-medium text-gray-700" htmlFor="focus-summary">
                    Focus summary
                </label>
                <textarea
                    id="focus-summary"
                    value={authoring.sections.target_skills_focus.focus_summary}
                    maxLength={REPORT_AUTHORING_LIMITS.focusSummary}
                    rows={5}
                    onChange={(event) =>
                        updateAuthoring((current) => ({
                            ...current,
                            sections: {
                                ...current.sections,
                                target_skills_focus: {
                                    focus_summary: event.target.value,
                                },
                            },
                        }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <CharacterCounter
                    value={authoring.sections.target_skills_focus.focus_summary}
                    max={REPORT_AUTHORING_LIMITS.focusSummary}
                />
            </SectionCard>

            <SectionCard title="Measurable Treatment Goals">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-gray-600">
                        {goals.length} / {REPORT_AUTHORING_LIMITS.goalsMax} goals
                    </p>
                    <button
                        type="button"
                        onClick={addGoal}
                        disabled={Boolean(goalBlockReason) || packDomains.length === 0}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        data-report-authoring-add-goal
                    >
                        Add goal
                    </button>
                </div>
                {goalBlockReason ? (
                    <p className="text-xs text-amber-800">{goalBlockReason}</p>
                ) : null}

                <div className="space-y-4">
                    {goals.map((goal, index) => {
                        const domainLimitReason = getGoalAdditionBlockReason(authoring, goal.domain_id);
                        return (
                            <div
                                key={goal.id}
                                className="rounded-md border border-gray-200 bg-gray-50 p-3"
                                data-report-authoring-goal-row
                            >
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-gray-800">
                                        Goal {index + 1}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => removeGoal(goal.id)}
                                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                                        aria-label={`Remove goal ${index + 1}`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                        Remove
                                    </button>
                                </div>

                                <label className="block text-xs font-medium text-gray-700">
                                    Domain
                                </label>
                                <select
                                    value={goal.domain_id}
                                    onChange={(event) =>
                                        updateGoal(goal.id, { domain_id: event.target.value })
                                    }
                                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                >
                                    {packDomains.map((domain) => (
                                        <option key={domain.domain_id} value={domain.domain_id}>
                                            {domain.title}
                                        </option>
                                    ))}
                                </select>
                                {domainLimitReason ? (
                                    <p className="mt-1 text-xs text-amber-800">{domainLimitReason}</p>
                                ) : null}

                                <label className="mt-3 block text-xs font-medium text-gray-700">
                                    Goal statement
                                </label>
                                <textarea
                                    value={goal.goal_statement}
                                    maxLength={REPORT_AUTHORING_LIMITS.goalStatement}
                                    rows={3}
                                    onChange={(event) =>
                                        updateGoal(goal.id, { goal_statement: event.target.value })
                                    }
                                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                />
                                <CharacterCounter
                                    value={goal.goal_statement}
                                    max={REPORT_AUTHORING_LIMITS.goalStatement}
                                />

                                <label className="mt-3 block text-xs font-medium text-gray-700">
                                    Mastery criterion
                                </label>
                                <input
                                    type="text"
                                    value={goal.mastery_criterion}
                                    maxLength={REPORT_AUTHORING_LIMITS.masteryCriterion}
                                    onChange={(event) =>
                                        updateGoal(goal.id, {
                                            mastery_criterion: event.target.value,
                                        })
                                    }
                                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                />
                                <CharacterCounter
                                    value={goal.mastery_criterion}
                                    max={REPORT_AUTHORING_LIMITS.masteryCriterion}
                                />

                                <label className="mt-3 block text-xs font-medium text-gray-700">
                                    Target timeframe
                                </label>
                                <select
                                    value={goal.target_timeframe}
                                    onChange={(event) =>
                                        updateGoal(goal.id, {
                                            target_timeframe: event.target.value as ReportTargetTimeframe,
                                        })
                                    }
                                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                >
                                    {REPORT_TARGET_TIMEFRAMES.map((timeframe) => (
                                        <option key={timeframe} value={timeframe}>
                                            {timeframe}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}
                </div>
            </SectionCard>

            <SectionCard title="Recommended Therapy Hours">
                <label className="block text-sm font-medium text-gray-700" htmlFor="weekly-hours">
                    Weekly hours
                </label>
                <input
                    id="weekly-hours"
                    type="number"
                    min={REPORT_AUTHORING_LIMITS.weeklyHoursMin}
                    max={REPORT_AUTHORING_LIMITS.weeklyHoursMax}
                    step={0.1}
                    value={authoring.sections.recommended_therapy_hours.weekly_hours}
                    onChange={(event) => {
                        const parsed = Number(event.target.value);
                        updateAuthoring((current) => ({
                            ...current,
                            sections: {
                                ...current.sections,
                                recommended_therapy_hours: {
                                    ...current.sections.recommended_therapy_hours,
                                    weekly_hours: Number.isFinite(parsed) ? parsed : 0,
                                },
                            },
                        }));
                    }}
                    className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
                />

                <label
                    className="mt-4 block text-sm font-medium text-gray-700"
                    htmlFor="clinical-justification"
                >
                    Clinical justification
                </label>
                <textarea
                    id="clinical-justification"
                    value={authoring.sections.recommended_therapy_hours.clinical_justification}
                    maxLength={REPORT_AUTHORING_LIMITS.clinicalJustification}
                    rows={4}
                    onChange={(event) =>
                        updateAuthoring((current) => ({
                            ...current,
                            sections: {
                                ...current.sections,
                                recommended_therapy_hours: {
                                    ...current.sections.recommended_therapy_hours,
                                    clinical_justification: event.target.value,
                                },
                            },
                        }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <CharacterCounter
                    value={authoring.sections.recommended_therapy_hours.clinical_justification}
                    max={REPORT_AUTHORING_LIMITS.clinicalJustification}
                />
            </SectionCard>

            <SectionCard title="Clinical Summary">
                <label className="block text-sm font-medium text-gray-700" htmlFor="clinical-summary">
                    Narrative
                </label>
                <textarea
                    id="clinical-summary"
                    value={authoring.sections.clinical_summary.narrative}
                    maxLength={REPORT_AUTHORING_LIMITS.clinicalSummary}
                    rows={8}
                    onChange={(event) =>
                        updateAuthoring((current) => ({
                            ...current,
                            sections: {
                                ...current.sections,
                                clinical_summary: {
                                    narrative: event.target.value,
                                },
                            },
                        }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <CharacterCounter
                    value={authoring.sections.clinical_summary.narrative}
                    max={REPORT_AUTHORING_LIMITS.clinicalSummary}
                />
            </SectionCard>
        </div>
    );
}
