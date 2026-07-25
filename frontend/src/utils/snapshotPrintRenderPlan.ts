import { AssessmentSnapshotProfile } from '../services/assessmentSnapshotProfile';
import {
    LearnerMapCycleSummary,
    LearnerMapDomain,
    LearnerMapTarget,
} from '../services/learnerMapProfile';
import {
    ChildZoneKind,
    CycleAxisPlan,
    EvidenceMarkPlan,
    profileUsesGroupedTopology,
    resolveDomainColumnWidthRem,
    resolveSnapshotLayoutTier,
    SnapshotLayoutTier,
    SnapshotTopology,
    TargetThreadPlan,
} from './snapshotLayoutEngine';
import {
    computeColumnCapacities,
    computeColumnRowCapacity,
    computeColumnsPerPage,
    PrintColumnCapacities,
    PrintCompositionProfile,
    PrintPageHeaderMode,
    PrintPageProfileId,
    resolvePrintCompositionProfile,
} from './snapshotPrintPageProfile';

/**
 * PR13.6B/D — Print page composition engine.
 *
 * Builds an explicit, deterministic {@link PrintRenderPlan}: physical pages, a row
 * of columns per page, and a domain segment per column. Separate from the screen
 * {@link RenderPlan} (which uses presentation Parts for extreme groups only).
 *
 * Ordering rule (documented, single policy):
 *   Fill domains in authored order. When a domain overflows its current column,
 *   continue THAT domain into the next available column before starting the next
 *   domain. Columns flow left→right, then to the next page.
 *
 * Capacities are estimates from {@link snapshotPrintPageProfile}; not WYSIWYG.
 */

export interface DomainSegmentPlan {
    /** Owning chapter / primary group id ('__flat__' for flat topology). */
    primaryGroupId: string;
    /** Zone id (secondary zone id when grouped, else the domain id). */
    domainId: string;
    /** Stable grouping key shared by every segment of the same authored domain. */
    domainKey: string;
    domainTitle: string;
    zoneKind: ChildZoneKind;
    /** 1-based segment index within the domain. */
    segmentNumber: number;
    segmentCount: number;
    isContinuation: boolean;
    /** 1-based target ordinal range within the domain (contiguous, complete). */
    targetStartOrdinal: number;
    targetEndOrdinal: number;
    domainTargetCount: number;
    threads: TargetThreadPlan[];
    /** True when the previous column in the same row is the same domain. */
    connectsToPreviousInRow: boolean;
}

export interface PrintColumnPlan {
    columnIndex: number;
    widthRem: number;
    segment: DomainSegmentPlan;
}

export interface PrintChapterBand {
    primaryGroupId: string;
    chapterTitle: string;
    chapterIndex: number;
    isChapterContinuation: boolean;
    targetCount: number;
}

export interface PrintRowPlan {
    rowIndex: number;
    columns: PrintColumnPlan[];
}

export interface PrintPagePlan {
    pageNumber: number;
    profileId: PrintPageProfileId;
    availableWidthRem: number;
    availableHeightRem: number;
    headerMode: PrintPageHeaderMode;
    /** Estimated target rows a single column holds on this page. */
    columnCapacity: number;
    /** Full-width chapter band (grouped topology); null for flat pages. */
    chapterBand: PrintChapterBand | null;
    rows: PrintRowPlan[];
    footerMode: 'none' | 'document';
}

export interface PrintRenderPlan {
    mode: 'print';
    profile: PrintCompositionProfile;
    profileId: PrintPageProfileId;
    tier: SnapshotLayoutTier;
    topology: SnapshotTopology;
    cycles: CycleAxisPlan[];
    domainColumnWidthRem: number;
    columnGapRem: number;
    columnsPerPage: number;
    capacities: PrintColumnCapacities;
    pages: PrintPagePlan[];
    totalPages: number;
    totalDomains: number;
    totalTargets: number;
}

