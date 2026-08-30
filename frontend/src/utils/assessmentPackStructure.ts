import {
    ContentPackData,
    Domain,
    PackDefaultScoring,
    ScoringScaleDefinition,
    ScoringType,
    StructureLabels,
    Target,
    TargetScoring,
} from '../types';

export const DEFAULT_STRUCTURE_LABELS: StructureLabels = {
    primary_group: 'Domain',
    target: 'Target',
};

export const OVERSIZED_GROUP_LARGE_THRESHOLD = 80;
export const OVERSIZED_GROUP_EXTREME_THRESHOLD = 120;

export type OversizedGroupWarningLevel = 'large' | 'extreme';

export interface OversizedGroupWarning {
    level: OversizedGroupWarningLevel;
    targetCount: number;
    threshold: number;
    message: string;
}

/** Resolved scoring view for a target — never mutates pack or target. */
export interface ResolvedTargetScoring extends TargetScoring {
    /** Scale id when resolution used a known pack scale; undefined when inline-only. */
    resolved_from_scale_id?: string;
}

/** Authored scoring fields that can merge with a named catalog entry. */
export type AuthoredScoringFields = {
    type?: ScoringType | string;
    scale_id?: string;
    scale?: number[];
    scale_labels?: Record<number, string>;
    task_steps?: string[];
    no_opportunity_allowed?: boolean;
};

export interface DisplayTargetGroup {
    secondary_group_id?: string;
    title: string;
    targets: Target[];
}

/**
 * Returns pack structure labels, applying Alpha defaults when absent.
 */
export function getStructureLabels(pack: ContentPackData): StructureLabels {
    const labels = pack.structure_labels;

    return {
        primary_group: labels?.primary_group?.trim() || DEFAULT_STRUCTURE_LABELS.primary_group,
        target: labels?.target?.trim() || DEFAULT_STRUCTURE_LABELS.target,
        ...(labels?.secondary_group?.trim()
            ? { secondary_group: labels.secondary_group.trim() }
            : {}),
    };
}

/**
 * Plural form of a structure label as a single string.
 * JSX `{label}s` is two text nodes; the accessibility tree reads them as
 * "Target s" / "Domain s". Always interpolate this helper instead.
 */
export function pluralizeStructureLabel(singular: string): string {
    const base = singular.trim();
    if (!base) {
        return '';
    }
    if (base.toLowerCase().endsWith('s')) {
        return base;
    }
    return `${base}s`;
}

/** Count + label as one string: "1 target", "19 targets". */
export function formatStructureItemCount(count: number, singularLabel: string): string {
    const trimmed = singularLabel.trim() || 'target';
    if (count === 1) {
        return `1 ${trimmed.toLowerCase()}`;
    }
    return `${count} ${pluralizeStructureLabel(trimmed).toLowerCase()}`;
}

/** Unfiltered lists are a count. "found" is search language for an active filter. */
export function formatListedStructureCount(
    count: number,
    singularLabel: string,
    filtered: boolean
): string {
    const body = formatStructureItemCount(count, singularLabel);
    return filtered ? `${body} found` : body;
}

function findScoringScale(
    pack: ContentPackData,
    scaleId: string | undefined
): ScoringScaleDefinition | undefined {
    if (!scaleId || !pack.scoring_scales?.length) {
        return undefined;
    }

    return pack.scoring_scales.find((entry) => entry.scale_id === scaleId);
}

function resolveScaleLabels(
    targetLabels: Record<number, string> | undefined,
    scaleLabels: Record<number, string> | undefined,
    hasKnownScale: boolean
): Record<number, string> {
    if (targetLabels !== undefined) {
        const hasKeys = Object.keys(targetLabels).length > 0;
        if (hasKeys || !hasKnownScale) {
            return { ...targetLabels };
        }
    }

    if (scaleLabels !== undefined) {
        return { ...scaleLabels };
    }

    return {};
}

/**
 * Merge authored scoring fields with an optional named pack scale.
 * Inline authored fields win when both are present.
 * Unknown scale_id → inline fields only (no invented catalog data).
 */
