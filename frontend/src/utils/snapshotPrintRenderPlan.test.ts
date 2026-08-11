import { describe, expect, it } from 'vitest';
import { ContentPackData, Target } from '../types';
import { buildAssessmentSnapshotProfile } from '../services/assessmentSnapshotProfile';
import { buildLearnerMapProfile, LearnerMapCycleInput } from '../services/learnerMapProfile';
import { buildSnapshotRenderPlan } from './snapshotLayoutEngine';
import {
    buildPrintRenderPlan,
    DomainSegmentPlan,
    flattenPrintPlanColumns,
    flattenPrintPlanSegments,
    flattenPrintPlanTargetIds,
    PrintRenderPlan,
} from './snapshotPrintRenderPlan';

const generatedAt = new Date('2026-07-06T12:00:00.000Z');

function makeTarget(overrides: Partial<Target> & Pick<Target, 'target_id'>): Target {
    return {
        title: overrides.title ?? overrides.target_id,
        success_criteria: 'Criteria',
        materials: '',
        scoring: {
            type: 'numeric',
            scale: [0, 1, 2, 3, 4],
            scale_labels: {},
            no_opportunity_allowed: false,
        },
        ...overrides,
    };
}

function makeTargetList(prefix: string, count: number): Target[] {
    return Array.from({ length: count }, (_, index) =>
        makeTarget({ target_id: `${prefix}${index + 1}`, title: `${prefix} ${index + 1}` })
    );
}

function makeCycles(count: number): LearnerMapCycleInput[] {
    return Array.from({ length: count }, (_, index) => ({
        cycle: {
            id: `c${index + 1}`,
            cycle_number: index + 1,
            status: index === count - 1 ? ('in_progress' as const) : ('closed' as const),
        },
        scores: [],
    }));
}

function makeProfile(pack: ContentPackData, cycleCount = 2) {
    return buildAssessmentSnapshotProfile(
        buildLearnerMapProfile({
            assessment: { id: 'assess-1', pack_snapshot: pack },
            cycles: makeCycles(cycleCount),
            generatedAt,
        })
    );
}

function pageDomainIds(plan: PrintRenderPlan, pageIndex: number): string[] {
    return plan.pages[pageIndex].rows[0].columns.map((column) => column.segment.domainId);
}

function segmentRanges(segments: DomainSegmentPlan[]): [number, number][] {
    return segments.map((segment) => [segment.targetStartOrdinal, segment.targetEndOrdinal]);
}

const acgPack: ContentPackData = {
    pack_id: 'production-acg',
    org_id: 'org-1',
    title: 'Production A-C, G',
    description: '',
    version: '1.0',
    domains: [
        { domain_id: 'A', title: 'Domain A', targets: makeTargetList('A', 19) },
        { domain_id: 'B', title: 'Domain B', targets: makeTargetList('B', 27) },
        { domain_id: 'C', title: 'Domain C', targets: makeTargetList('C', 57) },
        { domain_id: 'G', title: 'Domain G', targets: makeTargetList('G', 47) },
    ],
};

describe('buildPrintRenderPlan — production A-C, G (primary acceptance)', () => {
    const profile = makeProfile(acgPack, 2);
    const plan = buildPrintRenderPlan(profile, { paper: 'letter' });

    it('composes a sensible two-page Letter plan', () => {
        expect(plan.mode).toBe('print');
        expect(plan.tier).toBe('dense');
        expect(plan.columnsPerPage).toBe(4);
        expect(plan.totalPages).toBe(2);
    });

    it('keeps A and B whole, and flows C and G continuations into sibling columns', () => {
        // Page 1: A | B | C(1–29) | C(30–57)
        expect(pageDomainIds(plan, 0)).toEqual(['A', 'B', 'C', 'C']);
        // Page 2: G(1–24) | G(25–47)
        expect(pageDomainIds(plan, 1)).toEqual(['G', 'G']);

        const byKey = (key: string) =>
            flattenPrintPlanSegments(plan).filter((segment) => segment.domainKey === key);

        expect(byKey('A')).toHaveLength(1);
        expect(byKey('B')).toHaveLength(1);
        expect(segmentRanges(byKey('C'))).toEqual([
            [1, 29],
            [30, 57],
        ]);
        expect(segmentRanges(byKey('G'))).toEqual([
            [1, 24],
            [25, 47],
        ]);
    });

    it('marks continuation segments as adjacent siblings for the optional connector', () => {
        const segments = flattenPrintPlanSegments(plan);
        const secondC = segments.find((s) => s.domainKey === 'C' && s.segmentNumber === 2);
        const secondG = segments.find((s) => s.domainKey === 'G' && s.segmentNumber === 2);
        expect(secondC?.connectsToPreviousInRow).toBe(true);
        expect(secondG?.connectsToPreviousInRow).toBe(true);
    });

    it('never produces a headerless continuation and always repeats domain identity', () => {
        for (const segment of flattenPrintPlanSegments(plan)) {
            expect(segment.domainTitle.length).toBeGreaterThan(0);
            expect(segment.targetEndOrdinal).toBeGreaterThanOrEqual(segment.targetStartOrdinal);
            if (segment.isContinuation) {
                expect(segment.segmentNumber).toBeGreaterThan(1);
            }
        }
    });

    it('renders the footer once, on the final page only', () => {
        expect(plan.pages[0].footerMode).toBe('none');
        expect(plan.pages[plan.totalPages - 1].footerMode).toBe('document');
    });

    it('places all 150 targets exactly once in authored order', () => {
        const ids = flattenPrintPlanTargetIds(plan);
        expect(ids).toHaveLength(150);
        expect(new Set(ids).size).toBe(150);
        expect(ids).toEqual(profile.domains.flatMap((d) => d.targets.map((t) => t.targetId)));
    });
});

