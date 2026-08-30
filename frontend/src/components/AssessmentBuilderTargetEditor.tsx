import { Dispatch, SetStateAction } from 'react';
import { Trash2 } from 'lucide-react';
import {
    ContentPackData,
    Domain,
    ScoringType,
    SecondaryGroupCatalogEntry,
    Target,
    TargetScoring,
} from '../types';
import {
    formatEffectiveScoringSummary,
    resolveTargetEffectiveInWorkingPack,
} from '../utils/assessmentBuilderOverrideUi';
import { hasTargetScoringOverride } from '../utils/effectiveScoring';

export interface AssessmentBuilderTargetEditorProps {
    domainIndex: number;
    targetIndex: number;
    target: Target;
    targetLabelText: string;
    secondaryLabel: string;
    /** True when pack scoring_mode is Uniform — hides per-target scoring UI. */
    useGlobalScale: boolean;
    /** Canonical working pack for resolveEffectiveScoring (Custom Inherited display). */
    workingPack: ContentPackData;
    secondaryGroups?: SecondaryGroupCatalogEntry[];
    showMoveToGroup: boolean;
    domains: Domain[];
    setDomains: Dispatch<SetStateAction<Domain[]>>;
    scaleDraft: string;
    scaleError?: string | null;
    targetIdError?: string | null;
    onUpdateTarget: (
        domainIndex: number,
        targetIndex: number,
        field: keyof Target,
        value: Target[keyof Target]
    ) => void;
    onScaleDraftChange: (domainIndex: number, targetIndex: number, draft: string) => void;
    onCommitTargetScale: (domainIndex: number, targetIndex: number) => void;
    onUpdateScoringType: (
        domainIndex: number,
        targetIndex: number,
        scoringType: ScoringType
    ) => void;
    onCustomizeOverride: (domainIndex: number, targetIndex: number) => void;
    onRevertToInherited: (domainIndex: number, targetIndex: number) => void;
    onRemoveTarget: (domainIndex: number, targetIndex: number) => void;
    onMoveToGroup: (domainIndex: number, targetIndex: number, secondaryGroupId?: string) => void;
}

function mutateOverrideFields(
    domains: Domain[],
    domainIndex: number,
    targetIndex: number,
    mutate: (scoring: TargetScoring) => void
): Domain[] | null {
    const updated = domains.map((domain, dIndex) => {
        if (dIndex !== domainIndex) {
            return domain;
        }
        return {
            ...domain,
            targets: domain.targets.map((entry, tIndex) => {
                if (tIndex !== targetIndex) {
                    return entry;
                }
                if (!hasTargetScoringOverride(entry) || !entry.scoring) {
                    return entry;
                }
                const scoring = { ...entry.scoring };
                mutate(scoring);
                return { ...entry, scoring };
            }),
        };
    });

    const target = updated[domainIndex]?.targets[targetIndex];
    if (!target || !hasTargetScoringOverride(target)) {
        return null;
    }
    return updated;
}

