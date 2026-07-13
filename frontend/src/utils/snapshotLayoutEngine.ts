import { AssessmentSnapshotProfile } from '../services/assessmentSnapshotProfile';
import {
    LearnerMapCycleSummary,
    LearnerMapDomain,
    LearnerMapTarget,
} from '../services/learnerMapProfile';
import { CompetencyState } from './scoreInterpretation';

export type SnapshotLayoutMode = 'screen' | 'print';
export type SnapshotLayoutTier = 'compact' | 'standard' | 'dense';

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
    /** One-based ordinal within the domain (stable across presentation Parts). */
    domainTargetOrdinal: number;
    marks: EvidenceMarkPlan[];
}

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
    secondarySections: SecondarySectionPlan[];
}

export interface DomainZonePlan {
    domainId: string;
    domainTitle: string;
    domainIndex: number;
    columnWidthRem: number;
    parts: PresentationPartPlan[];
}

export interface RenderRowPlan {
    rowIndex: number;
    zones: DomainZonePlan[];
    usedWidthRem: number;
}

export interface CycleAxisPlan {
    cycleId: string;
    cycleNumber: number;
    cycleIndex: number;
}

export interface RenderPlan {
    mode: SnapshotLayoutMode;
    tier: SnapshotLayoutTier;
    viewportWidthRem: number;
    domainColumnWidthRem: number;
    domainGapRem: number;
    cycles: CycleAxisPlan[];
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
    const trailingRem = tier === 'dense' ? 1.75 : 2;
    return labelWidthRem(tier) + cycleCount * BEAD_SLOT_REM[tier] + trailingRem;
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
    cycles: LearnerMapCycleSummary[]
): TargetThreadPlan {
    return {
        targetId: target.targetId,
        title: target.title,
        targetIndex,
        domainTargetOrdinal: targetIndex + 1,
        marks: buildEvidenceMarks(target, cycles),
    };
}

function buildSecondarySectionsForPart(
    domain: LearnerMapDomain,
    partTargets: LearnerMapTarget[],
    cycles: LearnerMapCycleSummary[]
): SecondarySectionPlan[] {
    const partTargetIds = new Set(partTargets.map((target) => target.targetId));

    if (!domain.targetSections?.length) {
        return [
            {
                title: '',
                threads: partTargets.map((target) => {
                    const targetIndex = domain.targets.findIndex(
                        (entry) => entry.targetId === target.targetId
                    );
                    return buildTargetThread(target, targetIndex, cycles);
                }),
            },
        ];
    }

    const sections: SecondarySectionPlan[] = [];

    for (const section of domain.targetSections) {
        const threads: TargetThreadPlan[] = [];

        for (const sectionTarget of section.targets) {
            if (!partTargetIds.has(sectionTarget.targetId)) {
                continue;
            }

            const target = domain.targets.find(
                (entry) => entry.targetId === sectionTarget.targetId
            );
            if (!target) {
                continue;
            }

            const targetIndex = domain.targets.findIndex(
                (entry) => entry.targetId === target.targetId
            );
            threads.push(buildTargetThread(target, targetIndex, cycles));
        }

        if (threads.length > 0) {
            sections.push({
                title: section.title,
                secondaryGroupId: section.secondaryGroupId,
                threads,
            });
        }
    }

    return sections;
}

function buildPresentationPartTitle(
    domainTitle: string,
    partNumber: number,
    totalParts: number,
    targetRange: { start: number; end: number },
    isFactored: boolean
): string {
    if (!isFactored || totalParts <= 1) {
        return domainTitle;
    }

    return `${domainTitle} · Part ${partNumber} · Targets ${targetRange.start}–${targetRange.end}`;
}

