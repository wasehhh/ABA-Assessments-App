import { AssessmentSnapshotProfile } from '../services/assessmentSnapshotProfile';
import {
    LearnerMapCycleSummary,
    LearnerMapDomain,
    LearnerMapTarget,
} from '../services/learnerMapProfile';
import { CompetencyState } from './scoreInterpretation';

export type SnapshotLayoutMode = 'screen' | 'print';
export type SnapshotLayoutTier = 'compact' | 'standard' | 'dense';
export type SnapshotTopology = 'flat' | 'grouped';
export type ChildZoneKind = 'flat-primary' | 'secondary';
export type ChapterKind = 'flat' | 'grouped';

/** Targets at or below this count are never presentation-factored. */
export const SNAPSHOT_FACTORING_NONE_MAX = 60;

/** Large-group threshold — factoring optional on screen, applied on print. */
export const SNAPSHOT_FACTORING_LARGE_MIN = 80;

/** Extreme-group threshold — factoring required on print, recommended on screen. */
export const SNAPSHOT_FACTORING_EXTREME_MIN = 120;

/** Default maximum targets per presentation Part when factoring applies. */
export const SNAPSHOT_FACTORING_PART_SIZE = 46;

export const SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM = 96;
export const SNAPSHOT_DEFAULT_VIEWPORT_PRINT_REM = 52;
export const SNAPSHOT_DOMAIN_GAP_REM = 1.25;

const BEAD_SLOT_REM: Record<SnapshotLayoutTier, number> = {
    compact: 1.625,
    standard: 1.75,
    dense: 1.5,
};

/** Dedicated arrowhead slot after beads, before max ring. */
const ARROW_SLOT_REM: Record<SnapshotLayoutTier, number> = {
    compact: 0.85,
    standard: 0.85,
    dense: 0.75,
};

const ARROW_TO_MAX_GAP_REM = 0.375; // ~6px
const MAX_RING_SLOT_REM: Record<SnapshotLayoutTier, number> = {
    compact: 1.35,
    standard: 1.35,
    dense: 1.25,
};

export interface SnapshotLayoutConfig {
    mode: SnapshotLayoutMode;
    viewportWidthRem: number;
    factoringNoneMax: number;
    factoringLargeMin: number;
    factoringExtremeMin: number;
    factoringPartSize: number;
    domainGapRem: number;
}

export interface EvidenceMarkPlan {
    cycleId: string;
    cycleNumber: number;
    cycleIndex: number;
    displayScoreWithMax: string;
    competencyState: CompetencyState;
    isUnscored: boolean;
}

export interface TargetThreadPlan {
    targetId: string;
    title: string;
    /** Zero-based index within the authored domain target list. */
    targetIndex: number;
    /** One-based ordinal within the zone target list (stable across presentation Parts). */
    domainTargetOrdinal: number;
    marks: EvidenceMarkPlan[];
}

/** @deprecated Prefer PresentationPartPlan.threads — kept for transitional helpers. */
export interface SecondarySectionPlan {
    title: string;
    secondaryGroupId?: string;
    threads: TargetThreadPlan[];
}

export interface PresentationPartPlan {
    partIndex: number;
    partNumber: number;
    totalParts: number;
    title: string;
    isFactored: boolean;
    targetRange: { start: number; end: number };
    /** Target threads for this presentation Part (zone already IS the secondary/flat group). */
    threads: TargetThreadPlan[];
}

export interface ChildZonePlan {
    zoneId: string;
    zoneTitle: string;
    zoneKind: ChildZoneKind;
    /** Primary group id that owns this zone. */
    primaryId: string;
    zoneIndex: number;
    secondaryGroupId?: string;
    columnWidthRem: number;
    parts: PresentationPartPlan[];
}

/**
 * Transitional alias for ChildZonePlan.
 * Historical name from pre-chapter topology; prefer ChildZonePlan in new code.
 * Flat packs: one zone per primary domain. Grouped packs: one zone per secondary group.
 */
