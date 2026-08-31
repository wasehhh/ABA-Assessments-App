import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Download, Info, Plus, Trash2 } from 'lucide-react';
import {
    ContentPackData,
    Domain,
    PackDefaultScoring,
    PackScoringMode,
    ScoringScaleDefinition,
    ScoringType,
    SecondaryGroupCatalogEntry,
    Target,
} from '../types';
import {
    ALPHA_DEFAULT_PRIMARY_LABEL,
    applySecondaryGroupingDisabled,
    applySecondaryGroupingEnabled,
    BuilderAuthoringIssue,
    buildPackStructureLabels,
    collectPackOversizedWarnings,
    commitNumericScaleCsv,
    formatNumericScale,
    isSecondaryGroupingEnabled,
    NEUTRAL_DEFAULT_PRIMARY_LABEL,
    NEUTRAL_DEFAULT_SECONDARY_LABEL,
    NEUTRAL_DEFAULT_TARGET_LABEL,
    OVERSIZED_WARNING_ADVICE,
    normalizePackIdentifiers,
    reconcileScaleLabels,
    validateBuilderPackAuthoring,
} from '../utils/assessmentPackAuthoring';
import {
    clearAllTargetScoringOverrides,
    domainsHaveScoringOverrides,
    NEW_PACK_DEFAULT_SCALE_CSV,
    NEW_PACK_DEFAULT_SCALE_VALUES,
    seedBuilderWorkingPack,
    normalizeCanonicalPackForSave,
} from '../utils/assessmentPackCanonical';
import {
    applyCustomizeOverride,
    applyRevertToInherited,
} from '../utils/assessmentBuilderOverrideUi';
import {
    createBuilderTarget,
    getTargetsForSecondaryGroup,
    getUngroupedTargetEntries,
    moveTargetSecondaryGroup,
} from '../utils/assessmentPackBuilder';
import { pluralizeStructureLabel } from '../utils/assessmentPackStructure';
import { AssessmentBuilderTargetEditor } from './AssessmentBuilderTargetEditor';
import { ConfirmDialog } from './ConfirmDialog';
import {
    buildBuilderSessionSnapshot,
    builderSessionSnapshotsEqual,
    focusBuilderIssueAnchor,
    revealBuilderIssueAnchor,
    type BuilderSessionSnapshotInput,
} from '../utils/assessmentBuilderSession';

interface Props {
    onSave: (packData: ContentPackData) => Promise<void>;
    onCancel: () => void;
    initialData?: ContentPackData & { title?: string; description?: string };
    onSessionChange?: (state: { isDirty: boolean }) => void;
    /** Edit session identity (PR C1b conflict detection). */
    packId?: string;
    /** Revision token captured at session open — parent uses for save conflict check. */
    sessionOpenedAtRevision?: string;
    /** Sticky page H1 subtitle — New pack vs Editing: {title}. */
    sessionSubtitle: string;
    /** Form id so sticky Save (outside the card) can submit. */
    formId: string;
}

/** Add Domain / Add Target — same secondary family; not filled accent (Phase D B5). */
const BUILDER_SECONDARY_ADD_CLASS =
    'inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50';

function scaleDraftKey(domainIndex: number, targetIndex: number): string {
    return `${domainIndex}:${targetIndex}`;
}

function collectReservedTargetIds(domains: Domain[]): string[] {
    return domains.flatMap((domain) => domain.targets.map((target) => target.target_id));
}

function parseDefaultScaleOrFallback(
    defaultScale: string,
    fallback: number[] = [...NEW_PACK_DEFAULT_SCALE_VALUES]
): number[] {
    const result = commitNumericScaleCsv(defaultScale);
    return result.ok ? result.values : [...fallback];
}

function stripSecondaryGroupingIfDisabled(pack: ContentPackData): ContentPackData {
    if (isSecondaryGroupingEnabled(pack.structure_labels)) {
        return pack;
    }

    return {
        ...pack,
        structure_labels: pack.structure_labels
            ? {
                  primary_group: pack.structure_labels.primary_group,
                  target: pack.structure_labels.target,
              }
            : undefined,
        domains: pack.domains.map((domain) => ({
            ...domain,
            secondary_groups: undefined,
            targets: domain.targets.map((target) => {
                const { secondary_group_id: _removed, ...rest } = target;
                return rest;
            }),
        })),
    };
}

