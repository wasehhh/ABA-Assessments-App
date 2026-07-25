import { describe, expect, it } from 'vitest';
import { resolveDomainColumnWidthRem } from './snapshotLayoutEngine';
import {
    computeColumnCapacities,
    computeColumnRowCapacity,
    computeColumnsPerPage,
    DEFAULT_PRINT_PAGE_PROFILE_ID,
    PRINT_COMPOSITION_PROFILES,
    PRINT_IN_TO_REM,
    resolvePageHeaderReserveRem,
    resolvePrintCompositionProfile,
} from './snapshotPrintPageProfile';

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

        // Letter dense: first-page column ≈ 36 rows, continuation ≈ 42 rows.
        expect(caps.firstPageRows).toBe(36);
        expect(caps.continuationRows).toBe(42);
        expect(caps.continuationRows).toBeGreaterThan(caps.firstPageRows);
        expect(caps.chapterStartRows).toBeGreaterThan(caps.firstPageRows);
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
});
