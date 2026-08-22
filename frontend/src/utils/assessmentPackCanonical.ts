import {
    ContentPackData,
    Domain,
    PackDefaultScoring,
    PackScoringMode,
    ScoringScaleDefinition,
    ScoringType,
    Target,
    TargetScoring,
} from '../types';
import {
    CANONICAL_NUMERIC_FALLBACK_SCALE,
    effectiveScoringEquals,
    hasTargetScoringOverride,
    isCanonicalScoringPack,
    normalizeEffectiveScaleType,
    resolveEffectiveScoring,
    resolveTargetAuthoredScoringSource,
} from './effectiveScoring';

/** Scale CSV equivalent to today’s new-pack default. */
export const NEW_PACK_DEFAULT_SCALE_CSV = '0,1,2,3,4';

/** Numeric values for a new blank pack default (matches NEW_PACK_DEFAULT_SCALE_CSV). */
export const NEW_PACK_DEFAULT_SCALE_VALUES = [0, 1, 2, 3, 4] as const;

/**
 * Complete default_scoring for a new blank pack.
 * Scale/labels match today’s 0–4 + empty labels. `no_opportunity_allowed: true`
 * matches Builder `createBuilderTarget` (historical new-target authored flag).
 */
export const NEW_PACK_DEFAULT_SCORING: PackDefaultScoring = {
    type: 'numeric',
    scale: [...NEW_PACK_DEFAULT_SCALE_VALUES],
    scale_labels: {},
    no_opportunity_allowed: true,
};

const FALLBACK_OVERRIDE_SCORING: TargetScoring = {
    type: 'numeric',
    scale: [...CANONICAL_NUMERIC_FALLBACK_SCALE],
    scale_labels: {},
    no_opportunity_allowed: false,
};

export function clonePackData<T>(value: T): T {
    return structuredClone(value);
}

export function omitTargetScoring(target: Target): Target {
    const { scoring: _removed, ...rest } = target;
    return rest;
}

export function clearAllTargetScoringOverrides(domains: Domain[]): Domain[] {
    return domains.map((domain) => ({
        ...domain,
        targets: domain.targets.map(omitTargetScoring),
    }));
}

export function domainsHaveScoringOverrides(domains: Domain[]): boolean {
    return domains.some((domain) => domain.targets.some(hasTargetScoringOverride));
}

/** Completeness rule aligned with B1 N4 / runtime `isAuthoredScoringCompleteEnough`. */
export function isCompleteAuthoredScoring(
    authored: PackDefaultScoring | TargetScoring | undefined
): boolean {
    if (!authored?.type) {
        return false;
    }
    const type = normalizeEffectiveScaleType(authored.type as string);
    if (type === 'yes_no' || type === 'text') {
        return true;
    }
    if (type === 'checkbox') {
        return Boolean(
            (authored.scale && authored.scale.length > 0) ||
                (authored.task_steps && authored.task_steps.length > 0) ||
                authored.scale_id
        );
    }
    return Boolean((authored.scale && authored.scale.length > 0) || authored.scale_id);
}

export function clonePackDefaultScoring(scoring: PackDefaultScoring): PackDefaultScoring {
    return {
        type: scoring.type,
        ...(scoring.scale_id ? { scale_id: scoring.scale_id } : {}),
        ...(scoring.scale ? { scale: [...scoring.scale] } : {}),
        scale_labels: { ...(scoring.scale_labels ?? {}) },
        ...(scoring.task_steps ? { task_steps: [...scoring.task_steps] } : {}),
        ...(scoring.no_opportunity_allowed !== undefined
            ? { no_opportunity_allowed: scoring.no_opportunity_allowed }
            : {}),
    };
}

