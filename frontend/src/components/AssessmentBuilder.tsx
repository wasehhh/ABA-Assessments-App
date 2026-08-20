import { useMemo, useState } from 'react';
import { AlertTriangle, Download, Info, Plus, Trash2 } from 'lucide-react';
import {
    ContentPackData,
    Domain,
    ScoringType,
    SecondaryGroupCatalogEntry,
    Target,
} from '../types';
import {
    ALPHA_DEFAULT_PRIMARY_LABEL,
    applyGlobalScaleLabels,
    applySecondaryGroupingDisabled,
    applySecondaryGroupingEnabled,
    BuilderAuthoringIssue,
    buildPackStructureLabels,
    collectPackOversizedWarnings,
    commitNumericScaleCsv,
    formatNumericScale,
    NEUTRAL_DEFAULT_PRIMARY_LABEL,
    NEUTRAL_DEFAULT_SECONDARY_LABEL,
    NEUTRAL_DEFAULT_TARGET_LABEL,
    OVERSIZED_WARNING_ADVICE,
    prepareBuilderPackForSave,
    reconcileScaleLabels,
    validateBuilderPackAuthoring,
} from '../utils/assessmentPackAuthoring';
import {
    appendTargetToDomain,
    getTargetsForSecondaryGroup,
    getUngroupedTargetEntries,
    moveTargetSecondaryGroup,
} from '../utils/assessmentPackBuilder';
import { denseTargetScoring } from '../utils/targetScoringAccess';
import { AssessmentBuilderTargetEditor } from './AssessmentBuilderTargetEditor';

interface Props {
    onSave: (packData: ContentPackData) => Promise<void>;
    onCancel: () => void;
    initialData?: ContentPackData & { title?: string; description?: string };
}

function scaleDraftKey(domainIndex: number, targetIndex: number): string {
    return `${domainIndex}:${targetIndex}`;
}

function collectReservedTargetIds(domains: Domain[]): string[] {
    return domains.flatMap((domain) => domain.targets.map((target) => target.target_id));
}

function parseDefaultScaleOrFallback(defaultScale: string, fallback: number[] = [0, 1, 2, 3, 4]): number[] {
    const result = commitNumericScaleCsv(defaultScale);
    return result.ok ? result.values : [...fallback];
}

const NEW_PACK_DEFAULT_SCALE = '0,1,2,3,4';

export interface InitialGlobalScaleState {
    useGlobalScale: boolean;
    defaultScale: string;
    globalScaleLabels: Record<number, string>;
}

function scalesEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((value, index) => value === b[index]);
}

function normalizeScaleLabels(
    labels: Record<number, string> | undefined
): Record<number, string> {
    return labels ? { ...labels } : {};
}

function scaleLabelsEqual(
    a: Record<number, string>,
    b: Record<number, string>
): boolean {
    const aEntries = Object.entries(a).sort(
        ([keyA], [keyB]) => Number(keyA) - Number(keyB)
    );
    const bEntries = Object.entries(b).sort(
        ([keyA], [keyB]) => Number(keyA) - Number(keyB)
    );
    if (aEntries.length !== bEntries.length) {
        return false;
    }
    return aEntries.every(
        ([key, value], index) =>
            key === bEntries[index][0] && value === bEntries[index][1]
    );
}

/**
 * Derive Builder global-scale checkbox / default scale / labels from pack data.
 * New packs (no initialData) keep the historical defaults (checkbox on, 0–4).
 * Existing packs only enable global scale when every numeric target shares the
 * same inline scale array and scale_labels. Numeric targets without an inline
 * `scale` fail closed (checkbox off) — Builder-saved packs always inline scale.
 */
export function deriveInitialGlobalScaleState(
    initialData?: ContentPackData & { title?: string; description?: string }
): InitialGlobalScaleState {
    if (!initialData) {
        return {
            useGlobalScale: true,
            defaultScale: NEW_PACK_DEFAULT_SCALE,
            globalScaleLabels: {},
        };
    }

    const numericTargets = (initialData.domains ?? []).flatMap((domain) =>
        domain.targets.filter((target) => target.scoring?.type === 'numeric')
    );

    if (numericTargets.length === 0) {
        return {
            useGlobalScale: false,
            defaultScale: NEW_PACK_DEFAULT_SCALE,
            globalScaleLabels: {},
        };
    }

    const scales: number[][] = [];
    const labelsList: Record<number, string>[] = [];

    for (const target of numericTargets) {
        const scale = target.scoring?.scale;
        if (scale === undefined) {
            return {
                useGlobalScale: false,
                defaultScale: NEW_PACK_DEFAULT_SCALE,
                globalScaleLabels: {},
            };
        }
        scales.push(scale);
        labelsList.push(normalizeScaleLabels(target.scoring?.scale_labels));
    }

    const sharedScale = scales[0];
    const sharedLabels = labelsList[0];
    const allUniform =
        scales.every((scale) => scalesEqual(scale, sharedScale)) &&
        labelsList.every((labels) => scaleLabelsEqual(labels, sharedLabels));

    if (!allUniform) {
        return {
            useGlobalScale: false,
            defaultScale: NEW_PACK_DEFAULT_SCALE,
            globalScaleLabels: {},
        };
    }

    return {
        useGlobalScale: true,
        defaultScale: formatNumericScale(sharedScale),
        globalScaleLabels: sharedLabels,
    };
}