function buildPresentationParts(
    domain: LearnerMapDomain,
    config: SnapshotLayoutConfig,
    cycles: LearnerMapCycleSummary[]
): PresentationPartPlan[] {
    const targetCount = domain.targets.length;
    const isFactored = shouldApplyPresentationFactoring(targetCount, config.mode, config);

    if (!isFactored) {
        return [
            {
                partIndex: 0,
                partNumber: 1,
                totalParts: 1,
                title: domain.title,
                isFactored: false,
                targetRange: { start: 1, end: targetCount },
                secondarySections: buildSecondarySectionsForPart(domain, domain.targets, cycles),
            },
        ];
    }

    const chunks = chunkItems(domain.targets, config.factoringPartSize);
    const totalParts = chunks.length;

    return chunks.map((chunk, partIndex) => {
        const firstOrdinal = domain.targets.findIndex(
            (target) => target.targetId === chunk[0].targetId
        );
        const lastOrdinal = domain.targets.findIndex(
            (target) => target.targetId === chunk[chunk.length - 1].targetId
        );
        const targetRange = {
            start: firstOrdinal + 1,
            end: lastOrdinal + 1,
        };
        const partNumber = partIndex + 1;

        return {
            partIndex,
            partNumber,
            totalParts,
            title: buildPresentationPartTitle(
                domain.title,
                partNumber,
                totalParts,
                targetRange,
                true
            ),
            isFactored: true,
            targetRange,
            secondarySections: buildSecondarySectionsForPart(domain, chunk, cycles),
        };
    });
}

function buildDomainZonePlans(
    profile: AssessmentSnapshotProfile,
    config: SnapshotLayoutConfig,
    columnWidthRem: number
): DomainZonePlan[] {
    return profile.domains.map((domain, domainIndex) => ({
        domainId: domain.domainId,
        domainTitle: domain.title,
        domainIndex,
        columnWidthRem,
        parts: buildPresentationParts(domain, config, profile.cycles),
    }));
}

export function packDomainZonesIntoRows(
    zones: DomainZonePlan[],
    config: SnapshotLayoutConfig
): RenderRowPlan[] {
    const rows: RenderRowPlan[] = [];
    let currentZones: DomainZonePlan[] = [];
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
    const zonePlans = buildDomainZonePlans(profile, config, domainColumnWidthRem);
    const rows = packDomainZonesIntoRows(zonePlans, config);

    const cycles: CycleAxisPlan[] = profile.cycles.map((cycle, cycleIndex) => ({
        cycleId: cycle.cycleId,
        cycleNumber: cycle.cycleNumber,
        cycleIndex,
    }));

    return {
        mode: config.mode,
        tier,
        viewportWidthRem: config.viewportWidthRem,
        domainColumnWidthRem,
        domainGapRem: config.domainGapRem,
        cycles,
        rows,
        totalDomains: profile.domains.length,
        totalTargets: profile.domains.reduce((sum, domain) => sum + domain.targets.length, 0),
    };
}

export function flattenRenderPlanTargetIds(plan: RenderPlan): string[] {
    const targetIds: string[] = [];

    for (const row of plan.rows) {
        for (const zone of row.zones) {
            for (const part of zone.parts) {
                for (const section of part.secondarySections) {
                    for (const thread of section.threads) {
                        targetIds.push(thread.targetId);
                    }
                }
            }
        }
    }

    return targetIds;
}

export function flattenRenderPlanSecondarySectionTitles(plan: RenderPlan): string[] {
    const titles: string[] = [];

    for (const row of plan.rows) {
        for (const zone of row.zones) {
            for (const part of zone.parts) {
                for (const section of part.secondarySections) {
                    if (section.title) {
                        titles.push(section.title);
                    }
                }
            }
        }
    }

    return titles;
}

/** Collects secondary section plans for a domain zone (first matching zone in plan). */
export function findDomainZonePlan(plan: RenderPlan, domainId: string): DomainZonePlan | undefined {
    for (const row of plan.rows) {
        const zone = row.zones.find((entry) => entry.domainId === domainId);
        if (zone) {
            return zone;
        }
    }

    return undefined;
}