function cloneTargetScoring(scoring: TargetScoring): TargetScoring {
    return {
        type: scoring.type,
        ...(scoring.scale_id ? { scale_id: scoring.scale_id } : {}),
        ...(scoring.scale ? { scale: [...scoring.scale] } : {}),
        scale_labels: { ...(scoring.scale_labels ?? {}) },
        ...(scoring.task_steps ? { task_steps: [...scoring.task_steps] } : {}),
        no_opportunity_allowed: Boolean(scoring.no_opportunity_allowed),
    };
}

function cloneAuthoredAsDefault(
    authored: PackDefaultScoring | TargetScoring
): PackDefaultScoring {
    return {
        type: (authored.type as ScoringType) || 'numeric',
        ...(authored.scale_id ? { scale_id: authored.scale_id } : {}),
        ...(authored.scale ? { scale: [...authored.scale] } : {}),
        scale_labels: { ...(authored.scale_labels ?? {}) },
        ...(authored.task_steps ? { task_steps: [...authored.task_steps] } : {}),
        no_opportunity_allowed: Boolean(authored.no_opportunity_allowed),
    };
}

function walkTargets(pack: ContentPackData): Target[] {
    return pack.domains.flatMap((domain) => domain.targets);
}

function resolvePackDefaultEffective(
    pack: ContentPackData,
    defaultScoring: PackDefaultScoring
) {
    const probe: Target = {
        target_id: '__pack_default__',
        title: '',
        success_criteria: '',
        materials: '',
    };
    return resolveEffectiveScoring(probe, {
        ...pack,
        scoring_mode: 'custom',
        default_scoring: defaultScoring,
    });
}

/**
 * N2 equality: compare override meaning (Custom resolution) to inheritance.
 * Does not use Uniform-ignore, so Uniform+stray differing overrides are left for N1.
 */
function overrideEffectiveEqualsDefault(
    target: Target,
    pack: ContentPackData
): boolean {
    if (!pack.default_scoring || !hasTargetScoringOverride(target)) {
        return false;
    }
    const customPack: ContentPackData = {
        ...pack,
        scoring_mode: 'custom',
    };
    return effectiveScoringEquals(
        resolveEffectiveScoring(target, customPack),
        resolveEffectiveScoring(omitTargetScoring(target), customPack)
    );
}

function sparsifyRedundantOverrides(pack: ContentPackData): Domain[] {
    return pack.domains.map((domain) => ({
        ...domain,
        targets: domain.targets.map((target) => {
            if (!hasTargetScoringOverride(target)) {
                return omitTargetScoring(target);
            }
            if (overrideEffectiveEqualsDefault(target, pack)) {
                return omitTargetScoring(target);
            }
            return {
                ...target,
                scoring: cloneTargetScoring(target.scoring!),
            };
        }),
    }));
}

function chooseMigratedDefault(pack: ContentPackData): PackDefaultScoring {
    if (pack.default_scoring && isCompleteAuthoredScoring(pack.default_scoring)) {
        return clonePackDefaultScoring(pack.default_scoring);
    }

    const targets = walkTargets(pack);
    if (targets.length === 0) {
        return clonePackDefaultScoring(NEW_PACK_DEFAULT_SCORING);
    }

    let modalTarget = targets[0];
    let modalCount = 1;

    const groups: Array<{
        target: Target;
        count: number;
        effective: ReturnType<typeof resolveEffectiveScoring>;
    }> = [
        {
            target: modalTarget,
            count: 1,
            effective: resolveEffectiveScoring(modalTarget, pack),
        },
    ];

    for (let index = 1; index < targets.length; index++) {
        const target = targets[index];
        const effective = resolveEffectiveScoring(target, pack);
        const existing = groups.find((group) =>
            effectiveScoringEquals(group.effective, effective)
        );
        if (existing) {
            existing.count += 1;
            if (existing.count > modalCount) {
                modalCount = existing.count;
                modalTarget = existing.target;
            }
        } else {
            groups.push({ target, count: 1, effective });
        }
    }

    return cloneAuthoredAsDefault(
        resolveTargetAuthoredScoringSource(modalTarget, pack).authored
    );
}

