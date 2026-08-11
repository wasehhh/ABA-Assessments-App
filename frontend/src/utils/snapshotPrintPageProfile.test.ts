import { describe, expect, it } from 'vitest';
import { resolveDomainColumnWidthRem, type SnapshotLayoutTier } from './snapshotLayoutEngine';
import {
    buildSnapshotPrintPageCss,
    computeColumnCapacities,
    computeColumnRowCapacity,
    computeColumnsPerPage,
    DEFAULT_PRINT_PAGE_PROFILE_ID,
    estimateThreadRowHeightRem,
    PRINT_COMPOSITION_PROFILES,
    PRINT_FOOTER_REM,
    PRINT_IN_TO_REM,
    PRINT_PAGE_BOX_TOLERANCE_REM,
    PRINT_PAGE_MARGIN_REM,
    type PrintPageHeaderMode,
    resolvePageHeaderReserveRem,
    resolvePrintCompositionProfile,
    resolvePrintPageContainerHeightRem,
    SNAPSHOT_PRINT_PAGE_NAME,
} from './snapshotPrintPageProfile';

const PROFILE_IDS = ['letter', 'a4'] as const;
const TIERS: SnapshotLayoutTier[] = ['compact', 'standard', 'dense'];
const HEADER_MODES: PrintPageHeaderMode[] = [
    'document',
    'document-chapter',
    'chapter',
    'continuation',
];