export type DomainZonePlan = ChildZonePlan;

export interface RenderRowPlan {
    rowIndex: number;
    zones: ChildZonePlan[];
    usedWidthRem: number;
}

export interface PrimaryChapterPlan {
    chapterIndex: number;
    chapterKind: ChapterKind;
    primaryId: string;
    primaryTitle: string;
    targetCount: number;
    rows: RenderRowPlan[];
}

export interface CycleAxisPlan {
    cycleId: string;
    cycleNumber: number;
    cycleIndex: number;
}

export interface RenderPlan {
    mode: SnapshotLayoutMode;
    topology: SnapshotTopology;
    tier: SnapshotLayoutTier;
    viewportWidthRem: number;
    domainColumnWidthRem: number;
    domainGapRem: number;
    cycles: CycleAxisPlan[];
    chapters: PrimaryChapterPlan[];
    /**
     * Flattened packing rows for flat topology convenience and back-compat.
     * For grouped topology this concatenates every chapter’s rows (chapters never share a row).
     */
    rows: RenderRowPlan[];
    totalDomains: number;
    totalTargets: number;
}

export function resolveDefaultLayoutConfig(mode: SnapshotLayoutMode): SnapshotLayoutConfig {
    return {
        mode,
        viewportWidthRem:
            mode === 'print'
                ? SNAPSHOT_DEFAULT_VIEWPORT_PRINT_REM
                : SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM,
        factoringNoneMax: SNAPSHOT_FACTORING_NONE_MAX,
        factoringLargeMin: SNAPSHOT_FACTORING_LARGE_MIN,
        factoringExtremeMin: SNAPSHOT_FACTORING_EXTREME_MIN,
        factoringPartSize: SNAPSHOT_FACTORING_PART_SIZE,
        domainGapRem: SNAPSHOT_DOMAIN_GAP_REM,
    };
}

export function resolveSnapshotLayoutTier(profile: AssessmentSnapshotProfile): SnapshotLayoutTier {
    const totalTargets = profile.domains.reduce((sum, domain) => sum + domain.targets.length, 0);
    const cycleCount = profile.cycles.length;
    const domainCount = profile.domains.length;

    if (totalTargets > 75 || domainCount > 7 || cycleCount > 8) {
        return 'dense';
    }

    if (totalTargets <= 35 && domainCount <= 4 && cycleCount <= 5) {
        return 'compact';
    }

    return 'standard';
}

function labelWidthRem(tier: SnapshotLayoutTier): number {
    if (tier === 'dense') return 2;
    if (tier === 'compact') return 2.25;
    return 2.5;
}

export function resolveDomainColumnWidthRem(
    cycleCount: number,
    tier: SnapshotLayoutTier
): number {
    return (
        labelWidthRem(tier) +
        cycleCount * BEAD_SLOT_REM[tier] +
        ARROW_SLOT_REM[tier] +
        ARROW_TO_MAX_GAP_REM +
        MAX_RING_SLOT_REM[tier]
    );
}

export function resolveArrowSlotRem(tier: SnapshotLayoutTier): number {
    return ARROW_SLOT_REM[tier];
}

export function resolveArrowToMaxGapRem(): number {
    return ARROW_TO_MAX_GAP_REM;
}

export function resolveMaxRingSlotRem(tier: SnapshotLayoutTier): number {
    return MAX_RING_SLOT_REM[tier];
}

export function shouldApplyPresentationFactoring(
    targetCount: number,
    mode: SnapshotLayoutMode,
    config: SnapshotLayoutConfig
): boolean {
    if (targetCount <= config.factoringNoneMax) {
        return false;
    }

    if (mode === 'print') {
        if (targetCount >= config.factoringLargeMin) {
            return true;
        }
    }

    if (targetCount >= config.factoringExtremeMin) {
        return true;
    }

    return false;
}

export function profileUsesGroupedTopology(profile: AssessmentSnapshotProfile): boolean {
    return profile.domains.some(
        (domain) => Boolean(domain.targetSections && domain.targetSections.length > 0)
    );
}