export function AssessmentBuilder({ onSave, onCancel, initialData }: Props) {
    const initialGlobalScaleState = deriveInitialGlobalScaleState(initialData);
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [domains, setDomains] = useState<Domain[]>(initialData?.domains || []);
    const [defaultScale, setDefaultScale] = useState(initialGlobalScaleState.defaultScale);
    const [defaultScaleError, setDefaultScaleError] = useState<string | null>(null);
    const [globalScaleLabels, setGlobalScaleLabels] = useState<Record<number, string>>(
        initialGlobalScaleState.globalScaleLabels
    );
    const [useGlobalScale, setUseGlobalScale] = useState(initialGlobalScaleState.useGlobalScale);
    const [targetScaleDrafts, setTargetScaleDrafts] = useState<Record<string, string>>({});
    const [authoringIssues, setAuthoringIssues] = useState<BuilderAuthoringIssue[]>([]);
    const [primaryGroupLabel, setPrimaryGroupLabel] = useState(
        initialData?.structure_labels?.primary_group ?? 'Domain'
    );
    const [targetLabel, setTargetLabel] = useState(
        initialData?.structure_labels?.target ?? 'Target'
    );
    const [secondaryGroupLabel, setSecondaryGroupLabel] = useState(
        initialData?.structure_labels?.secondary_group ?? ''
    );
    const [secondaryGroupingEnabled, setSecondaryGroupingEnabled] = useState(
        Boolean(initialData?.structure_labels?.secondary_group?.trim())
    );

    const primaryLabel = secondaryGroupingEnabled
        ? primaryGroupLabel.trim() || NEUTRAL_DEFAULT_PRIMARY_LABEL
        : primaryGroupLabel.trim() || ALPHA_DEFAULT_PRIMARY_LABEL;
    const targetLabelText = targetLabel.trim() || NEUTRAL_DEFAULT_TARGET_LABEL;
    const secondaryLabel = secondaryGroupLabel.trim() || NEUTRAL_DEFAULT_SECONDARY_LABEL;

    const handleSecondaryGroupingToggle = (enabled: boolean) => {
        const fields = {
            primaryGroup: primaryGroupLabel,
            secondaryGroup: secondaryGroupLabel,
            target: targetLabel,
        };
        const next = enabled
            ? applySecondaryGroupingEnabled(fields)
            : applySecondaryGroupingDisabled(fields);

        setPrimaryGroupLabel(next.primaryGroup);
        setSecondaryGroupLabel(next.secondaryGroup);
        setTargetLabel(next.target);
        setSecondaryGroupingEnabled(enabled);
    };

    const oversizedWarnings = useMemo(() => {
        const draft: ContentPackData = {
            pack_id: 'draft',
            org_id: '',
            title,
            description,
            version: '1.0',
            structure_labels: buildPackStructureLabels(
                primaryGroupLabel,
                targetLabel,
                secondaryGroupLabel,
                secondaryGroupingEnabled
            ),
            domains,
        };
        return collectPackOversizedWarnings(draft);
    }, [
        domains,
        title,
        description,
        primaryGroupLabel,
        targetLabel,
        secondaryGroupLabel,
        secondaryGroupingEnabled,
    ]);

    const defaultScaleCommit = commitNumericScaleCsv(defaultScale);
    const defaultScaleValues = defaultScaleCommit.ok ? defaultScaleCommit.values : [];

    const issueFor = (
        field: BuilderAuthoringIssue['field'],
        domainIndex?: number,
        targetIndex?: number
    ): string | null => {
        const match = authoringIssues.find((issue) => {
            if (issue.field !== field) {
                return false;
            }
            if (domainIndex !== undefined && issue.domainIndex !== domainIndex) {
                return false;
            }
            if (targetIndex !== undefined && issue.targetIndex !== targetIndex) {
                return false;
            }
            return true;
        });
        return match?.message ?? null;
    };

    const getTargetScaleDraft = (domainIndex: number, targetIndex: number, target: Target): string => {
        const key = scaleDraftKey(domainIndex, targetIndex);
        if (Object.prototype.hasOwnProperty.call(targetScaleDrafts, key)) {
            return targetScaleDrafts[key];
        }
        return formatNumericScale(denseTargetScoring(target).scale ?? []);
    };

    const clearAuthoringIssue = (
        field: BuilderAuthoringIssue['field'],
        domainIndex?: number,
        targetIndex?: number
    ) => {
        setAuthoringIssues((prev) =>
            prev.filter((issue) => {
                if (issue.field !== field) {
                    return true;
                }
                if (domainIndex !== undefined && issue.domainIndex !== domainIndex) {
                    return true;
                }
                if (targetIndex !== undefined && issue.targetIndex !== targetIndex) {
                    return true;
                }
                return false;
            })
        );
    };

    const addDomain = () => {
        setDomains([
            ...domains,
            {
                domain_id: '',
                title: '',
                description: '',
                targets: [],
            },
        ]);
    };

    const removeDomain = (index: number) => {
        setDomains(domains.filter((_, i) => i !== index));
        setTargetScaleDrafts({});
        setAuthoringIssues([]);
    };

    const updateDomain = (index: number, field: keyof Domain, value: Domain[keyof Domain]) => {
        const updated = [...domains];
        updated[index] = { ...updated[index], [field]: value };
        setDomains(updated);
        if (field === 'domain_id') {
            clearAuthoringIssue('domain_id', index);
        }
    };

    const addSecondaryGroup = (domainIndex: number) => {
        const updated = [...domains];
        const domain = updated[domainIndex];
        const existing = domain.secondary_groups ?? [];
        const nextIndex = existing.length + 1;
        const entry: SecondaryGroupCatalogEntry = {
            secondary_group_id: `${domain.domain_id || 'G'}_${nextIndex}`,
            title: `${secondaryLabel} ${nextIndex}`,
        };
        updateDomain(domainIndex, 'secondary_groups', [...existing, entry]);
    };

    const updateSecondaryGroup = (
        domainIndex: number,
        groupIndex: number,
        field: keyof SecondaryGroupCatalogEntry,
        value: string
    ) => {
        const updated = [...domains];
        const groups = [...(updated[domainIndex].secondary_groups ?? [])];
        const previousId = groups[groupIndex]?.secondary_group_id;
        groups[groupIndex] = { ...groups[groupIndex], [field]: value };
        updated[domainIndex].secondary_groups = groups;
        if (field === 'secondary_group_id' && previousId && previousId !== value) {
            updated[domainIndex].targets = updated[domainIndex].targets.map((target) =>
                target.secondary_group_id === previousId
                    ? { ...target, secondary_group_id: value }
                    : target
            );
        }
        setDomains(updated);
    };

    const removeSecondaryGroup = (domainIndex: number, groupIndex: number) => {
        const updated = [...domains];
        const removedId = updated[domainIndex].secondary_groups?.[groupIndex]?.secondary_group_id;
        const groups = (updated[domainIndex].secondary_groups ?? []).filter(
            (_, index) => index !== groupIndex
        );
        updated[domainIndex].secondary_groups = groups.length > 0 ? groups : undefined;
        if (removedId) {
            updated[domainIndex].targets = updated[domainIndex].targets.map((target) =>
                target.secondary_group_id === removedId
                    ? { ...target, secondary_group_id: undefined }
                    : target
            );
        }
        setDomains(updated);
    };

    const addTarget = (domainIndex: number, secondaryGroupId?: string) => {
        const updated = [...domains];
        updated[domainIndex] = appendTargetToDomain(
            updated[domainIndex],
            parseDefaultScaleOrFallback(defaultScale),
            secondaryGroupId,
            collectReservedTargetIds(domains)
        );
        setDomains(updated);
    };

    const moveTargetToGroup = (
        domainIndex: number,
        targetIndex: number,
        secondaryGroupId?: string
    ) => {
        const updated = [...domains];
        updated[domainIndex] = moveTargetSecondaryGroup(
            updated[domainIndex],
            targetIndex,
            secondaryGroupId
        );
        setDomains(updated);
    };

    const removeTarget = (domainIndex: number, targetIndex: number) => {
        const updated = [...domains];
        updated[domainIndex].targets = updated[domainIndex].targets.filter(
            (_, i) => i !== targetIndex
        );
        setDomains(updated);
        setTargetScaleDrafts({});
        setAuthoringIssues((prev) =>
            prev.filter(
                (issue) =>
                    !(issue.domainIndex === domainIndex && issue.targetIndex === targetIndex)
            )
        );
    };

    const updateTarget = (
        domainIndex: number,
        targetIndex: number,
        field: keyof Target,
        value: Target[keyof Target]
    ) => {
        const updated = [...domains];
        updated[domainIndex].targets[targetIndex] = {
            ...updated[domainIndex].targets[targetIndex],
            [field]: value,
        };
        setDomains(updated);
        if (field === 'target_id') {
            clearAuthoringIssue('target_id', domainIndex, targetIndex);
        }
    };

    const updateTargetScaleDraft = (
        domainIndex: number,
        targetIndex: number,
        draft: string
    ) => {
        const key = scaleDraftKey(domainIndex, targetIndex);
        setTargetScaleDrafts((prev) => ({ ...prev, [key]: draft }));
        clearAuthoringIssue('scale', domainIndex, targetIndex);
    };

    const commitTargetScale = (
        domainIndex: number,
        targetIndex: number,
        domainsSnapshot: Domain[] = domains,
        draftsSnapshot: Record<string, string> = targetScaleDrafts
    ): { ok: true; domains: Domain[] } | { ok: false; error: string; domains: Domain[] } => {
        const target = domainsSnapshot[domainIndex]?.targets[targetIndex];
        if (!target) {
            return { ok: true, domains: domainsSnapshot };
        }
        const scoring = denseTargetScoring(target);
        if (scoring.type !== 'numeric') {
            return { ok: true, domains: domainsSnapshot };
        }

        const key = scaleDraftKey(domainIndex, targetIndex);
        const draft = Object.prototype.hasOwnProperty.call(draftsSnapshot, key)
            ? draftsSnapshot[key]
            : formatNumericScale(scoring.scale ?? []);
        const result = commitNumericScaleCsv(draft);
        if (!result.ok) {
            return { ok: false, error: result.error, domains: domainsSnapshot };
        }

        const updated = domainsSnapshot.map((domain, dIndex) => {
            if (dIndex !== domainIndex) {
                return domain;
            }
            return {
                ...domain,
                targets: domain.targets.map((entry, tIndex) => {
                    if (tIndex !== targetIndex) {
                        return entry;
                    }
                    const entryScoring = denseTargetScoring(entry);
                    return {
                        ...entry,
                        scoring: {
                            ...entryScoring,
                            scale: result.values,
                            scale_labels: reconcileScaleLabels(
                                result.values,
                                entryScoring.scale_labels
                            ),
                        },
                    };
                }),
            };
        });

        return { ok: true, domains: updated };
    };

    const onCommitTargetScale = (domainIndex: number, targetIndex: number) => {
        const result = commitTargetScale(domainIndex, targetIndex);
        if (!result.ok) {
            setAuthoringIssues((prev) => [
                ...prev.filter(
                    (issue) =>
                        !(
                            issue.field === 'scale' &&
                            issue.domainIndex === domainIndex &&
                            issue.targetIndex === targetIndex
                        )
                ),
                {
                    field: 'scale',
                    domainIndex,
                    targetIndex,
                    message: result.error,
                },
            ]);
            return;
        }

        setDomains(result.domains);
        const key = scaleDraftKey(domainIndex, targetIndex);
        const committed =
            denseTargetScoring(result.domains[domainIndex].targets[targetIndex]).scale ?? [];
        setTargetScaleDrafts((prev) => ({
            ...prev,
            [key]: formatNumericScale(committed),
        }));
        clearAuthoringIssue('scale', domainIndex, targetIndex);
    };

    const commitAllTargetScaleDrafts = (
        domainsSnapshot: Domain[],
        draftsSnapshot: Record<string, string>
    ): { domains: Domain[]; issues: BuilderAuthoringIssue[] } => {
        let nextDomains = domainsSnapshot;
        const issues: BuilderAuthoringIssue[] = [];

        domainsSnapshot.forEach((domain, domainIndex) => {
            domain.targets.forEach((target, targetIndex) => {
                if (denseTargetScoring(target).type !== 'numeric') {
                    return;
                }
                const result = commitTargetScale(
                    domainIndex,
                    targetIndex,
                    nextDomains,
                    draftsSnapshot
                );
                if (!result.ok) {
                    issues.push({
                        field: 'scale',
                        domainIndex,
                        targetIndex,
                        message: result.error,
                    });
                    return;
                }
                nextDomains = result.domains;
            });
        });

        return { domains: nextDomains, issues };
    };

    const updateScoringType = (
        domainIndex: number,
        targetIndex: number,
        scoringType: ScoringType
    ) => {
        const updated = [...domains];
        const target = updated[domainIndex].targets[targetIndex];
        const scoring = { ...denseTargetScoring(target), type: scoringType };

        if (scoringType === 'checkbox') {
            scoring.task_steps = ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'];
            delete scoring.scale;
        } else if (scoringType === 'yesno' || scoringType === 'text') {
            delete scoring.scale;
            delete scoring.task_steps;
        } else {
            const scale = parseDefaultScaleOrFallback(defaultScale);
            scoring.scale = scale;
            scoring.scale_labels = reconcileScaleLabels(scale, scoring.scale_labels);
            delete scoring.task_steps;
        }

        updated[domainIndex].targets[targetIndex] = { ...target, scoring };
        setDomains(updated);
        const key = scaleDraftKey(domainIndex, targetIndex);
        setTargetScaleDrafts((prev) => {
            const next = { ...prev };
            if (scoringType === 'numeric') {
                next[key] = formatNumericScale(
                    denseTargetScoring(updated[domainIndex].targets[targetIndex]).scale ?? []
                );
            } else {
                delete next[key];
            }
            return next;
        });
        clearAuthoringIssue('scale', domainIndex, targetIndex);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let workingDomains = domains;
        let workingDefaultScale = defaultScale;
        let workingGlobalLabels = globalScaleLabels;
        const draftIssues: BuilderAuthoringIssue[] = [];

        if (useGlobalScale) {
            const globalResult = commitNumericScaleCsv(defaultScale);
            if (!globalResult.ok) {
                setDefaultScaleError(globalResult.error);
                draftIssues.push({
                    field: 'default_scale',
                    message: globalResult.error,
                });
            } else {
                setDefaultScaleError(null);
                workingDefaultScale = formatNumericScale(globalResult.values);
                setDefaultScale(workingDefaultScale);
                workingGlobalLabels = reconcileScaleLabels(
                    globalResult.values,
                    globalScaleLabels
                );
                setGlobalScaleLabels(workingGlobalLabels);
            }
            workingDomains = applyGlobalScaleLabels(workingDomains, workingGlobalLabels);
        } else {
            const committed = commitAllTargetScaleDrafts(workingDomains, targetScaleDrafts);
            workingDomains = committed.domains;
            draftIssues.push(...committed.issues);
            setDomains(workingDomains);
            const nextDrafts: Record<string, string> = { ...targetScaleDrafts };
            workingDomains.forEach((domain, domainIndex) => {
                domain.targets.forEach((target, targetIndex) => {
                    const scoring = denseTargetScoring(target);
                    if (scoring.type === 'numeric' && scoring.scale) {
                        nextDrafts[scaleDraftKey(domainIndex, targetIndex)] = formatNumericScale(
                            scoring.scale
                        );
                    }
                });
            });
            setTargetScaleDrafts(nextDrafts);
        }

        const packData: ContentPackData = {
            pack_id: initialData?.pack_id || `custom_${Date.now()}`,
            org_id: initialData?.org_id || '',
            title,
            description,
            version: initialData?.version || '1.0',
            structure_labels: buildPackStructureLabels(
                primaryGroupLabel,
                targetLabel,
                secondaryGroupLabel,
                secondaryGroupingEnabled
            ),
            domains: workingDomains,
        };

        const validated = validateBuilderPackAuthoring(packData, {
            useGlobalScale,
            defaultScaleCsv: workingDefaultScale,
        });

        const mergedIssues = [...draftIssues];
        for (const issue of validated) {
            const alreadyPresent = draftIssues.some(
                (draftIssue) =>
                    draftIssue.field === issue.field &&
                    draftIssue.domainIndex === issue.domainIndex &&
                    draftIssue.targetIndex === issue.targetIndex
            );
            if (!alreadyPresent) {
                mergedIssues.push(issue);
            }
        }

        if (mergedIssues.length > 0) {
            setAuthoringIssues(mergedIssues);
            return;
        }

        setAuthoringIssues([]);
        await onSave(prepareBuilderPackForSave(packData));
    };

    const downloadTemplate = () => {
        const csv = [
            'domain_id,domain_title,domain_description,target_id,title,description,success_criteria,materials,instructions,examples,notes,secondary_group_id,secondary_group_title,scoring_type,scale,scale_labels',
            'A,"Cooperation, Reinforcer",Domain context optional,A1,Gross motor imitation,Looks at trainer; imitates posture,Independent for 8/10 trials,"Mirror, mat","Observe from beside learner; reinforce each trial",Eg: clap after model,Starter row,,,numeric,"0,1,2,3,4","0:Not Yet|1:Emerging|2:In Progress|3:Advanced|4:Mastered"',
            'A,,,A2,Attends reinforcer,Orients toward preferred stimuli,Orient within 3s for 80% probes,"Toys, reinforcers",Paired stimulus presentation,,,sg_listen,Listening,,,',
            '# Optional columns: secondary_group_id, secondary_group_title, scoring_type, scale, scale_labels',
            '# scale_labels format: 0:Not Yet|1:Emerging|2:Mastered',
            '# Quoted fields may contain commas. Empty domain_title on later rows reuses the title from the first row of that domain_id.',
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assessment-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Build Custom Assessment</h2>
                <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm"
                >
                    <Download className="w-4 h-4" />
                    Download CSV Template
                </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-900">
                    <p className="font-semibold mb-1">Assessment Builder</p>
                    <p>
                        Create custom assessments with optional secondary grouping, configurable
                        structure labels, inline scoring scales, and display labels. Flat packs
                        behave exactly as before.
                    </p>
                </div>
            </div>

            {oversizedWarnings.length > 0 ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                    <div className="flex gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <div className="space-y-2">
                            <p className="font-semibold">Oversized group warning (non-blocking)</p>
                            <p>{OVERSIZED_WARNING_ADVICE}</p>
                            <ul className="list-disc space-y-1 pl-5">
                                {oversizedWarnings.map((warning, index) => (
                                    <li key={`${warning.domainId}-${warning.tier}-${warning.secondaryGroupId ?? 'primary'}-${index}`}>
                                        {warning.tier === 'primary'
                                            ? `${warning.domainTitle}: ${warning.targetCount} targets (${warning.level})`
                                            : `${warning.domainTitle} · ${warning.secondaryGroupTitle}: ${warning.targetCount} targets (${warning.level})`}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assessment Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                clearAuthoringIssue('title');
                            }}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${
                                issueFor('title') ? 'border-red-400' : 'border-gray-300'
                            }`}
                            placeholder="e.g., Custom ABA Assessment"
                            required
                        />
                        {issueFor('title') ? (
                            <p className="mt-1 text-xs text-red-600">{issueFor('title')}</p>
                        ) : null}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            placeholder="Brief description of the assessment"
                        />
                    </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Structure Labels</h3>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={secondaryGroupingEnabled}
                            onChange={(e) => handleSecondaryGroupingToggle(e.target.checked)}
                            className="rounded"
                        />
                        Enable secondary grouping
                    </label>
                    <div
                        className={`grid grid-cols-1 gap-3 ${secondaryGroupingEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
                    >
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Primary group label
                            </label>
                            <input
                                type="text"
                                value={primaryGroupLabel}
                                onChange={(e) => setPrimaryGroupLabel(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                placeholder={
                                    secondaryGroupingEnabled
                                        ? NEUTRAL_DEFAULT_PRIMARY_LABEL
                                        : ALPHA_DEFAULT_PRIMARY_LABEL
                                }
                            />
                        </div>
                        {secondaryGroupingEnabled && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Secondary group label
                                </label>
                                <input
                                    type="text"
                                    value={secondaryGroupLabel}
                                    onChange={(e) => setSecondaryGroupLabel(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                    placeholder={NEUTRAL_DEFAULT_SECONDARY_LABEL}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Target label
                            </label>
                            <input
                                type="text"
                                value={targetLabel}
                                onChange={(e) => setTargetLabel(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                placeholder={NEUTRAL_DEFAULT_TARGET_LABEL}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        {secondaryGroupingEnabled
                            ? `${primaryLabel} → ${secondaryLabel} → ${targetLabelText}`
                            : `${primaryLabel} → ${targetLabelText}`}
                    </p>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="checkbox"
                            id="useGlobalScale"
                            checked={useGlobalScale}
                            onChange={(e) => setUseGlobalScale(e.target.checked)}
                            className="rounded"
                        />
                        <label htmlFor="useGlobalScale" className="text-sm font-medium text-gray-700">
                            Use same scoring scale for all targets
                        </label>
                    </div>
                    {useGlobalScale && (
                        <>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Default Scoring Scale
                            </label>
                            <input
                                type="text"
                                value={defaultScale}
                                onChange={(e) => {
                                    setDefaultScale(e.target.value);
                                    setDefaultScaleError(null);
                                    clearAuthoringIssue('default_scale');
                                }}
                                onBlur={() => {
                                    const result = commitNumericScaleCsv(defaultScale);
                                    if (!result.ok) {
                                        setDefaultScaleError(result.error);
                                        return;
                                    }
                                    setDefaultScaleError(null);
                                    setDefaultScale(formatNumericScale(result.values));
                                    setGlobalScaleLabels((prev) =>
                                        reconcileScaleLabels(result.values, prev)
                                    );
                                }}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${
                                    defaultScaleError || issueFor('default_scale')
                                        ? 'border-red-400'
                                        : 'border-gray-300'
                                }`}
                                placeholder="e.g., 0,1,2,3,4 or 0,0.5,1 or -1,0,1"
                                aria-invalid={Boolean(
                                    defaultScaleError || issueFor('default_scale')
                                )}
                            />
                            {defaultScaleError || issueFor('default_scale') ? (
                                <p className="text-xs text-red-600 mt-1">
                                    {defaultScaleError || issueFor('default_scale')}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-500 mt-1">
                                    New targets snapshot this scale when created. Changing it later
                                    does not rewrite existing target scales. Score criteria below are
                                    applied to all targets on save.
                                </p>
                            )}

                            <div className="mt-4 space-y-2 pl-4 border-l-2 border-gray-100">
                                <label className="block text-sm font-medium text-gray-700">
                                    Score Criteria Definitions
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Define what each score means (e.g. 4 = Independent)
                                </p>
                                {defaultScaleValues.map((scoreValue) => (
                                    <div key={scoreValue} className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-700 w-8">
                                            {scoreValue} =
                                        </span>
                                        <input
                                            type="text"
                                            value={globalScaleLabels[scoreValue] || ''}
                                            onChange={(e) =>
                                                setGlobalScaleLabels((prev) => ({
                                                    ...prev,
                                                    [scoreValue]: e.target.value,
                                                }))
                                            }
                                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                                            placeholder={`Definition for score ${scoreValue}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {!useGlobalScale && (
                        <p className="text-sm text-gray-600">
                            Customize scoring for each target below. Target-specific scales are kept
                            when you save and reopen the pack.
                        </p>
                    )}
                </div>
            </div>

            <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {primaryLabel}s & {targetLabelText}s
                    </h3>
                    <button
                        type="button"
                        onClick={addDomain}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add {primaryLabel}
                    </button>
                </div>

                <div className="space-y-6">
                    {domains.map((domain, dIndex) => (
                        <div key={dIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-4 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                {primaryLabel} ID
                                            </label>
                                            <input
                                                type="text"
                                                value={domain.domain_id}
                                                onChange={(e) =>
                                                    updateDomain(dIndex, 'domain_id', e.target.value)
                                                }
                                                className={`w-full px-3 py-2 border rounded text-sm ${
                                                    issueFor('domain_id', dIndex)
                                                        ? 'border-red-400'
                                                        : 'border-gray-300'
                                                }`}
                                                placeholder="A"
                                                required
                                            />
                                            {issueFor('domain_id', dIndex) ? (
                                                <p className="mt-1 text-xs text-red-600">
                                                    {issueFor('domain_id', dIndex)}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                {primaryLabel} Title
                                            </label>
                                            <input
                                                type="text"
                                                value={domain.title}
                                                onChange={(e) =>
                                                    updateDomain(dIndex, 'title', e.target.value)
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                placeholder="e.g., Receptive Language"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            {primaryLabel} Description (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={domain.description || ''}
                                            onChange={(e) =>
                                                updateDomain(dIndex, 'description', e.target.value)
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                            placeholder="Brief description of this skill domain"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeDomain(dIndex)}
                                    className="text-red-600 hover:text-red-700 p-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {secondaryGroupingEnabled ? (
                                <div className="ml-2 mt-4 space-y-4 border-t border-gray-200 pt-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-gray-700">
                                            {secondaryLabel}s
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => addSecondaryGroup(dIndex)}
                                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add {secondaryLabel}
                                        </button>
                                    </div>
                                    {(domain.secondary_groups ?? []).length === 0 ? (
                                        <p className="text-xs text-gray-500">
                                            Add a {secondaryLabel.toLowerCase()} to start authoring{' '}
                                            {targetLabelText.toLowerCase()}s within this{' '}
                                            {primaryLabel.toLowerCase()}.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {(domain.secondary_groups ?? []).map(
                                                (group, groupIndex) => (
                                                    <div
                                                        key={`${group.secondary_group_id}-${groupIndex}`}
                                                        className="ml-2 space-y-3 border-l-2 border-gray-300 pl-4"
                                                    >
                                                        <div className="space-y-2 border-b border-gray-200 pb-3">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h5 className="text-sm font-medium text-gray-800">
                                                                    {group.title || secondaryLabel}
                                                                </h5>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeSecondaryGroup(
                                                                            dIndex,
                                                                            groupIndex
                                                                        )
                                                                    }
                                                                    className="text-red-600 hover:text-red-700"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={group.secondary_group_id}
                                                                    onChange={(e) =>
                                                                        updateSecondaryGroup(
                                                                            dIndex,
                                                                            groupIndex,
                                                                            'secondary_group_id',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                                                                    placeholder="group_id"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={group.title}
                                                                    onChange={(e) =>
                                                                        updateSecondaryGroup(
                                                                            dIndex,
                                                                            groupIndex,
                                                                            'title',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                                                                    placeholder="Group title"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {getTargetsForSecondaryGroup(
                                                                domain,
                                                                group.secondary_group_id
                                                            ).map(({ target, index: tIndex }) => (
                                                                <AssessmentBuilderTargetEditor
                                                                    key={`${group.secondary_group_id}-${tIndex}`}
                                                                    domainIndex={dIndex}
                                                                    targetIndex={tIndex}
                                                                    target={target}
                                                                    targetLabelText={targetLabelText}
                                                                    secondaryLabel={secondaryLabel}
                                                                    useGlobalScale={useGlobalScale}
                                                                    secondaryGroups={
                                                                        domain.secondary_groups
                                                                    }
                                                                    showMoveToGroup
                                                                    domains={domains}
                                                                    setDomains={setDomains}
                                                                    scaleDraft={getTargetScaleDraft(
                                                                        dIndex,
                                                                        tIndex,
                                                                        target
                                                                    )}
                                                                    scaleError={issueFor(
                                                                        'scale',
                                                                        dIndex,
                                                                        tIndex
                                                                    )}
                                                                    targetIdError={issueFor(
                                                                        'target_id',
                                                                        dIndex,
                                                                        tIndex
                                                                    )}
                                                                    onUpdateTarget={updateTarget}
                                                                    onScaleDraftChange={
                                                                        updateTargetScaleDraft
                                                                    }
                                                                    onCommitTargetScale={
                                                                        onCommitTargetScale
                                                                    }
                                                                    onUpdateScoringType={
                                                                        updateScoringType
                                                                    }
                                                                    onRemoveTarget={removeTarget}
                                                                    onMoveToGroup={moveTargetToGroup}
                                                                />
                                                            ))}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                addTarget(
                                                                    dIndex,
                                                                    group.secondary_group_id
                                                                )
                                                            }
                                                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            Add {targetLabelText}
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                    {getUngroupedTargetEntries(domain).length > 0 ? (
                                        <div className="ml-2 space-y-3 border-l-2 border-dashed border-gray-300 pl-4">
                                            <h5 className="text-sm font-medium text-gray-700">
                                                Ungrouped {targetLabelText}s
                                            </h5>
                                            <div className="space-y-2">
                                                {getUngroupedTargetEntries(domain).map(
                                                    ({ target, index: tIndex }) => (
                                                        <AssessmentBuilderTargetEditor
                                                            key={`ungrouped-${tIndex}`}
                                                            domainIndex={dIndex}
                                                            targetIndex={tIndex}
                                                            target={target}
                                                            targetLabelText={targetLabelText}
                                                            secondaryLabel={secondaryLabel}
                                                            useGlobalScale={useGlobalScale}
                                                            secondaryGroups={domain.secondary_groups}
                                                            showMoveToGroup
                                                            domains={domains}
                                                            setDomains={setDomains}
                                                            scaleDraft={getTargetScaleDraft(
                                                                dIndex,
                                                                tIndex,
                                                                target
                                                            )}
                                                            scaleError={issueFor(
                                                                'scale',
                                                                dIndex,
                                                                tIndex
                                                            )}
                                                            targetIdError={issueFor(
                                                                'target_id',
                                                                dIndex,
                                                                tIndex
                                                            )}
                                                            onUpdateTarget={updateTarget}
                                                            onScaleDraftChange={
                                                                updateTargetScaleDraft
                                                            }
                                                            onCommitTargetScale={onCommitTargetScale}
                                                            onUpdateScoringType={updateScoringType}
                                                            onRemoveTarget={removeTarget}
                                                            onMoveToGroup={moveTargetToGroup}
                                                        />
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="ml-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-gray-700">
                                            {targetLabelText}s
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => addTarget(dIndex)}
                                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add {targetLabelText}
                                        </button>
                                    </div>

                                    {domain.targets.map((target, tIndex) => (
                                        <AssessmentBuilderTargetEditor
                                            key={tIndex}
                                            domainIndex={dIndex}
                                            targetIndex={tIndex}
                                            target={target}
                                            targetLabelText={targetLabelText}
                                            secondaryLabel={secondaryLabel}
                                            useGlobalScale={useGlobalScale}
                                            showMoveToGroup={false}
                                            domains={domains}
                                            setDomains={setDomains}
                                            scaleDraft={getTargetScaleDraft(dIndex, tIndex, target)}
                                            scaleError={issueFor('scale', dIndex, tIndex)}
                                            targetIdError={issueFor('target_id', dIndex, tIndex)}
                                            onUpdateTarget={updateTarget}
                                            onScaleDraftChange={updateTargetScaleDraft}
                                            onCommitTargetScale={onCommitTargetScale}
                                            onUpdateScoringType={updateScoringType}
                                            onRemoveTarget={removeTarget}
                                            onMoveToGroup={moveTargetToGroup}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {domains.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        Click &quot;Add {primaryLabel}&quot; to start building your assessment
                    </div>
                )}
            </div>

            {authoringIssues.length > 0 ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    Fix {authoringIssues.length} authoring{' '}
                    {authoringIssues.length === 1 ? 'issue' : 'issues'} before saving. Inline
                    messages mark the fields that need attention.
                </div>
            ) : null}

            <div className="flex gap-3 pt-4 border-t">
                <button
                    type="submit"
                    disabled={domains.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2.5 rounded-lg font-medium"
                >
                    Save Assessment Pack
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2.5 rounded-lg font-medium"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