describe('buildPrintRenderPlan — large flat fixtures', () => {
    it('PEAK 184 flows columns horizontally before adding pages (3 cycles)', () => {
        const profile = makeProfile(
            {
                pack_id: 'peak',
                org_id: 'org-1',
                title: 'PEAK',
                description: '',
                version: '1.0',
                domains: [{ domain_id: 'P', title: 'PEAK', targets: makeTargetList('P', 184) }],
            },
            3
        );
        const plan = buildPrintRenderPlan(profile);

        expect(plan.tier).toBe('dense');
        expect(plan.columnsPerPage).toBe(4);
        // Page 1 fills all 4 columns; overflow continues on page 2.
        expect(plan.pages[0].rows[0].columns).toHaveLength(4);
        expect(plan.totalPages).toBe(2);

        const ids = flattenPrintPlanTargetIds(plan);
        expect(ids).toHaveLength(184);
        expect(ids).toEqual(profile.domains[0].targets.map((t) => t.targetId));
    });

    it('AFLS 205 rebalances the final page columns (no runt)', () => {
        const profile = makeProfile(
            {
                pack_id: 'afls',
                org_id: 'org-1',
                title: 'AFLS',
                description: '',
                version: '1.0',
                domains: [{ domain_id: 'F', title: 'AFLS', targets: makeTargetList('F', 205) }],
            },
            2
        );
        const plan = buildPrintRenderPlan(profile);
        const lastPage = plan.pages[plan.totalPages - 1];
        const lastSizes = lastPage.rows[0].columns.map(
            (c) => c.segment.targetEndOrdinal - c.segment.targetStartOrdinal + 1
        );

        // Final page holds the 73 remaining targets balanced across two columns
        // (first-page capacity 33 after container-height budgeting).
        expect(lastSizes).toEqual([37, 36]);
        expect(flattenPrintPlanTargetIds(plan)).toHaveLength(205);
    });

    it('Extreme 250 stays deterministic with no target loss (6 cycles)', () => {
        const profile = makeProfile(
            {
                pack_id: 'extreme',
                org_id: 'org-1',
                title: 'Extreme',
                description: '',
                version: '1.0',
                domains: [{ domain_id: 'X', title: 'Extreme', targets: makeTargetList('X', 250) }],
            },
            6
        );
        const first = buildPrintRenderPlan(profile);
        const second = buildPrintRenderPlan(profile);

        expect(first.columnsPerPage).toBe(2);
        expect(JSON.stringify(first)).toBe(JSON.stringify(second));

        const ids = flattenPrintPlanTargetIds(first);
        expect(ids).toHaveLength(250);
        expect(new Set(ids).size).toBe(250);
        expect(ids).toEqual(profile.domains[0].targets.map((t) => t.targetId));
    });
});

describe('buildPrintRenderPlan — grouped (VB-MAPP-like)', () => {
    const groupedPack: ContentPackData = {
        pack_id: 'vb',
        org_id: 'org-1',
        title: 'VB Pack',
        description: '',
        version: '1.0',
        structure_labels: { primary_group: 'Level', secondary_group: 'Domain', target: 'Milestone' },
        domains: [
            {
                domain_id: 'L1',
                title: 'Level 1',
                secondary_groups: [
                    { secondary_group_id: 'sg_a', title: 'Listening' },
                    { secondary_group_id: 'sg_b', title: 'Motor' },
                ],
                targets: [
                    ...makeTargetList('LA', 60).map((t) => ({ ...t, secondary_group_id: 'sg_a' })),
                    ...makeTargetList('LB', 30).map((t) => ({ ...t, secondary_group_id: 'sg_b' })),
                ],
            },
            {
                domain_id: 'L2',
                title: 'Level 2',
                secondary_groups: [{ secondary_group_id: 'sg_c', title: 'Vocal' }],
                targets: makeTargetList('LC', 40).map((t) => ({ ...t, secondary_group_id: 'sg_c' })),
            },
        ],
    };
    const profile = makeProfile(groupedPack, 2);
    const plan = buildPrintRenderPlan(profile);

    it('detects grouped topology and starts each chapter on its own page', () => {
        expect(plan.topology).toBe('grouped');
        // First chapter opens the document page; second chapter opens a fresh page.
        expect(plan.pages[0].headerMode).toBe('document-chapter');
        const l2FirstPage = plan.pages.find(
            (p) => p.chapterBand?.primaryGroupId === 'L2' && !p.chapterBand.isChapterContinuation
        );
        expect(l2FirstPage?.headerMode).toBe('chapter');
    });

    it('never lets a segment migrate into another chapter', () => {
        for (const page of plan.pages) {
            const bandPrimary = page.chapterBand?.primaryGroupId;
            for (const column of page.rows[0].columns) {
                expect(column.segment.primaryGroupId).toBe(bandPrimary);
            }
        }
    });

    it('repeats chapter context on continuation pages within a chapter', () => {
        const continuationPages = plan.pages.filter(
            (p) => p.chapterBand?.isChapterContinuation
        );
        for (const page of continuationPages) {
            expect(page.chapterBand?.chapterTitle.length).toBeGreaterThan(0);
        }
    });

    it('keeps every milestone exactly once, in authored order', () => {
        const ids = flattenPrintPlanTargetIds(plan);
        const expected = profile.domains.flatMap((d) => d.targets.map((t) => t.targetId));
        expect(ids).toHaveLength(expected.length);
        expect(new Set(ids).size).toBe(expected.length);
        expect(ids).toEqual(expected);
    });
});