function mapTargetsPreservingStructure(
    pack: ContentPackData,
    mapTarget: (target: Target) => Target
): Domain[] {
    return pack.domains.map((domain) => ({
        ...domain,
        targets: domain.targets.map(mapTarget),
    }));
}

/**
 * B1 §7.3 M1–M5. Already-canonical packs are identity plus silent N2 (FD-B3-1 / founder N2-on-open).
 * Never mutates the input pack.
 */
export function migrateLegacyPackToCanonical(pack: ContentPackData): ContentPackData {
    const cloned = clonePackData(pack);

    if (isCanonicalScoringPack(cloned)) {
        cloned.domains = sparsifyRedundantOverrides(cloned);
        return cloned;
    }

    const defaultScoring = chooseMigratedDefault(cloned);
    const defaultEffective = resolvePackDefaultEffective(cloned, defaultScoring);

    const allEqualDefault = walkTargets(cloned).every((target) =>
        effectiveScoringEquals(resolveEffectiveScoring(target, cloned), defaultEffective)
    );
    const scoringMode: PackScoringMode = allEqualDefault ? 'uniform' : 'custom';

    const domains = mapTargetsPreservingStructure(cloned, (target) => {
        const before = resolveEffectiveScoring(target, cloned);
        if (effectiveScoringEquals(before, defaultEffective)) {
            return omitTargetScoring(target);
        }
        if (hasTargetScoringOverride(target)) {
            return {
                ...target,
                scoring: cloneTargetScoring(target.scoring!),
            };
        }
        // Legacy missing scoring whose Effective is not the chosen default:
        // persist the runtime fallback blob so Effective is unchanged (M3/M5).
        return {
            ...target,
            scoring: cloneTargetScoring(FALLBACK_OVERRIDE_SCORING),
        };
    });

    const migrated: ContentPackData = {
        ...cloned,
        scoring_mode: scoringMode,
        default_scoring: defaultScoring,
        domains: scoringMode === 'uniform' ? clearAllTargetScoringOverrides(domains) : domains,
    };

    if (cloned.scoring_scales) {
        migrated.scoring_scales = cloned.scoring_scales.map(
            (entry): ScoringScaleDefinition => structuredClone(entry)
        );
    }

    return migrated;
}

/**
 * B1 §5.3 N1–N6. Preserves `scoring_scales` / `scale_id` (N5). Never mutates input.
 */
export function normalizeCanonicalPackForSave(pack: ContentPackData): ContentPackData {
    const next = clonePackData(pack);

    if (next.scoring_mode === 'uniform') {
        next.domains = clearAllTargetScoringOverrides(next.domains);
    } else {
        next.domains = sparsifyRedundantOverrides(next);
    }

    if (next.default_scoring) {
        next.default_scoring = clonePackDefaultScoring(next.default_scoring);
    }

    return next;
}

export interface BuilderWorkingPackSeed {
    scoring_mode: PackScoringMode;
    default_scoring: PackDefaultScoring;
    domains: Domain[];
    scoring_scales?: ScoringScaleDefinition[];
}

/** Mount-time working copy. New packs start Uniform with the 0–4 default. */
export function seedBuilderWorkingPack(
    initialData?: ContentPackData
): BuilderWorkingPackSeed {
    if (!initialData) {
        return {
            scoring_mode: 'uniform',
            default_scoring: clonePackDefaultScoring(NEW_PACK_DEFAULT_SCORING),
            domains: [],
        };
    }

    const migrated = migrateLegacyPackToCanonical(initialData);
    return {
        scoring_mode: migrated.scoring_mode ?? 'uniform',
        default_scoring: migrated.default_scoring
            ? clonePackDefaultScoring(migrated.default_scoring)
            : clonePackDefaultScoring(NEW_PACK_DEFAULT_SCORING),
        domains: migrated.domains,
        ...(migrated.scoring_scales ? { scoring_scales: migrated.scoring_scales } : {}),
    };
}