export function mergeAuthoredScoringWithCatalog(
    authored: AuthoredScoringFields | PackDefaultScoring | TargetScoring,
    pack: ContentPackData
): ResolvedTargetScoring {
    const scale = findScoringScale(pack, authored.scale_id);
    const hasKnownScale = scale !== undefined;

    if (!hasKnownScale) {
        return {
            type: (authored.type as TargetScoring['type']) ?? 'numeric',
            scale_id: authored.scale_id,
            scale: authored.scale !== undefined ? [...authored.scale] : undefined,
            scale_labels: { ...(authored.scale_labels ?? {}) },
            task_steps:
                authored.task_steps !== undefined ? [...authored.task_steps] : undefined,
            no_opportunity_allowed: Boolean(authored.no_opportunity_allowed),
        };
    }

    return {
        type: (authored.type as TargetScoring['type']) ?? scale.type,
        scale_id: authored.scale_id,
        resolved_from_scale_id: scale.scale_id,
        scale:
            authored.scale !== undefined
                ? [...authored.scale]
                : scale.scale !== undefined
                  ? [...scale.scale]
                  : undefined,
        scale_labels: resolveScaleLabels(authored.scale_labels, scale.scale_labels, true),
        task_steps:
            authored.task_steps !== undefined
                ? [...authored.task_steps]
                : scale.task_steps !== undefined
                  ? [...scale.task_steps]
                  : undefined,
        no_opportunity_allowed:
            authored.no_opportunity_allowed ?? scale.no_opportunity_allowed ?? false,
    };
}

/**
 * Resolves target scoring from optional pack-level scales (legacy / dense path).
 * For Phase B canonical packs, prefer resolveEffectiveScoring which applies inheritance.
 *
 * Unknown or missing scale_id → inline target.scoring only (Alpha behavior).
 * Never mutates pack or target.
 */
export function resolveTargetScoring(
    target: Target,
    pack: ContentPackData
): ResolvedTargetScoring {
    if (!target.scoring) {
        return {
            type: 'numeric',
            scale_labels: {},
            no_opportunity_allowed: false,
        };
    }

    return mergeAuthoredScoringWithCatalog(target.scoring, pack);
}

function isFlatDomain(domain: Domain): boolean {
    if (domain.secondary_groups && domain.secondary_groups.length > 0) {
        return false;
    }

    return domain.targets.every((target) => !target.secondary_group_id);
}

/** True when Matrix should render secondary group section headers. */
export function domainHasSecondaryGroupDisplay(domain: Domain): boolean {
    return !isFlatDomain(domain);
}

/**
 * Groups domain targets for secondary-aware display.
 *
 * - Flat domains → one section with all targets (stable order).
 * - Catalog present → catalog order/titles; orphans and ungrouped preserved.
 * - Catalog absent → first-seen secondary_group_id order; ungrouped last.
 * Never drops targets.
 */
export function groupTargetsForDisplay(domain: Domain): DisplayTargetGroup[] {
    if (isFlatDomain(domain)) {
        return [
            {
                title: domain.title,
                targets: [...domain.targets],
            },
        ];
    }

    const targetsByGroupId = new Map<string, Target[]>();
    const firstSeenOrder: string[] = [];
    const ungrouped: Target[] = [];

    for (const target of domain.targets) {
        const groupId = target.secondary_group_id;
        if (!groupId) {
            ungrouped.push(target);
            continue;
        }

        if (!targetsByGroupId.has(groupId)) {
            targetsByGroupId.set(groupId, []);
            firstSeenOrder.push(groupId);
        }
        targetsByGroupId.get(groupId)!.push(target);
    }

    const sections: DisplayTargetGroup[] = [];
    const catalog = domain.secondary_groups ?? [];
    const catalogIds = new Set(catalog.map((entry) => entry.secondary_group_id));

    for (const entry of catalog) {
        const targets = targetsByGroupId.get(entry.secondary_group_id);
        if (!targets?.length) {
            continue;
        }
        sections.push({
            secondary_group_id: entry.secondary_group_id,
            title: entry.title,
            targets: [...targets],
        });
    }

    for (const groupId of firstSeenOrder) {
        if (catalogIds.has(groupId)) {
            continue;
        }
        const targets = targetsByGroupId.get(groupId);
        if (!targets?.length) {
            continue;
        }
        sections.push({
            secondary_group_id: groupId,
            title: groupId,
            targets: [...targets],
        });
    }

    if (ungrouped.length > 0) {
        sections.push({
            title: 'Ungrouped',
            targets: [...ungrouped],
        });
    }

    if (sections.length === 0) {
        return [
            {
                title: domain.title,
                targets: [...domain.targets],
            },
        ];
    }

    return sections;
}

/**
 * Foundation-only oversized group warning metadata.
 * Not wired to UI in PR12.1.
 */
export function getOversizedGroupWarning(
    targetCount: number
): OversizedGroupWarning | null {
    if (targetCount >= OVERSIZED_GROUP_EXTREME_THRESHOLD) {
        return {
            level: 'extreme',
            targetCount,
            threshold: OVERSIZED_GROUP_EXTREME_THRESHOLD,
            message:
                'Extreme group — consider secondary grouping to improve readability.',
        };
    }

    if (targetCount >= OVERSIZED_GROUP_LARGE_THRESHOLD) {
        return {
            level: 'large',
            targetCount,
            threshold: OVERSIZED_GROUP_LARGE_THRESHOLD,
            message: 'Large group may reduce export readability.',
        };
    }

    return null;
}