function defaultScaleCsvFromScoring(scoring: PackDefaultScoring): string {
    if (scoring.scale && scoring.scale.length > 0) {
        return formatNumericScale(scoring.scale);
    }
    return NEW_PACK_DEFAULT_SCALE_CSV;
}

export function AssessmentBuilder({
    onSave,
    onCancel,
    initialData,
    onSessionChange,
    packId,
    sessionOpenedAtRevision,
    sessionSubtitle,
    formId,
}: Props) {
    const workingSeed = seedBuilderWorkingPack(initialData);
    const initialTitle = initialData?.title || '';
    const initialDescription = initialData?.description || '';
    const initialPrimaryGroupLabel = initialData?.structure_labels?.primary_group ?? 'Domain';
    const initialTargetLabel = initialData?.structure_labels?.target ?? 'Target';
    const initialSecondaryGroupLabel = initialData?.structure_labels?.secondary_group ?? '';
    const initialSecondaryGroupingEnabled = Boolean(
        initialData?.structure_labels?.secondary_group?.trim()
    );
    const initialDefaultScale = defaultScaleCsvFromScoring(workingSeed.default_scoring);
    const initialGlobalScaleLabels = { ...(workingSeed.default_scoring.scale_labels ?? {}) };

    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [domains, setDomains] = useState<Domain[]>(workingSeed.domains);
    const [scoringMode, setScoringMode] = useState<PackScoringMode>(workingSeed.scoring_mode);
    const [defaultScoring, setDefaultScoring] = useState<PackDefaultScoring>(
        workingSeed.default_scoring
    );
    const [scoringScales] = useState<ScoringScaleDefinition[] | undefined>(
        workingSeed.scoring_scales
    );
    const [defaultScale, setDefaultScale] = useState(initialDefaultScale);
    const [defaultScaleError, setDefaultScaleError] = useState<string | null>(null);
    const [globalScaleLabels, setGlobalScaleLabels] = useState<Record<number, string>>(
        initialGlobalScaleLabels
    );
    const [uniformConfirmOpen, setUniformConfirmOpen] = useState(false);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [targetScaleDrafts, setTargetScaleDrafts] = useState<Record<string, string>>({});
    const [authoringIssues, setAuthoringIssues] = useState<BuilderAuthoringIssue[]>([]);
    const [primaryGroupLabel, setPrimaryGroupLabel] = useState(initialPrimaryGroupLabel);
    const [targetLabel, setTargetLabel] = useState(initialTargetLabel);
    const [secondaryGroupLabel, setSecondaryGroupLabel] = useState(initialSecondaryGroupLabel);
    const [secondaryGroupingEnabled, setSecondaryGroupingEnabled] = useState(
        initialSecondaryGroupingEnabled
    );

    const baselineSnapshotRef = useRef(
        buildBuilderSessionSnapshot({
            title: initialTitle,
            description: initialDescription,
            domains: workingSeed.domains,
            scoringMode: workingSeed.scoring_mode,
            defaultScoring: workingSeed.default_scoring,
            scoringScales: workingSeed.scoring_scales,
            defaultScale: initialDefaultScale,
            globalScaleLabels: initialGlobalScaleLabels,
            targetScaleDrafts: {},
            primaryGroupLabel: initialPrimaryGroupLabel,
            targetLabel: initialTargetLabel,
            secondaryGroupLabel: initialSecondaryGroupLabel,
            secondaryGroupingEnabled: initialSecondaryGroupingEnabled,
            packId: initialData?.pack_id,
            orgId: initialData?.org_id,
            version: initialData?.version,
        })
    );

    const useGlobalScale = scoringMode === 'uniform';
    const showUniformNumericDefaultEditor =
        useGlobalScale &&
        defaultScoring.type === 'numeric' &&
        Boolean(defaultScoring.scale?.length || !defaultScoring.scale_id);

    const workingPack = useMemo<ContentPackData>(
        () => ({
            pack_id: initialData?.pack_id || 'draft',
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
            scoring_mode: scoringMode,
            default_scoring: defaultScoring,
            ...(scoringScales ? { scoring_scales: scoringScales } : {}),
            domains,
        }),
        [
            initialData?.pack_id,
            initialData?.org_id,
            initialData?.version,
            title,
            description,
            primaryGroupLabel,
            targetLabel,
            secondaryGroupLabel,
            secondaryGroupingEnabled,
            scoringMode,
            defaultScoring,
            scoringScales,
            domains,
        ]
    );

    const sessionSnapshotInput = useMemo<BuilderSessionSnapshotInput>(
        () => ({
            title,
            description,
            domains,
            scoringMode,
            defaultScoring,
            scoringScales,
            defaultScale,
            globalScaleLabels,
            targetScaleDrafts,
            primaryGroupLabel,
            targetLabel,
            secondaryGroupLabel,
            secondaryGroupingEnabled,
            packId: initialData?.pack_id,
            orgId: initialData?.org_id,
            version: initialData?.version,
        }),
        [
            title,
            description,
            domains,
            scoringMode,
            defaultScoring,
            scoringScales,
            defaultScale,
            globalScaleLabels,
            targetScaleDrafts,
            primaryGroupLabel,
            targetLabel,
            secondaryGroupLabel,
            secondaryGroupingEnabled,
            initialData?.pack_id,
            initialData?.org_id,
            initialData?.version,
        ]
    );

    const isDirty = useMemo(() => {
        const currentSnapshot = buildBuilderSessionSnapshot(sessionSnapshotInput);
        return !builderSessionSnapshotsEqual(baselineSnapshotRef.current, currentSnapshot);
    }, [sessionSnapshotInput]);

    useEffect(() => {
        onSessionChange?.({ isDirty });
    }, [isDirty, onSessionChange]);

    useEffect(() => {
        if (!isDirty) {
            return;
        }
        const handler = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const handleCancelClick = () => {
        if (!isDirty) {
            onCancel();
            return;
        }
        setCancelConfirmOpen(true);
    };

    const confirmCancelDiscard = () => {
        setCancelConfirmOpen(false);
        onCancel();
    };

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
        // Inherited targets have no override blob — do not invent a draft from the fallback.
        if (!target.scoring || target.scoring.type !== 'numeric') {
            return '';
        }
        return formatNumericScale(target.scoring.scale ?? []);
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
        const created = createBuilderTarget(
            updated[domainIndex],
            parseDefaultScaleOrFallback(defaultScale),
            secondaryGroupId,
            collectReservedTargetIds(domains)
        );
        const { scoring: _removed, ...inherited } = created;
        updated[domainIndex] = {
            ...updated[domainIndex],
            targets: [...updated[domainIndex].targets, inherited],
        };
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
        if (!target?.scoring) {
            // Inherited: never densify via scale commit (B3 §7.3).
            return { ok: true, domains: domainsSnapshot };
        }
        if (target.scoring.type !== 'numeric') {
            return { ok: true, domains: domainsSnapshot };
        }

        const key = scaleDraftKey(domainIndex, targetIndex);
        const draft = Object.prototype.hasOwnProperty.call(draftsSnapshot, key)
            ? draftsSnapshot[key]
            : formatNumericScale(target.scoring.scale ?? []);
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
                    if (tIndex !== targetIndex || !entry.scoring) {
                        return entry;
                    }
                    return {
                        ...entry,
                        scoring: {
                            ...entry.scoring,
                            scale: result.values,
                            scale_labels: reconcileScaleLabels(
                                result.values,
                                entry.scoring.scale_labels
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
            result.domains[domainIndex].targets[targetIndex].scoring?.scale ?? [];
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
                // Override-only: Inherited targets must not densify on save (B3 §7.3).
                if (!target.scoring || target.scoring.type !== 'numeric') {
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
        const target = domains[domainIndex]?.targets[targetIndex];
        if (!target?.scoring) {
            // Inherited: scoring type edits require Customize first.
            return;
        }
        const scoring = { ...target.scoring, type: scoringType };

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

        const updated = [...domains];
        updated[domainIndex] = {
            ...updated[domainIndex],
            targets: updated[domainIndex].targets.map((entry, index) =>
                index === targetIndex ? { ...entry, scoring } : entry
            ),
        };
        setDomains(updated);
        const key = scaleDraftKey(domainIndex, targetIndex);
        setTargetScaleDrafts((prev) => {
            const next = { ...prev };
            if (scoringType === 'numeric') {
                next[key] = formatNumericScale(scoring.scale ?? []);
            } else {
                delete next[key];
            }
            return next;
        });
        clearAuthoringIssue('scale', domainIndex, targetIndex);
    };

    const customizeTargetOverride = (domainIndex: number, targetIndex: number) => {
        const nextDomains = applyCustomizeOverride(
            domains,
            domainIndex,
            targetIndex,
            defaultScoring
        );
        setDomains(nextDomains);
        const scoring = nextDomains[domainIndex]?.targets[targetIndex]?.scoring;
        const key = scaleDraftKey(domainIndex, targetIndex);
        setTargetScaleDrafts((prev) => {
            const next = { ...prev };
            if (scoring?.type === 'numeric' && scoring.scale) {
                next[key] = formatNumericScale(scoring.scale);
            } else {
                delete next[key];
            }
            return next;
        });
        clearAuthoringIssue('scale', domainIndex, targetIndex);
    };

    const revertTargetToInherited = (domainIndex: number, targetIndex: number) => {
        setDomains(applyRevertToInherited(domains, domainIndex, targetIndex));
        const key = scaleDraftKey(domainIndex, targetIndex);
        setTargetScaleDrafts((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        clearAuthoringIssue('scale', domainIndex, targetIndex);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let workingDomains = domains;
        let workingDefaultScale = defaultScale;
        let workingGlobalLabels = globalScaleLabels;
        let workingDefaultScoring: PackDefaultScoring = { ...defaultScoring };
        const draftIssues: BuilderAuthoringIssue[] = [];
        let nextTargetScaleDrafts = targetScaleDrafts;

        if (scoringMode === 'uniform') {
            if (
                workingDefaultScoring.type === 'numeric' &&
                (workingDefaultScoring.scale?.length || !workingDefaultScoring.scale_id)
            ) {
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
                    workingDefaultScoring = {
                        ...workingDefaultScoring,
                        type: 'numeric',
                        scale: globalResult.values,
                        scale_labels: workingGlobalLabels,
                    };
                    setDefaultScoring(workingDefaultScoring);
                }
            } else {
                workingDefaultScoring = {
                    ...workingDefaultScoring,
                    scale_labels: {
                        ...(workingDefaultScoring.scale_labels ?? {}),
                    },
                };
            }
        } else {
            const committed = commitAllTargetScaleDrafts(workingDomains, targetScaleDrafts);
            workingDomains = committed.domains;
            draftIssues.push(...committed.issues);
            setDomains(workingDomains);
            const nextDrafts: Record<string, string> = { ...targetScaleDrafts };
            workingDomains.forEach((domain, domainIndex) => {
                domain.targets.forEach((target, targetIndex) => {
                    if (target.scoring?.type === 'numeric' && target.scoring.scale) {
                        nextDrafts[scaleDraftKey(domainIndex, targetIndex)] = formatNumericScale(
                            target.scoring.scale
                        );
                    }
                });
            });
            nextTargetScaleDrafts = nextDrafts;
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
            scoring_mode: scoringMode,
            default_scoring: workingDefaultScoring,
            ...(scoringScales ? { scoring_scales: scoringScales } : {}),
            domains: workingDomains,
        };

        const validated = validateBuilderPackAuthoring(packData, {
            scoringMode,
            defaultScaleCsv:
                scoringMode === 'uniform' &&
                workingDefaultScoring.type === 'numeric' &&
                (workingDefaultScoring.scale?.length || !workingDefaultScoring.scale_id)
                    ? workingDefaultScale
                    : undefined,
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
            for (const issue of mergedIssues) {
                revealBuilderIssueAnchor(issue);
            }
            return;
        }

        setAuthoringIssues([]);
        const normalized = normalizePackIdentifiers(
            normalizeCanonicalPackForSave(stripSecondaryGroupingIfDisabled(packData))
        );
        await onSave(normalized);
        baselineSnapshotRef.current = buildBuilderSessionSnapshot({
            title,
            description,
            domains: workingDomains,
            scoringMode,
            defaultScoring: workingDefaultScoring,
            scoringScales,
            defaultScale: workingDefaultScale,
            globalScaleLabels: workingGlobalLabels,
            targetScaleDrafts: nextTargetScaleDrafts,
            primaryGroupLabel,
            targetLabel,
            secondaryGroupLabel,
            secondaryGroupingEnabled,
            packId: initialData?.pack_id,
            orgId: initialData?.org_id,
            version: initialData?.version,
        });
    };

    const requestScoringModeChange = (nextChecked: boolean) => {
        if (nextChecked) {
            if (domainsHaveScoringOverrides(domains)) {
                setUniformConfirmOpen(true);
                return;
            }
            setScoringMode('uniform');
            return;
        }
        setScoringMode('custom');
    };

    const confirmSwitchToUniform = () => {
        setDomains(clearAllTargetScoringOverrides(domains));
        setTargetScaleDrafts({});
        setScoringMode('uniform');
        setUniformConfirmOpen(false);
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
        <div data-pack-builder-session>
            <header
                className="sticky top-0 z-20 mb-6 border-b border-gray-200 bg-white py-3 shadow-sm"
                data-pack-builder-sticky-chrome
            >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-3xl font-bold text-gray-900">Pack Builder</h1>
                        <p className="mt-1 text-gray-600">{sessionSubtitle}</p>
                        {isDirty ? (
                            <p
                                className="mt-1 text-sm font-medium text-amber-800"
                                data-builder-dirty-indicator
                            >
                                Unsaved changes
                            </p>
                        ) : null}
                    </div>
                    <div className="flex shrink-0 gap-3">
                        <button
                            type="submit"
                            form={formId}
                            disabled={domains.length === 0}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-lg font-medium"
                        >
                            Save Assessment Pack
                        </button>
                        <button
                            type="button"
                            onClick={handleCancelClick}
                            className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2.5 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </header>

            <form
            onSubmit={handleSubmit}
            id={formId}
            className="bg-white rounded-lg shadow p-6 space-y-6"
            data-builder-pack-id={packId}
            data-builder-session-revision={sessionOpenedAtRevision}
        >
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-900">
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

            <div className="grid grid-cols-2 gap-4" data-builder-title-block>
                    <div id="builder-issue-title">
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

            <details data-builder-advanced-pack-settings>
                <summary className="cursor-pointer text-sm font-semibold text-gray-900">
                    Advanced pack settings
                </summary>
                <div className="mt-3 space-y-4">
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
                            onChange={(e) => requestScoringModeChange(e.target.checked)}
                            className="rounded"
                        />
                        <label htmlFor="useGlobalScale" className="text-sm font-medium text-gray-700">
                            Use same scoring scale for all targets
                        </label>
                    </div>
                    {showUniformNumericDefaultEditor && (
                        <>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Default Scoring Scale
                            </label>
                            <div id="builder-issue-default_scale">
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
                                    const nextLabels = reconcileScaleLabels(
                                        result.values,
                                        globalScaleLabels
                                    );
                                    setGlobalScaleLabels(nextLabels);
                                    setDefaultScoring((prev) => ({
                                        ...prev,
                                        type: 'numeric',
                                        scale: result.values,
                                        scale_labels: nextLabels,
                                    }));
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
                                    All targets inherit this pack default. Changing it updates
                                    scoring for every target. New targets inherit the default
                                    rather than copying a snapshot. Score criteria below apply to
                                    the pack default.
                                </p>
                            )}

                            <div className="mt-4 space-y-2 pl-4 border-l-2 border-gray-100">
                                <label className="block text-sm font-medium text-gray-700">
                                    Score Criteria Definitions
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Score-button text for the pack default (e.g. 4 = Independent).
                                    Mastery language for a target stays on that target&apos;s Success
                                    Criteria field.
                                </p>
                                {defaultScaleValues.map((scoreValue) => (
                                    <div key={scoreValue} className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-700 w-8">
                                            {scoreValue} =
                                        </span>
                                        <input
                                            type="text"
                                            value={globalScaleLabels[scoreValue] || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setGlobalScaleLabels((prev) => ({
                                                    ...prev,
                                                    [scoreValue]: value,
                                                }));
                                                setDefaultScoring((prev) => ({
                                                    ...prev,
                                                    scale_labels: {
                                                        ...(prev.scale_labels ?? {}),
                                                        [scoreValue]: value,
                                                    },
                                                }));
                                            }}
                                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                                            placeholder={`Definition for score ${scoreValue}`}
                                        />
                                    </div>
                                ))}
                            </div>
                            </div>
                        </>
                    )}
                    {useGlobalScale && !showUniformNumericDefaultEditor && (
                        <p className="text-xs text-gray-500 mt-1">
                            All targets inherit this pack default. Changing the default updates
                            scoring for every target. New targets inherit the default rather than
                            copying a snapshot.
                        </p>
                    )}
                    {!useGlobalScale && (
                        <p className="text-sm text-gray-600">
                            Targets inherit the pack default unless they have an override.
                            Target-specific overrides are kept when you save and reopen the pack.
                        </p>
                    )}
                </div>
                    <button
                        type="button"
                        onClick={downloadTemplate}
                        className="inline-flex items-center gap-1 text-sm text-gray-700 underline hover:text-gray-900"
                    >
                        <Download className="w-4 h-4" />
                        Download CSV Template
                    </button>
                    <p className="text-xs text-gray-500">
                        Instructions and Examples, if present, come from CSV or JSON import.
                    </p>
                </div>
            </details>

            <div className="border-t pt-4" data-builder-domains-block>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {pluralizeStructureLabel(primaryLabel)} &{' '}
                        {pluralizeStructureLabel(targetLabelText)}
                    </h3>
                    <button
                        type="button"
                        onClick={addDomain}
                        className={BUILDER_SECONDARY_ADD_CLASS}
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
                                        <div id={`builder-issue-domain_id-${dIndex}`}>
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
                                                placeholder="e.g., A"
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
                                    aria-label={`Remove ${primaryLabel} ${domain.title || dIndex + 1}`}
                                    className="inline-flex items-center gap-1 p-2 text-sm text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Remove {primaryLabel}
                                </button>
                            </div>

                            {secondaryGroupingEnabled ? (
                                <div className="ml-2 mt-4 space-y-4 border-t border-gray-200 pt-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-gray-700">
                                            {pluralizeStructureLabel(secondaryLabel)}
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
                                            {pluralizeStructureLabel(targetLabelText).toLowerCase()}{' '}
                                            within this {primaryLabel.toLowerCase()}.
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
                                                                    aria-label={`Remove ${secondaryLabel} ${group.title || groupIndex + 1}`}
                                                                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                    Remove {secondaryLabel}
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
                                                                    workingPack={workingPack}
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
                                                                    onCustomizeOverride={
                                                                        customizeTargetOverride
                                                                    }
                                                                    onRevertToInherited={
                                                                        revertTargetToInherited
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
                                                            className={BUILDER_SECONDARY_ADD_CLASS}
                                                        >
                                                            <Plus className="w-4 h-4" />
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
                                                Ungrouped {pluralizeStructureLabel(targetLabelText)}
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
                                                            workingPack={workingPack}
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
                                                            onCustomizeOverride={
                                                                customizeTargetOverride
                                                            }
                                                            onRevertToInherited={
                                                                revertTargetToInherited
                                                            }
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
                                            {pluralizeStructureLabel(targetLabelText)}
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => addTarget(dIndex)}
                                            className={BUILDER_SECONDARY_ADD_CLASS}
                                        >
                                            <Plus className="w-4 h-4" />
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
                                            workingPack={workingPack}
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
                                            onCustomizeOverride={customizeTargetOverride}
                                            onRevertToInherited={revertTargetToInherited}
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
                    <p className="font-medium">
                        Fix {authoringIssues.length} authoring{' '}
                        {authoringIssues.length === 1 ? 'issue' : 'issues'} before saving:
                    </p>
                    <ul className="mt-2 space-y-1">
                        {authoringIssues.map((issue, index) => (
                            <li key={`${issue.field}-${issue.domainIndex ?? 'x'}-${issue.targetIndex ?? 'x'}-${index}`}>
                                <button
                                    type="button"
                                    onClick={() => focusBuilderIssueAnchor(issue)}
                                    className="text-left underline decoration-red-400/60 hover:decoration-red-800"
                                >
                                    {issue.message}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <ConfirmDialog
                isOpen={cancelConfirmOpen}
                title="Discard unsaved changes?"
                message="You have unsaved changes in this assessment pack. Discard them and close the builder?"
                confirmText="Discard changes"
                cancelText="Keep editing"
                isDestructive={true}
                onConfirm={confirmCancelDiscard}
                onCancel={() => setCancelConfirmOpen(false)}
            />

            <ConfirmDialog
                isOpen={uniformConfirmOpen}
                title="Switch to same scale for all targets?"
                message="Target-specific scoring overrides will be cleared. Every target will inherit the pack default. This cannot be undone except by Cancel without saving."
                confirmText="Use pack default for all"
                cancelText="Keep target overrides"
                isDestructive={true}
                onConfirm={confirmSwitchToUniform}
                onCancel={() => setUniformConfirmOpen(false)}
            />
        </form>
        </div>
    );
}
