import {
    ContentPackData,
    Domain,
    ScoringScaleDefinition,
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
 * Resolves effective target scoring from optional pack-level scales.
 *
 * Authority (highest wins):
 * 1. Target inline field when set
 * 2. Referenced scoring_scales entry
 * 3. System-safe empty defaults for labels
 *
 * Unknown or missing scale_id → inline target.scoring only (Alpha behavior).
 * Never mutates pack or target.
 */
export function resolveTargetScoring(
    target: Target,
    pack: ContentPackData
): ResolvedTargetScoring {
    const inline = target.scoring;
    const scale = findScoringScale(pack, inline.scale_id);
    const hasKnownScale = scale !== undefined;

    if (!hasKnownScale) {
        return {
            type: inline.type,
            scale_id: inline.scale_id,
            scale: inline.scale !== undefined ? [...inline.scale] : undefined,
            scale_labels: { ...(inline.scale_labels ?? {}) },
            task_steps: inline.task_steps !== undefined ? [...inline.task_steps] : undefined,
            no_opportunity_allowed: inline.no_opportunity_allowed,
        };
    }

    return {
        type: inline.type ?? scale.type,
        scale_id: inline.scale_id,
        resolved_from_scale_id: scale.scale_id,
        scale:
            inline.scale !== undefined
                ? [...inline.scale]
                : scale.scale !== undefined
                  ? [...scale.scale]
                  : undefined,
        scale_labels: resolveScaleLabels(inline.scale_labels, scale.scale_labels, true),
        task_steps:
            inline.task_steps !== undefined
                ? [...inline.task_steps]
                : scale.task_steps !== undefined
                  ? [...scale.task_steps]
                  : undefined,
        no_opportunity_allowed:
            inline.no_opportunity_allowed ?? scale.no_opportunity_allowed ?? false,
    };
}

function isFlatDomain(domain: Domain): boolean {
    if (domain.secondary_groups && domain.secondary_groups.length > 0) {
        return false;
    }

    return domain.targets.every((target) => !target.secondary_group_id);
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