function chunkItems<T>(items: T[], chunkSize: number): T[][] {
    if (chunkSize <= 0) {
        return [items];
    }

    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }
    return chunks;
}

function buildEvidenceMarks(
    target: LearnerMapTarget,
    cycles: LearnerMapCycleSummary[]
): EvidenceMarkPlan[] {
    const cellsByCycleId = new Map(target.cells.map((cell) => [cell.cycleId, cell]));

    return cycles.map((cycle, cycleIndex) => {
        const cell = cellsByCycleId.get(cycle.cycleId);

        return {
            cycleId: cycle.cycleId,
            cycleNumber: cycle.cycleNumber,
            cycleIndex,
            displayScoreWithMax: cell?.displayScoreWithMax ?? '—',
            competencyState: cell?.competencyState ?? 'unscored',
            isUnscored: cell?.isUnscored ?? true,
        };
    });
}

function buildTargetThread(
    target: LearnerMapTarget,
    targetIndex: number,
    zoneOrdinal: number,
    cycles: LearnerMapCycleSummary[]
): TargetThreadPlan {
    return {
        targetId: target.targetId,
        title: target.title,
        targetIndex,
        domainTargetOrdinal: zoneOrdinal,
        marks: buildEvidenceMarks(target, cycles),
    };
}

function buildPresentationPartTitle(
    zoneTitle: string,
    partNumber: number,
    totalParts: number,
    targetRange: { start: number; end: number },
    isFactored: boolean
): string {
    if (!isFactored || totalParts <= 1) {
        return zoneTitle;
    }

    return `${zoneTitle} · Part ${partNumber} · Targets ${targetRange.start}–${targetRange.end}`;
}

function buildPresentationPartsForTargets(
    zoneTitle: string,
    zoneTargets: LearnerMapTarget[],
    domainTargets: LearnerMapTarget[],
    config: SnapshotLayoutConfig,
    cycles: LearnerMapCycleSummary[]
): PresentationPartPlan[] {
    const targetCount = zoneTargets.length;
    const isFactored = shouldApplyPresentationFactoring(targetCount, config.mode, config);

    const threadsFor = (targets: LearnerMapTarget[], ordinalOffset: number) =>
        targets.map((target, index) => {
            const targetIndex = domainTargets.findIndex(
                (entry) => entry.targetId === target.targetId
            );
            return buildTargetThread(target, targetIndex, ordinalOffset + index + 1, cycles);
        });

    if (!isFactored) {
        return [
            {
                partIndex: 0,
                partNumber: 1,
                totalParts: 1,
                title: zoneTitle,
                isFactored: false,
                targetRange: { start: 1, end: targetCount },
                threads: threadsFor(zoneTargets, 0),
            },
        ];
    }

    const chunks = chunkItems(zoneTargets, config.factoringPartSize);
    const totalParts = chunks.length;

    return chunks.map((chunk, partIndex) => {
        const start = partIndex * config.factoringPartSize + 1;
        const end = start + chunk.length - 1;
        const targetRange = { start, end };
        const partNumber = partIndex + 1;

        return {
            partIndex,
            partNumber,
            totalParts,
            title: buildPresentationPartTitle(zoneTitle, partNumber, totalParts, targetRange, true),
            isFactored: true,
            targetRange,
            threads: threadsFor(chunk, start - 1),
        };
    });
}

function buildFlatPrimaryZone(
    domain: LearnerMapDomain,
    domainIndex: number,
    config: SnapshotLayoutConfig,
    columnWidthRem: number,
    cycles: LearnerMapCycleSummary[]
): ChildZonePlan {
    return {
        zoneId: domain.domainId,
        zoneTitle: domain.title,
        zoneKind: 'flat-primary',
        primaryId: domain.domainId,
        zoneIndex: domainIndex,
        columnWidthRem,
        parts: buildPresentationPartsForTargets(
            domain.title,
            domain.targets,
            domain.targets,
            config,
            cycles
        ),
    };
}