describe('snapshotPrintPageProfile', () => {
    it('models Letter and A4 page geometry from documented inch conversions', () => {
        const letter = resolvePrintCompositionProfile('letter');
        const a4 = resolvePrintCompositionProfile('a4');

        // 1in = 6rem; margin 0.5in per side = 3rem.
        expect(letter.pageWidthRem).toBeCloseTo(8.5 * PRINT_IN_TO_REM, 5);
        expect(letter.pageHeightRem).toBeCloseTo(11 * PRINT_IN_TO_REM, 5);
        expect(letter.usableWidthRem).toBeCloseTo(51 - 6, 5);
        expect(letter.usableHeightRem).toBeCloseTo(66 - 6, 5);

        // A4 is narrower but taller than Letter.
        expect(a4.usableWidthRem).toBeLessThan(letter.usableWidthRem);
        expect(a4.usableHeightRem).toBeGreaterThan(letter.usableHeightRem);
    });

    it('exposes frozen source profiles and returns immutable clones', () => {
        expect(Object.isFrozen(PRINT_COMPOSITION_PROFILES.letter)).toBe(true);
        expect(Object.isFrozen(PRINT_COMPOSITION_PROFILES.a4)).toBe(true);

        const clone = resolvePrintCompositionProfile('letter');
        clone.usableHeightRem = 1;
        expect(PRINT_COMPOSITION_PROFILES.letter.usableHeightRem).not.toBe(1);
        expect(DEFAULT_PRINT_PAGE_PROFILE_ID).toBe('letter');
    });

    it('fits fewer columns as cycle count grows', () => {
        const letter = resolvePrintCompositionProfile('letter');
        const twoCycle = resolveDomainColumnWidthRem(2, 'dense');
        const threeCycle = resolveDomainColumnWidthRem(3, 'dense');
        const sixCycle = resolveDomainColumnWidthRem(6, 'dense');

        expect(computeColumnsPerPage(letter, twoCycle)).toBe(4);
        expect(computeColumnsPerPage(letter, threeCycle)).toBe(4);
        expect(computeColumnsPerPage(letter, sixCycle)).toBe(2);
    });

    it('never returns fewer than one column even for a very wide column', () => {
        const letter = resolvePrintCompositionProfile('letter');
        expect(computeColumnsPerPage(letter, 999)).toBe(1);
        expect(computeColumnsPerPage(letter, 0)).toBe(1);
    });

    it('gives continuation pages more row capacity than the first page', () => {
        const letter = resolvePrintCompositionProfile('letter');
        const caps = computeColumnCapacities(letter, 'dense');

        // Letter dense: container-budgeted first-page 33, continuation 40.
        expect(caps.firstPageRows).toBe(33);
        expect(caps.continuationRows).toBe(40);
        expect(caps.continuationRows).toBeGreaterThan(caps.firstPageRows);
        expect(caps.chapterStartRows).toBeGreaterThan(caps.firstPageRows);
    });

    it('reserves PRINT_FOOTER_REM in column capacity (lower than e2ae9cc by footer/rowHeight)', () => {
        const letter = resolvePrintCompositionProfile('letter');
        const rowHeight = estimateThreadRowHeightRem('dense');
        const footerRows = PRINT_FOOTER_REM / rowHeight; // 2.0
        expect(footerRows).toBe(2);

        const continuation = computeColumnRowCapacity(letter, 'dense', 'continuation');
        const e2ae9ccWithoutFooter = Math.max(
            1,
            Math.floor(
                (letter.usableHeightRem -
                    resolvePageHeaderReserveRem(letter, 'continuation') -
                    letter.segmentHeaderRem) /
                    rowHeight
            )
        );
        expect(e2ae9ccWithoutFooter).toBe(42); // e2ae9cc baseline
        // Footer (−2) plus container tolerance may remove additional fractional row.
        expect(continuation).toBeLessThanOrEqual(e2ae9ccWithoutFooter - footerRows);
        expect(continuation).toBe(40);
    });

    it('gives A4 more vertical capacity than Letter for the same tier', () => {
        const letter = computeColumnCapacities(resolvePrintCompositionProfile('letter'), 'dense');
        const a4 = computeColumnCapacities(resolvePrintCompositionProfile('a4'), 'dense');

        expect(a4.firstPageRows).toBeGreaterThan(letter.firstPageRows);
        expect(a4.continuationRows).toBeGreaterThan(letter.continuationRows);
    });

    it('reserves progressively less header space per page context', () => {
        const letter = resolvePrintCompositionProfile('letter');
        expect(resolvePageHeaderReserveRem(letter, 'document-chapter')).toBeGreaterThan(
            resolvePageHeaderReserveRem(letter, 'document')
        );
        expect(resolvePageHeaderReserveRem(letter, 'document')).toBeGreaterThan(
            resolvePageHeaderReserveRem(letter, 'chapter')
        );
        expect(resolvePageHeaderReserveRem(letter, 'document')).toBeGreaterThan(
            resolvePageHeaderReserveRem(letter, 'continuation')
        );
    });

    it('reduces capacity for taller thread rows (compact/standard vs dense)', () => {
        const letter = resolvePrintCompositionProfile('letter');
        const dense = computeColumnRowCapacity(letter, 'dense', 'continuation');
        const standard = computeColumnRowCapacity(letter, 'standard', 'continuation');
        expect(dense).toBeGreaterThan(standard);
    });

    it('emits named @page margin from PRINT_PAGE_MARGIN_REM with no duplicated literal', () => {
        const css = buildSnapshotPrintPageCss();
        const marginIn = PRINT_PAGE_MARGIN_REM / PRINT_IN_TO_REM;
        const letter = PRINT_COMPOSITION_PROFILES.letter;
        const containerHeightRem = resolvePrintPageContainerHeightRem(letter);

        expect(css).toContain(`@page ${SNAPSHOT_PRINT_PAGE_NAME}`);
        expect(css).toContain(`margin: ${marginIn}in`);
        expect(css).toContain(
            `size: ${letter.pageWidthRem / PRINT_IN_TO_REM}in ${letter.pageHeightRem / PRINT_IN_TO_REM}in`
        );
        expect(css).toContain(`page: ${SNAPSHOT_PRINT_PAGE_NAME}`);
        expect(css).toContain(`min-height: ${containerHeightRem}rem`);
        expect(css).toContain('margin-top: auto');

        // Unnamed @page must not be introduced — Learner Map keeps browser defaults.
        expect(css).not.toMatch(/@page\s*\{/);
        expect(css).not.toMatch(/@page\s+:/);
        const marginMatches = [...css.matchAll(/margin:\s*([0-9.]+)in/g)].map((m) => m[1]);
        expect(marginMatches).toEqual([String(marginIn)]);
    });

    it('page container height is strictly less than the @page content box (no exact fill)', () => {
        const letter = PRINT_COMPOSITION_PROFILES.letter;
        const contentBoxRem = letter.usableHeightRem;
        const containerRem = resolvePrintPageContainerHeightRem(letter);
        const css = buildSnapshotPrintPageCss();
        const minHeightMatch = css.match(
            /\.assessment-snapshot-print-page\s*\{[^}]*min-height:\s*([0-9.]+)rem/
        );
        expect(minHeightMatch).not.toBeNull();
        const emittedRem = Number(minHeightMatch![1]);

        expect(PRINT_PAGE_BOX_TOLERANCE_REM).toBe(0.25);
        expect(containerRem).toBe(contentBoxRem - PRINT_PAGE_BOX_TOLERANCE_REM);
        expect(containerRem).toBeLessThan(contentBoxRem);
        expect(emittedRem).toBe(containerRem);
        expect(css).not.toContain(`min-height: ${contentBoxRem}rem`);
    });

    it('planned page-box consumption cannot fill the content box exactly (blank-sheet guard)', () => {
        // N exact-height pages equal N content boxes; browsers still emit a trailing
        // blank sheet from sub-pixel overflow. Require strict headroom per page.
        const letter = PRINT_COMPOSITION_PROFILES.letter;
        const plannedPages = 2; // ABLLS-shaped / production A-C,G evidence length
        const containerRem = resolvePrintPageContainerHeightRem(letter);
        const consumption = plannedPages * containerRem;
        const contentBudget = plannedPages * letter.usableHeightRem;

        expect(consumption).toBeLessThan(contentBudget);
        expect(containerRem).toBeLessThan(letter.usableHeightRem);
    });

    it('max packed content + furniture fits the emitted container for every profile/tier/mode', () => {
        const violations: string[] = [];

        for (const profileId of PROFILE_IDS) {
            const profile = resolvePrintCompositionProfile(profileId);
            const containerRem = resolvePrintPageContainerHeightRem(profile);

            for (const tier of TIERS) {
                const rowHeight = estimateThreadRowHeightRem(tier);
                for (const headerMode of HEADER_MODES) {
                    const capacity = computeColumnRowCapacity(profile, tier, headerMode);
                    const packedRem =
                        resolvePageHeaderReserveRem(profile, headerMode) +
                        profile.segmentHeaderRem +
                        capacity * rowHeight +
                        profile.footerRem;

                    if (packedRem > containerRem) {
                        violations.push(
                            `${profileId}/${tier}/${headerMode}: packed ${packedRem} > container ${containerRem} (capacity ${capacity})`
                        );
                    }
                }
            }
        }

        expect(violations).toEqual([]);
    });

    it('container height and capacity share one tolerance source (no duplicated literal)', () => {
        const letter = resolvePrintCompositionProfile('letter');
        const css = buildSnapshotPrintPageCss();
        const containerRem = resolvePrintPageContainerHeightRem(letter);

        expect(css).toContain(`min-height: ${containerRem}rem`);
        // Capacity must budget from the same helper the CSS emitter uses.
        const capacityBudgetBase =
            resolvePrintPageContainerHeightRem(letter) -
            resolvePageHeaderReserveRem(letter, 'document') -
            letter.segmentHeaderRem -
            letter.footerRem;
        const expected = Math.max(
            1,
            Math.floor(capacityBudgetBase / estimateThreadRowHeightRem('dense'))
        );
        expect(computeColumnRowCapacity(letter, 'dense', 'document')).toBe(expected);
        // Tolerance appears only via the shared constant / helper — not restated.
        expect(PRINT_PAGE_BOX_TOLERANCE_REM).toBe(0.25);
        expect(containerRem).toBe(letter.usableHeightRem - PRINT_PAGE_BOX_TOLERANCE_REM);
    });
});