export function AssessmentBuilderTargetEditor({
    domainIndex,
    targetIndex,
    target,
    targetLabelText,
    secondaryLabel,
    useGlobalScale,
    workingPack,
    secondaryGroups,
    showMoveToGroup,
    domains,
    setDomains,
    scaleDraft,
    scaleError,
    targetIdError,
    onUpdateTarget,
    onScaleDraftChange,
    onCommitTargetScale,
    onUpdateScoringType,
    onCustomizeOverride,
    onRevertToInherited,
    onRemoveTarget,
    onMoveToGroup,
}: AssessmentBuilderTargetEditorProps) {
    const isOverride = hasTargetScoringOverride(target);
    const overrideScoring = isOverride ? target.scoring! : null;
    const showCustomScoringUi = !useGlobalScale;
    const effective = showCustomScoringUi
        ? resolveTargetEffectiveInWorkingPack(target, workingPack)
        : null;

    return (
        <div className="rounded border border-gray-200 bg-white p-3">
            <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                        <div>
                            <label className="mb-1 block text-xs text-gray-600">
                                {targetLabelText} ID
                            </label>
                            <div id={`builder-issue-target_id-${domainIndex}-${targetIndex}`}>
                            <input
                                type="text"
                                value={target.target_id}
                                onChange={(e) =>
                                    onUpdateTarget(domainIndex, targetIndex, 'target_id', e.target.value)
                                }
                                className={`w-full rounded border px-2 py-1 text-xs ${
                                    targetIdError ? 'border-red-400' : 'border-gray-300'
                                }`}
                                placeholder="e.g., A1"
                            />
                            {targetIdError ? (
                                <p className="mt-1 text-xs text-red-600">{targetIdError}</p>
                            ) : null}
                            </div>
                        </div>
                        <div className="col-span-3">
                            <label className="mb-1 block text-xs text-gray-600">
                                {targetLabelText} Title
                            </label>
                            <input
                                type="text"
                                value={target.title}
                                onChange={(e) =>
                                    onUpdateTarget(domainIndex, targetIndex, 'title', e.target.value)
                                }
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                                placeholder="e.g., Follows one-step instructions"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-gray-600">Description</label>
                        <input
                            type="text"
                            value={target.description || ''}
                            onChange={(e) =>
                                onUpdateTarget(domainIndex, targetIndex, 'description', e.target.value)
                            }
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                            placeholder="What skill or competency this target is assessing."
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-gray-600">Success Criteria</label>
                        <input
                            type="text"
                            value={target.success_criteria}
                            onChange={(e) =>
                                onUpdateTarget(
                                    domainIndex,
                                    targetIndex,
                                    'success_criteria',
                                    e.target.value
                                )
                            }
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                            placeholder="e.g., 80% accuracy across 3 sessions"
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-gray-600">Materials Needed</label>
                        <input
                            type="text"
                            value={target.materials}
                            onChange={(e) =>
                                onUpdateTarget(domainIndex, targetIndex, 'materials', e.target.value)
                            }
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                            placeholder="e.g., Picture cards, blocks"
                            required
                        />
                    </div>
                    {showCustomScoringUi && (
                        <div className="space-y-2 rounded border border-gray-100 bg-gray-50 p-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                        isOverride
                                            ? 'bg-amber-100 text-amber-900'
                                            : 'bg-emerald-100 text-emerald-900'
                                    }`}
                                >
                                    {isOverride ? 'Override' : 'Inherited'}
                                </span>
                                {!isOverride && effective ? (
                                    <span className="text-xs text-gray-600">
                                        {formatEffectiveScoringSummary(effective)}
                                    </span>
                                ) : null}
                                <div className="ml-auto flex gap-2">
                                    {!isOverride ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onCustomizeOverride(domainIndex, targetIndex)
                                            }
                                            className="text-xs font-medium text-emerald-700 underline hover:text-emerald-800"
                                        >
                                            Customize
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onRevertToInherited(domainIndex, targetIndex)
                                            }
                                            className="text-xs font-medium text-gray-700 underline hover:text-gray-900"
                                        >
                                            Revert to pack default
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isOverride && overrideScoring ? (
                                <>
                                    <div>
                                        <label className="mb-1 block text-xs text-gray-600">
                                            Scoring Type
                                        </label>
                                        <select
                                            value={overrideScoring.type}
                                            onChange={(e) =>
                                                onUpdateScoringType(
                                                    domainIndex,
                                                    targetIndex,
                                                    e.target.value as ScoringType
                                                )
                                            }
                                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                                        >
                                            <option value="numeric">Numeric Scale (e.g., 0-4)</option>
                                            <option value="checkbox">Task Analysis (Chaining)</option>
                                            <option value="yesno">Yes/No</option>
                                            <option value="text">Text Input</option>
                                        </select>
                                    </div>
                                    {overrideScoring.type === 'numeric' && (
                                        <div>
                                            <label className="mb-1 block text-xs text-gray-600">
                                                Numeric Scale
                                            </label>
                                            <div id={`builder-issue-scale-${domainIndex}-${targetIndex}`}>
                                            <input
                                                type="text"
                                                value={scaleDraft}
                                                onChange={(e) =>
                                                    onScaleDraftChange(
                                                        domainIndex,
                                                        targetIndex,
                                                        e.target.value
                                                    )
                                                }
                                                onBlur={() =>
                                                    onCommitTargetScale(domainIndex, targetIndex)
                                                }
                                                className={`w-full rounded border px-2 py-1 text-xs ${
                                                    scaleError ? 'border-red-400' : 'border-gray-300'
                                                }`}
                                                placeholder="e.g., 0,1,2,3,4"
                                                aria-invalid={Boolean(scaleError)}
                                            />
                                            {scaleError ? (
                                                <p className="mt-1 text-xs text-red-600">
                                                    {scaleError}
                                                </p>
                                            ) : (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Comma-separated scores. Decimals and negatives are
                                                    allowed.
                                                </p>
                                            )}
                                            <div className="mt-3 space-y-2">
                                                <label className="block text-xs font-medium text-gray-600">
                                                    Score Criteria Definitions (Optional)
                                                </label>
                                                {overrideScoring.scale?.map((scoreValue) => (
                                                    <div
                                                        key={scoreValue}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <span className="w-6 text-xs font-bold text-gray-700">
                                                            {scoreValue} =
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={
                                                                overrideScoring.scale_labels?.[
                                                                    scoreValue
                                                                ] || ''
                                                            }
                                                            onChange={(e) => {
                                                                const next = mutateOverrideFields(
                                                                    domains,
                                                                    domainIndex,
                                                                    targetIndex,
                                                                    (scoring) => {
                                                                        scoring.scale_labels = {
                                                                            ...(scoring.scale_labels ||
                                                                                {}),
                                                                            [scoreValue]:
                                                                                e.target.value,
                                                                        };
                                                                    }
                                                                );
                                                                if (next) {
                                                                    setDomains(next);
                                                                }
                                                            }}
                                                            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                                                            placeholder={`Criteria for score ${scoreValue}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            </div>
                                        </div>
                                    )}
                                    {overrideScoring.type === 'checkbox' && (
                                        <div className="space-y-3">
                                            <label className="block text-xs font-medium text-gray-600">
                                                Task Analysis Steps
                                            </label>
                                            {(!overrideScoring.task_steps ||
                                                overrideScoring.task_steps.length === 0) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = mutateOverrideFields(
                                                            domains,
                                                            domainIndex,
                                                            targetIndex,
                                                            (scoring) => {
                                                                scoring.task_steps = ['Step 1'];
                                                            }
                                                        );
                                                        if (next) {
                                                            setDomains(next);
                                                        }
                                                    }}
                                                    className="text-xs text-emerald-600 underline"
                                                >
                                                    Initialize Steps
                                                </button>
                                            )}
                                            {overrideScoring.task_steps?.map((step, sIndex) => (
                                                <div key={sIndex} className="flex items-center gap-2">
                                                    <span className="w-4 text-xs text-gray-500">
                                                        {sIndex + 1}.
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={step}
                                                        onChange={(e) => {
                                                            const next = mutateOverrideFields(
                                                                domains,
                                                                domainIndex,
                                                                targetIndex,
                                                                (scoring) => {
                                                                    if (!scoring.task_steps) {
                                                                        scoring.task_steps = [];
                                                                    }
                                                                    scoring.task_steps = [
                                                                        ...scoring.task_steps,
                                                                    ];
                                                                    scoring.task_steps[sIndex] =
                                                                        e.target.value;
                                                                }
                                                            );
                                                            if (next) {
                                                                setDomains(next);
                                                            }
                                                        }}
                                                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                                                        placeholder={`Step ${sIndex + 1}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>
                    )}
                    {showMoveToGroup ? (
                        <div>
                            <label className="mb-1 block text-xs text-gray-600">
                                Move to {secondaryLabel}
                            </label>
                            <select
                                value={target.secondary_group_id || ''}
                                onChange={(e) =>
                                    onMoveToGroup(
                                        domainIndex,
                                        targetIndex,
                                        e.target.value || undefined
                                    )
                                }
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                            >
                                <option value="">Ungrouped</option>
                                {(secondaryGroups ?? []).map((group) => (
                                    <option
                                        key={group.secondary_group_id}
                                        value={group.secondary_group_id}
                                    >
                                        {group.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() => onRemoveTarget(domainIndex, targetIndex)}
                    className="p-1 text-red-600 hover:text-red-700"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
}
