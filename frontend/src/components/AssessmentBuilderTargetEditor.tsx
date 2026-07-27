import { Dispatch, SetStateAction } from 'react';
import { Trash2 } from 'lucide-react';
import { Domain, ScoringType, SecondaryGroupCatalogEntry, Target } from '../types';

export interface AssessmentBuilderTargetEditorProps {
    domainIndex: number;
    targetIndex: number;
    target: Target;
    targetLabelText: string;
    secondaryLabel: string;
    useGlobalScale: boolean;
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
    onRemoveTarget: (domainIndex: number, targetIndex: number) => void;
    onMoveToGroup: (domainIndex: number, targetIndex: number, secondaryGroupId?: string) => void;
}

export function AssessmentBuilderTargetEditor({
    domainIndex,
    targetIndex,
    target,
    targetLabelText,
    secondaryLabel,
    useGlobalScale,
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
    onRemoveTarget,
    onMoveToGroup,
}: AssessmentBuilderTargetEditorProps) {
    return (
        <div className="rounded border border-gray-200 bg-white p-3">
            <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                        <div>
                            <label className="mb-1 block text-xs text-gray-600">
                                {targetLabelText} ID
                            </label>
                            <input
                                type="text"
                                value={target.target_id}
                                onChange={(e) =>
                                    onUpdateTarget(domainIndex, targetIndex, 'target_id', e.target.value)
                                }
                                className={`w-full rounded border px-2 py-1 text-xs ${
                                    targetIdError ? 'border-red-400' : 'border-gray-300'
                                }`}
                                placeholder="A1"
                                required
                            />
                            {targetIdError ? (
                                <p className="mt-1 text-xs text-red-600">{targetIdError}</p>
                            ) : null}
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
                    {!useGlobalScale && (
                        <>
                            <div>
                                <label className="mb-1 block text-xs text-gray-600">Scoring Type</label>
                                <select
                                    value={target.scoring.type}
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
                            {target.scoring.type === 'numeric' && (
                                <div>
                                    <label className="mb-1 block text-xs text-gray-600">
                                        Numeric Scale
                                    </label>
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
                                        <p className="mt-1 text-xs text-red-600">{scaleError}</p>
                                    ) : (
                                        <p className="mt-1 text-xs text-gray-500">
                                            Comma-separated scores. Decimals and negatives are allowed.
                                        </p>
                                    )}
                                    <div className="mt-3 space-y-2">
                                        <label className="block text-xs font-medium text-gray-600">
                                            Score Criteria Definitions (Optional)
                                        </label>
                                        {target.scoring.scale?.map((scoreValue) => (
                                            <div key={scoreValue} className="flex items-center gap-2">
                                                <span className="w-6 text-xs font-bold text-gray-700">
                                                    {scoreValue} =
                                                </span>
                                                <input
                                                    type="text"
                                                    value={
                                                        target.scoring.scale_labels?.[scoreValue] || ''
                                                    }
                                                    onChange={(e) => {
                                                        const updated = [...domains];
                                                        const currentLabels =
                                                            target.scoring.scale_labels || {};
                                                        updated[domainIndex].targets[
                                                            targetIndex
                                                        ].scoring.scale_labels = {
                                                            ...currentLabels,
                                                            [scoreValue]: e.target.value,
                                                        };
                                                        setDomains(updated);
                                                    }}
                                                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                                                    placeholder={`Criteria for score ${scoreValue}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {target.scoring.type === 'checkbox' && (
                                <div className="space-y-3">
                                    <label className="block text-xs font-medium text-gray-600">
                                        Task Analysis Steps
                                    </label>
                                    {(!target.scoring.task_steps ||
                                        target.scoring.task_steps.length === 0) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = [...domains];
                                                updated[domainIndex].targets[
                                                    targetIndex
                                                ].scoring.task_steps = ['Step 1'];
                                                setDomains(updated);
                                            }}
                                            className="text-xs text-emerald-600 underline"
                                        >
                                            Initialize Steps
                                        </button>
                                    )}
                                    {target.scoring.task_steps?.map((step, sIndex) => (
                                        <div key={sIndex} className="flex items-center gap-2">
                                            <span className="w-4 text-xs text-gray-500">
                                                {sIndex + 1}.
                                            </span>
                                            <input
                                                type="text"
                                                value={step}
                                                onChange={(e) => {
                                                    const updated = [...domains];
                                                    if (
                                                        !updated[domainIndex].targets[targetIndex]
                                                            .scoring.task_steps
                                                    ) {
                                                        updated[domainIndex].targets[
                                                            targetIndex
                                                        ].scoring.task_steps = [];
                                                    }
                                                    updated[domainIndex].targets[
                                                        targetIndex
                                                    ].scoring.task_steps![sIndex] = e.target.value;
                                                    setDomains(updated);
                                                }}
                                                className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                                                placeholder={`Step ${sIndex + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
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