function buildSecondaryChildZones(
    domain: LearnerMapDomain,
    config: SnapshotLayoutConfig,
    columnWidthRem: number,
    cycles: LearnerMapCycleSummary[]
): ChildZonePlan[] {
    const sections = domain.targetSections;
    if (!sections?.length) {
        return [
            buildFlatPrimaryZone(
                domain,
                0,
                config,
                columnWidthRem,
                cycles
            ),
        ];
    }

    return sections.map((section, zoneIndex) => ({
        zoneId: `${domain.domainId}__${section.secondaryGroupId ?? `section-${zoneIndex}`}`,
        zoneTitle: section.title,
        zoneKind: 'secondary' as const,
        primaryId: domain.domainId,
        zoneIndex,
        secondaryGroupId: section.secondaryGroupId,
        columnWidthRem,
        parts: buildPresentationPartsForTargets(
            section.title,
            section.targets,
            domain.targets,
            config,
            cycles
        ),
    }));
}

export function packDomainZonesIntoRows(
    zones: ChildZonePlan[],
    config: SnapshotLayoutConfig
): RenderRowPlan[] {
    const rows: RenderRowPlan[] = [];
    let currentZones: ChildZonePlan[] = [];
    let usedWidthRem = 0;

    const flushRow = () => {
        if (currentZones.length === 0) {
            return;
        }

        rows.push({
            rowIndex: rows.length,
            zones: currentZones,
            usedWidthRem,
        });
        currentZones = [];
        usedWidthRem = 0;
    };

    for (const zone of zones) {
        const gapBefore = currentZones.length > 0 ? config.domainGapRem : 0;
        const nextWidth = usedWidthRem + gapBefore + zone.columnWidthRem;

        if (currentZones.length > 0 && nextWidth > config.viewportWidthRem) {
            flushRow();
            currentZones = [zone];
            usedWidthRem = zone.columnWidthRem;
            continue;
        }

        usedWidthRem = nextWidth;
        currentZones.push(zone);
    }

    flushRow();
    return rows;
}

function buildFlatChapter(
    profile: AssessmentSnapshotProfile,
    config: SnapshotLayoutConfig,
    columnWidthRem: number
): PrimaryChapterPlan {
    const zones = profile.domains.map((domain, domainIndex) =>
        buildFlatPrimaryZone(domain, domainIndex, config, columnWidthRem, profile.cycles)
    );

    return {
        chapterIndex: 0,
        chapterKind: 'flat',
        primaryId: '__flat__',
        primaryTitle: profile.metadata.packTitle,
        targetCount: profile.domains.reduce((sum, domain) => sum + domain.targets.length, 0),
        rows: packDomainZonesIntoRows(zones, config),
    };
}

function buildGroupedChapters(
    profile: AssessmentSnapshotProfile,
    config: SnapshotLayoutConfig,
    columnWidthRem: number
): PrimaryChapterPlan[] {
    return profile.domains.map((domain, chapterIndex) => {
        const childZones = buildSecondaryChildZones(
            domain,
            config,
            columnWidthRem,
            profile.cycles
        );
        const rows = packDomainZonesIntoRows(childZones, config).map((row, rowIndex) => ({
            ...row,
            rowIndex,
        }));

        return {
            chapterIndex,
            chapterKind: 'grouped' as const,
            primaryId: domain.domainId,
            primaryTitle: domain.title,
            targetCount: domain.targets.length,
            rows,
        };
    });
}

function flattenChapterRows(chapters: PrimaryChapterPlan[]): RenderRowPlan[] {
    const rows: RenderRowPlan[] = [];
    for (const chapter of chapters) {
        for (const row of chapter.rows) {
            rows.push({
                ...row,
                rowIndex: rows.length,
            });
        }
    }
    return rows;
}