/** Split `total` into `parts` near-equal sizes (differ by ≤1), larger sizes first. */
function splitEvenly(total: number, parts: number): number[] {
    if (parts <= 1) {
        return [total];
    }
    const base = Math.floor(total / parts);
    const remainder = total % parts;
    return Array.from({ length: parts }, (_, index) => (index < remainder ? base + 1 : base));
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

interface DomainUnit {
    primaryGroupId: string;
    domainKey: string;
    domainId: string;
    domainTitle: string;
    zoneKind: ChildZoneKind;
    threads: TargetThreadPlan[];
}

function buildUnitThreads(
    unitTargets: LearnerMapTarget[],
    domainTargets: LearnerMapTarget[],
    cycles: LearnerMapCycleSummary[]
): TargetThreadPlan[] {
    return unitTargets.map((target, index) => {
        const targetIndex = domainTargets.findIndex(
            (entry) => entry.targetId === target.targetId
        );
        return {
            targetId: target.targetId,
            title: target.title,
            targetIndex: targetIndex >= 0 ? targetIndex : index,
            domainTargetOrdinal: index + 1,
            marks: buildEvidenceMarks(target, cycles),
        };
    });
}

function buildFlatUnits(
    profile: AssessmentSnapshotProfile
): { primaryGroupId: string; units: DomainUnit[] }[] {
    const units = profile.domains.map<DomainUnit>((domain) => ({
        primaryGroupId: '__flat__',
        domainKey: domain.domainId,
        domainId: domain.domainId,
        domainTitle: domain.title,
        zoneKind: 'flat-primary',
        threads: buildUnitThreads(domain.targets, domain.targets, profile.cycles),
    }));
    return [{ primaryGroupId: '__flat__', units }];
}

function buildGroupedChapterUnits(
    domain: LearnerMapDomain,
    cycles: LearnerMapCycleSummary[]
): DomainUnit[] {
    const sections = domain.targetSections;
    if (!sections?.length) {
        return [
            {
                primaryGroupId: domain.domainId,
                domainKey: domain.domainId,
                domainId: domain.domainId,
                domainTitle: domain.title,
                zoneKind: 'flat-primary',
                threads: buildUnitThreads(domain.targets, domain.targets, cycles),
            },
        ];
    }

    return sections.map((section, sectionIndex) => ({
        primaryGroupId: domain.domainId,
        domainKey: `${domain.domainId}__${section.secondaryGroupId ?? `section-${sectionIndex}`}`,
        domainId: `${domain.domainId}__${section.secondaryGroupId ?? `section-${sectionIndex}`}`,
        domainTitle: section.title,
        zoneKind: 'secondary' as const,
        threads: buildUnitThreads(section.targets, domain.targets, cycles),
    }));
}

interface ColumnDraft {
    unit: DomainUnit;
    start: number;
    len: number;
}

interface MutablePage {
    pageNumber: number;
    headerMode: PrintPageHeaderMode;
    chapterBand: PrintChapterBand | null;
    columnCapacity: number;
    drafts: ColumnDraft[];
}

class PageComposer {
    readonly pages: MutablePage[] = [];
    private colIndex = 0;
    private continuationBand: PrintChapterBand | null = null;

    constructor(
        private readonly profile: PrintCompositionProfile,
        private readonly tier: SnapshotLayoutTier,
        readonly columnsPerPage: number
    ) {}

    setContinuationBand(band: PrintChapterBand | null): void {
        this.continuationBand = band;
    }

    openPage(headerMode: PrintPageHeaderMode, chapterBand: PrintChapterBand | null = null): void {
        this.pages.push({
            pageNumber: this.pages.length + 1,
            headerMode,
            chapterBand,
            columnCapacity: computeColumnRowCapacity(this.profile, this.tier, headerMode),
            drafts: [],
        });
        this.colIndex = 0;
    }

    private openContinuation(): void {
        this.openPage('continuation', this.continuationBand);
    }

    private get current(): MutablePage {
        return this.pages[this.pages.length - 1];
    }

    private hasSpace(): boolean {
        return this.pages.length > 0 && this.colIndex < this.columnsPerPage;
    }

    /** Place one domain unit, flowing continuation segments into adjacent columns. */
    placeUnit(unit: DomainUnit): void {
        const total = unit.threads.length;
        if (total === 0) {
            return;
        }

        let placed = 0;
        while (placed < total) {
            if (!this.hasSpace()) {
                this.openContinuation();
            }
            const capacity = this.current.columnCapacity;
            const colsLeft = this.columnsPerPage - this.colIndex;
            const remaining = total - placed;
            const neededCols = Math.ceil(remaining / capacity);

            const sizes =
                neededCols <= colsLeft
                    ? splitEvenly(remaining, neededCols)
                    : new Array<number>(colsLeft).fill(capacity);

            for (const rawSize of sizes) {
                const len = Math.min(rawSize, total - placed);
                if (len <= 0) {
                    break;
                }
                this.current.drafts.push({ unit, start: placed, len });
                this.colIndex += 1;
                placed += len;
            }
        }
    }
}

function makeChapterBand(
    domain: LearnerMapDomain,
    chapterIndex: number,
    isChapterContinuation: boolean
): PrintChapterBand {
    return {
        primaryGroupId: domain.domainId,
        chapterTitle: domain.title,
        chapterIndex,
        isChapterContinuation,
        targetCount: domain.targets.length,
    };
}

function finalizePages(
    composer: PageComposer,
    profile: PrintCompositionProfile,
    columnWidthRem: number
): PrintPagePlan[] {
    // Assign per-domain segment numbering across the whole document (drafts of a
    // unit are contiguous because a unit is placed fully before the next).
    const segmentCountByKey = new Map<string, number>();
    for (const page of composer.pages) {
        for (const draft of page.drafts) {
            segmentCountByKey.set(
                draft.unit.domainKey,
                (segmentCountByKey.get(draft.unit.domainKey) ?? 0) + 1
            );
        }
    }

    const segmentSeenByKey = new Map<string, number>();

    return composer.pages.map((page) => {
        const columns: PrintColumnPlan[] = page.drafts.map((draft, columnIndex) => {
            const { unit } = draft;
            const segmentCount = segmentCountByKey.get(unit.domainKey) ?? 1;
            const segmentNumber = (segmentSeenByKey.get(unit.domainKey) ?? 0) + 1;
            segmentSeenByKey.set(unit.domainKey, segmentNumber);

            const prevDraft = page.drafts[columnIndex - 1];
            const connectsToPreviousInRow = Boolean(
                prevDraft && prevDraft.unit.domainKey === unit.domainKey
            );

            const segment: DomainSegmentPlan = {
                primaryGroupId: unit.primaryGroupId,
                domainId: unit.domainId,
                domainKey: unit.domainKey,
                domainTitle: unit.domainTitle,
                zoneKind: unit.zoneKind,
                segmentNumber,
                segmentCount,
                isContinuation: segmentNumber > 1,
                targetStartOrdinal: draft.start + 1,
                targetEndOrdinal: draft.start + draft.len,
                domainTargetCount: unit.threads.length,
                threads: unit.threads.slice(draft.start, draft.start + draft.len),
                connectsToPreviousInRow,
            };

            return { columnIndex, widthRem: columnWidthRem, segment };
        });

        return {
            pageNumber: page.pageNumber,
            profileId: profile.id,
            availableWidthRem: profile.usableWidthRem,
            availableHeightRem: profile.usableHeightRem,
            headerMode: page.headerMode,
            columnCapacity: page.columnCapacity,
            chapterBand: page.chapterBand,
            rows: [{ rowIndex: 0, columns }],
            footerMode: 'none',
        };
    });
}

export interface BuildPrintRenderPlanOptions {
    paper?: PrintPageProfileId;
}

export function buildPrintRenderPlan(
    profile: AssessmentSnapshotProfile,
    options?: BuildPrintRenderPlanOptions
): PrintRenderPlan {
    const paper = options?.paper ?? 'letter';
    const compositionProfile = resolvePrintCompositionProfile(paper);
    const tier = resolveSnapshotLayoutTier(profile);
    const columnWidthRem = resolveDomainColumnWidthRem(profile.cycles.length, tier);
    const columnsPerPage = computeColumnsPerPage(compositionProfile, columnWidthRem);
    const capacities = computeColumnCapacities(compositionProfile, tier);
    const topology: SnapshotTopology = profileUsesGroupedTopology(profile) ? 'grouped' : 'flat';

    const composer = new PageComposer(compositionProfile, tier, columnsPerPage);

    if (topology === 'grouped') {
        profile.domains.forEach((domain, chapterIndex) => {
            const headerMode: PrintPageHeaderMode =
                chapterIndex === 0 ? 'document-chapter' : 'chapter';
            composer.openPage(headerMode, makeChapterBand(domain, chapterIndex, false));
            composer.setContinuationBand(makeChapterBand(domain, chapterIndex, true));
            for (const unit of buildGroupedChapterUnits(domain, profile.cycles)) {
                composer.placeUnit(unit);
            }
        });
    } else {
        composer.setContinuationBand(null);
        composer.openPage('document');
        for (const { units } of buildFlatUnits(profile)) {
            for (const unit of units) {
                composer.placeUnit(unit);
            }
        }
    }

    const pages = finalizePages(composer, compositionProfile, columnWidthRem);
    if (pages.length > 0) {
        pages[pages.length - 1] = { ...pages[pages.length - 1], footerMode: 'document' };
    }

    const cycles: CycleAxisPlan[] = profile.cycles.map((cycle, cycleIndex) => ({
        cycleId: cycle.cycleId,
        cycleNumber: cycle.cycleNumber,
        cycleIndex,
    }));

    return {
        mode: 'print',
        profile: compositionProfile,
        profileId: paper,
        tier,
        topology,
        cycles,
        domainColumnWidthRem: columnWidthRem,
        columnGapRem: compositionProfile.columnGapRem,
        columnsPerPage,
        capacities,
        pages,
        totalPages: pages.length,
        totalDomains: profile.domains.length,
        totalTargets: profile.domains.reduce((sum, domain) => sum + domain.targets.length, 0),
    };
}

export function flattenPrintPlanSegments(plan: PrintRenderPlan): DomainSegmentPlan[] {
    const segments: DomainSegmentPlan[] = [];
    for (const page of plan.pages) {
        for (const row of page.rows) {
            for (const column of row.columns) {
                segments.push(column.segment);
            }
        }
    }
    return segments;
}

export function flattenPrintPlanTargetIds(plan: PrintRenderPlan): string[] {
    const ids: string[] = [];
    for (const segment of flattenPrintPlanSegments(plan)) {
        for (const thread of segment.threads) {
            ids.push(thread.targetId);
        }
    }
    return ids;
}

export function flattenPrintPlanColumns(plan: PrintRenderPlan): PrintColumnPlan[] {
    const columns: PrintColumnPlan[] = [];
    for (const page of plan.pages) {
        for (const row of page.rows) {
            columns.push(...row.columns);
        }
    }
    return columns;
}