describe('buildPrintRenderPlan — capacity / paper / integrity', () => {
    it('produces more pages on Letter than A4 for a borderline flat fixture', () => {
        const profile = makeProfile(
            {
                pack_id: 'paper',
                org_id: 'org-1',
                title: 'Paper',
                description: '',
                version: '1.0',
                domains: [{ domain_id: 'D', title: 'Domain', targets: makeTargetList('D', 200) }],
            },
            2
        );
        const letter = buildPrintRenderPlan(profile, { paper: 'letter' });
        const a4 = buildPrintRenderPlan(profile, { paper: 'a4' });

        expect(letter.profileId).toBe('letter');
        expect(a4.profileId).toBe('a4');
        // A4 columns hold more rows, so it needs no more pages than Letter.
        expect(a4.totalPages).toBeLessThanOrEqual(letter.totalPages);
        expect(flattenPrintPlanTargetIds(letter)).toHaveLength(200);
        expect(flattenPrintPlanTargetIds(a4)).toHaveLength(200);
    });

    it('keeps small flat domains whole with no continuation', () => {
        const profile = makeProfile(
            {
                pack_id: 'small',
                org_id: 'org-1',
                title: 'Small',
                description: '',
                version: '1.0',
                domains: [
                    { domain_id: 'A', title: 'Domain A', targets: makeTargetList('A', 8) },
                    { domain_id: 'B', title: 'Domain B', targets: makeTargetList('B', 10) },
                    { domain_id: 'C', title: 'Domain C', targets: makeTargetList('C', 6) },
                ],
            },
            3
        );
        const plan = buildPrintRenderPlan(profile);
        expect(plan.totalPages).toBe(1);
        for (const segment of flattenPrintPlanSegments(plan)) {
            expect(segment.segmentCount).toBe(1);
            expect(segment.isContinuation).toBe(false);
        }
    });

    it('assigns contiguous, complete, non-overlapping ranges within each domain', () => {
        const profile = makeProfile(acgPack, 2);
        const plan = buildPrintRenderPlan(profile);
        const byKey = new Map<string, DomainSegmentPlan[]>();
        for (const segment of flattenPrintPlanSegments(plan)) {
            byKey.set(segment.domainKey, [...(byKey.get(segment.domainKey) ?? []), segment]);
        }
        for (const [, segments] of byKey) {
            let expectedStart = 1;
            for (const segment of segments) {
                expect(segment.targetStartOrdinal).toBe(expectedStart);
                expectedStart = segment.targetEndOrdinal + 1;
            }
            expect(expectedStart - 1).toBe(segments[0].domainTargetCount);
        }
    });

    it('gives every column a fixed width equal to the plan column width', () => {
        const profile = makeProfile(acgPack, 2);
        const plan = buildPrintRenderPlan(profile);
        for (const column of flattenPrintPlanColumns(plan)) {
            expect(column.widthRem).toBe(plan.domainColumnWidthRem);
        }
    });

    it('does not mutate the profile and does not affect the screen plan', () => {
        const profile = makeProfile(
            {
                pack_id: 'screen-safe',
                org_id: 'org-1',
                title: 'Screen Safe',
                description: '',
                version: '1.0',
                domains: [{ domain_id: 'X', title: 'Extreme', targets: makeTargetList('X', 250) }],
            },
            2
        );
        const snapshot = JSON.stringify(profile);

        const screenBefore = buildSnapshotRenderPlan(profile, { mode: 'screen' });
        buildPrintRenderPlan(profile);
        const screenAfter = buildSnapshotRenderPlan(profile, { mode: 'screen' });

        expect(JSON.stringify(profile)).toBe(snapshot);
        expect(JSON.stringify(screenAfter)).toBe(JSON.stringify(screenBefore));

        // Screen extreme factoring is unchanged: 46,46,46,46,46,20.
        const screenSizes = screenBefore.chapters[0].rows
            .flatMap((row) => row.zones)
            .flatMap((zone) => zone.parts)
            .map((part) => part.threads.length);
        expect(screenSizes).toEqual([46, 46, 46, 46, 46, 20]);
    });
});
