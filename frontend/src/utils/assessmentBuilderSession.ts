import {
    ContentPackData,
    Domain,
    PackDefaultScoring,
    PackScoringMode,
    ScoringScaleDefinition,
} from '../types';
import {
    buildPackStructureLabels,
    commitNumericScaleCsv,
    formatNumericScale,
    isSecondaryGroupingEnabled,
    reconcileScaleLabels,
    BuilderAuthoringIssue,
} from './assessmentPackAuthoring';

function scaleDraftKey(domainIndex: number, targetIndex: number): string {
    return `${domainIndex}:${targetIndex}`;
}

export interface BuilderSessionSnapshotInput {
    title: string;
    description: string;
    domains: Domain[];
    scoringMode: PackScoringMode;
    defaultScoring: PackDefaultScoring;
    scoringScales?: ScoringScaleDefinition[];
    defaultScale: string;
    globalScaleLabels: Record<number, string>;
    targetScaleDrafts: Record<string, string>;
    primaryGroupLabel: string;
    targetLabel: string;
    secondaryGroupLabel: string;
    secondaryGroupingEnabled: boolean;
    packId?: string;
    orgId?: string;
    version?: string;
}

export interface BuilderSessionSnapshot {
    title: string;
    description: string;
    pack: ContentPackData;
    /** Captures uncommitted Uniform CSV edits (including invalid drafts). */
    uniformDefaultScaleCsv: string | null;
    targetScaleDrafts: Record<string, string>;
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

function commitTargetScaleDraft(
    domainsSnapshot: Domain[],
    domainIndex: number,
    targetIndex: number,
    draftsSnapshot: Record<string, string>
): { ok: true; domains: Domain[] } | { ok: false; domains: Domain[] } {
    const target = domainsSnapshot[domainIndex]?.targets[targetIndex];
    if (!target?.scoring || target.scoring.type !== 'numeric') {
        return { ok: true, domains: domainsSnapshot };
    }

    const key = scaleDraftKey(domainIndex, targetIndex);
    const draft = Object.prototype.hasOwnProperty.call(draftsSnapshot, key)
        ? draftsSnapshot[key]
        : formatNumericScale(target.scoring.scale ?? []);
    const result = commitNumericScaleCsv(draft);
    if (!result.ok) {
        return { ok: false, domains: domainsSnapshot };
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
}

function simulateCustomDraftMerge(
    domainsSnapshot: Domain[],
    draftsSnapshot: Record<string, string>
): Domain[] {
    let nextDomains = domainsSnapshot;
    domainsSnapshot.forEach((domain, domainIndex) => {
        domain.targets.forEach((_target, targetIndex) => {
            const result = commitTargetScaleDraft(
                nextDomains,
                domainIndex,
                targetIndex,
                draftsSnapshot
            );
            if (result.ok) {
                nextDomains = result.domains;
            }
        });
    });
    return nextDomains;
}

function sortedRecordEntries(record: Record<string, string>): [string, string][] {
    return Object.keys(record)
        .sort()
        .map((key) => [key, record[key] ?? '']);
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) {
        return true;
    }
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
        return false;
    }

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) {
            return false;
        }
        for (let index = 0; index < a.length; index += 1) {
            if (!deepEqual(a[index], b[index])) {
                return false;
            }
        }
        return true;
    }

    const recordA = a as Record<string, unknown>;
    const recordB = b as Record<string, unknown>;
    const keysA = Object.keys(recordA).sort();
    const keysB = Object.keys(recordB).sort();
    if (keysA.length !== keysB.length) {
        return false;
    }
    for (let index = 0; index < keysA.length; index += 1) {
        if (keysA[index] !== keysB[index]) {
            return false;
        }
        const key = keysA[index]!;
        if (!deepEqual(recordA[key], recordB[key])) {
            return false;
        }
    }
    return true;
}

/**
 * Projects Builder working copy into a comparison-normalized snapshot (contract §2.3).
 * Read-only — does not mutate React state or run save validation.
 */
export function buildBuilderSessionSnapshot(
    input: BuilderSessionSnapshotInput
): BuilderSessionSnapshot {
    let workingDomains = input.domains;
    let workingDefaultScoring: PackDefaultScoring = { ...input.defaultScoring };
    let uniformDefaultScaleCsv: string | null = null;

    if (input.scoringMode === 'uniform') {
        if (
            workingDefaultScoring.type === 'numeric' &&
            (workingDefaultScoring.scale?.length || !workingDefaultScoring.scale_id)
        ) {
            uniformDefaultScaleCsv = input.defaultScale;
            const globalResult = commitNumericScaleCsv(input.defaultScale);
            if (globalResult.ok) {
                const workingGlobalLabels = reconcileScaleLabels(
                    globalResult.values,
                    input.globalScaleLabels
                );
                workingDefaultScoring = {
                    ...workingDefaultScoring,
                    type: 'numeric',
                    scale: globalResult.values,
                    scale_labels: workingGlobalLabels,
                };
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
        workingDomains = simulateCustomDraftMerge(input.domains, input.targetScaleDrafts);
    }

    const pack: ContentPackData = {
        pack_id: input.packId || 'draft',
        org_id: input.orgId || '',
        title: input.title,
        description: input.description,
        version: input.version || '1.0',
        structure_labels: buildPackStructureLabels(
            input.primaryGroupLabel,
            input.targetLabel,
            input.secondaryGroupLabel,
            input.secondaryGroupingEnabled
        ),
        scoring_mode: input.scoringMode,
        default_scoring: workingDefaultScoring,
        ...(input.scoringScales ? { scoring_scales: input.scoringScales } : {}),
        domains: workingDomains,
    };

    return {
        title: input.title,
        description: input.description,
        pack: stripSecondaryGroupingIfDisabled(pack),
        uniformDefaultScaleCsv,
        targetScaleDrafts: Object.fromEntries(sortedRecordEntries(input.targetScaleDrafts)),
    };
}

export function builderSessionSnapshotsEqual(
    left: BuilderSessionSnapshot,
    right: BuilderSessionSnapshot
): boolean {
    if (left.title !== right.title || left.description !== right.description) {
        return false;
    }
    if (left.uniformDefaultScaleCsv !== right.uniformDefaultScaleCsv) {
        return false;
    }
    if (!deepEqual(left.targetScaleDrafts, right.targetScaleDrafts)) {
        return false;
    }
    return deepEqual(left.pack, right.pack);
}

export function builderIssueAnchorId(issue: BuilderAuthoringIssue): string {
    const { field, domainIndex, targetIndex } = issue;
    if (domainIndex === undefined) {
        return `builder-issue-${field}`;
    }
    if (targetIndex === undefined) {
        return `builder-issue-${field}-${domainIndex}`;
    }
    return `builder-issue-${field}-${domainIndex}-${targetIndex}`;
}

/** Open a collapsed ancestor disclosure so the issue anchor is visible. */
export function revealBuilderIssueAnchor(issue: BuilderAuthoringIssue): HTMLElement | null {
    const element = document.getElementById(builderIssueAnchorId(issue));
    if (!element) {
        return null;
    }
    const details = element.closest('details');
    if (details && !details.open) {
        details.open = true;
        // Opening <details> defers layout; read geometry so the following
        // scrollIntoView targets the expanded position, not the collapsed one.
        element.getBoundingClientRect();
    }
    return element;
}

export function focusBuilderIssueAnchor(issue: BuilderAuthoringIssue): void {
    const element = revealBuilderIssueAnchor(issue);
    if (!element) {
        return;
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = element.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, button'
    );
    focusable?.focus({ preventScroll: true });
}