export function buildSnapshotRenderPlan(
    profile: AssessmentSnapshotProfile,
    configInput?: Partial<SnapshotLayoutConfig> & { mode?: SnapshotLayoutMode }
): RenderPlan {
    const mode = configInput?.mode ?? 'screen';
    const config: SnapshotLayoutConfig = {
        ...resolveDefaultLayoutConfig(mode),
        ...configInput,
        mode,
    };

    const tier = resolveSnapshotLayoutTier(profile);
    const domainColumnWidthRem = resolveDomainColumnWidthRem(profile.cycles.length, tier);
    const topology: SnapshotTopology = profileUsesGroupedTopology(profile)
        ? 'grouped'
        : 'flat';

    const chapters =
        topology === 'grouped'
            ? buildGroupedChapters(profile, config, domainColumnWidthRem)
            : [buildFlatChapter(profile, config, domainColumnWidthRem)];

    const cycles: CycleAxisPlan[] = profile.cycles.map((cycle, cycleIndex) => ({
        cycleId: cycle.cycleId,
        cycleNumber: cycle.cycleNumber,
        cycleIndex,
    }));

    return {
        mode: config.mode,
        topology,
        tier,
        viewportWidthRem: config.viewportWidthRem,
        domainColumnWidthRem,
        domainGapRem: config.domainGapRem,
        cycles,
        chapters,
        rows: flattenChapterRows(chapters),
        totalDomains: profile.domains.length,
        totalTargets: profile.domains.reduce((sum, domain) => sum + domain.targets.length, 0),
    };
}

export function flattenRenderPlanTargetIds(plan: RenderPlan): string[] {
    const targetIds: string[] = [];

    for (const chapter of plan.chapters) {
        for (const row of chapter.rows) {
            for (const zone of row.zones) {
                for (const part of zone.parts) {
                    for (const thread of part.threads) {
                        targetIds.push(thread.targetId);
                    }
                }
            }
        }
    }

    return targetIds;
}

export function flattenRenderPlanZoneTitles(plan: RenderPlan): string[] {
    const titles: string[] = [];

    for (const chapter of plan.chapters) {
        for (const row of chapter.rows) {
            for (const zone of row.zones) {
                titles.push(zone.zoneTitle);
            }
        }
    }

    return titles;
}

/** @deprecated Use flattenRenderPlanZoneTitles for secondary zone titles. */
export function flattenRenderPlanSecondarySectionTitles(plan: RenderPlan): string[] {
    return flattenRenderPlanZoneTitles(plan).filter((title) => title.length > 0);
}

export function findChildZonePlan(
    plan: RenderPlan,
    zoneId: string
): ChildZonePlan | undefined {
    for (const chapter of plan.chapters) {
        for (const row of chapter.rows) {
            const zone = row.zones.find((entry) => entry.zoneId === zoneId);
            if (zone) {
                return zone;
            }
        }
    }

    return undefined;
}

/** Finds a flat-primary zone by primary domain id, or the first secondary zone under that primary. */
export function findDomainZonePlan(
    plan: RenderPlan,
    primaryId: string
): ChildZonePlan | undefined {
    for (const chapter of plan.chapters) {
        for (const row of chapter.rows) {
            const exact = row.zones.find(
                (entry) => entry.zoneId === primaryId || entry.primaryId === primaryId
            );
            if (exact?.zoneKind === 'flat-primary' && exact.zoneId === primaryId) {
                return exact;
            }
        }
    }

    for (const chapter of plan.chapters) {
        if (chapter.primaryId !== primaryId) {
            continue;
        }
        for (const row of chapter.rows) {
            if (row.zones[0]) {
                return row.zones[0];
            }
        }
    }

    return findChildZonePlan(plan, primaryId);
}

export function findPrimaryChapter(
    plan: RenderPlan,
    primaryId: string
): PrimaryChapterPlan | undefined {
    return plan.chapters.find((chapter) => chapter.primaryId === primaryId);
}

export function zoneTargetCount(zone: ChildZonePlan): number {
    return zone.parts.reduce((sum, part) => sum + part.threads.length, 0);
}
