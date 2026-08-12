import { describe, expect, it } from 'vitest';
import { snapshotCellClass } from '../snapshotCellDisplay';
import {
    beadNumeralClass,
    codesShareVisiblePrefix,
    formatPresentationPartHeading,
    formatPresentationTargetRange,
    formatStructureCount,
    maxRingAccessibleLabel,
    maxRingLegendSwatchClass,
    maxRingSurfaceClass,
    resolveSnapshotLegendCopy,
    toDisplayTitleCase,
    truncatePreservingDistinction,
} from './snapshotVisualSystem';

describe('snapshotVisualSystem', () => {
    it('formats structure counts without broken Target s strings', () => {
        expect(formatStructureCount(1, 'Target')).toBe('1 target');
        expect(formatStructureCount(10, 'Target')).toBe('10 targets');
        expect(formatStructureCount(3, 'Milestone')).toBe('3 milestones');
        expect(formatPresentationTargetRange(47, 92, 'Target')).toBe('Targets 47–92');
        expect(formatPresentationTargetRange(1, 46, 'Milestone')).toBe('Milestones 1–46');
        expect(formatPresentationTargetRange(47, 92, 'Target')).not.toContain('Target s');
    });

    it('uses shared part-range language for screen and print', () => {
        expect(formatPresentationPartHeading(2)).toBe('Part 2');
        expect(formatPresentationPartHeading(2, { continued: true })).toBe('Part 2 (continued)');
        expect(formatPresentationPartHeading(1)).not.toContain('Presentation');
    });

    it('preserves distinguishing suffixes instead of collapsing common prefixes', () => {
        expect(truncatePreservingDistinction('AFLS_1', 6)).not.toBe('AFLS…');
        expect(truncatePreservingDistinction('AFLS_1', 6)).toContain('1');
        expect(truncatePreservingDistinction('AFLS_205', 6)).toContain('205');
        expect(truncatePreservingDistinction('AFLS_1', 6)).not.toEqual(
            truncatePreservingDistinction('AFLS_205', 6)
        );
        expect(truncatePreservingDistinction('ECHO_12', 8)).toBe('ECHO_12');
        expect(truncatePreservingDistinction('PEAK_DT_184', 8)).toContain('184');
    });

    it('detects when truncated codes would share a useless prefix', () => {
        expect(codesShareVisiblePrefix(['AFLS_1', 'AFLS_2', 'AFLS_3'], 4)).toBe(true);
        expect(codesShareVisiblePrefix(['A1', 'B1', 'C1'], 2)).toBe(false);
    });

    it('uses clinical legend reminder copy from STATE_DISPLAY_LABELS', () => {
        const legend = resolveSnapshotLegendCopy();
        expect(legend.states.map((state) => state.label)).toEqual([
            'Not Demonstrated',
            'Emerging',
            'Demonstrated',
            'Unscored',
        ]);
        expect(legend.scoreHint).toBe('Number inside each bead = score for that cycle');
        expect(legend.maxHint).toBe('Hollow mark = target maximum');
        expect(legend.scoreHint).not.toMatch(/colour|competency state/i);
    });

    it('swaps the score hint when bead numerals are hidden', () => {
        const hidden = resolveSnapshotLegendCopy({ showScores: false });
        expect(hidden.scoreHint).toBe(
            'Bead numerals visually suppressed — scores remain in this record'
        );
        expect(hidden.scoreHint).not.toBe('Number inside each bead = score for that cycle');
        expect(hidden.maxHint).toBe('Hollow mark = target maximum');
    });

    it('keeps dark numerals on light bead fills', () => {
        expect(beadNumeralClass('not_yet')).toContain('text-gray-900');
        expect(beadNumeralClass('in_progress')).toContain('text-gray-900');
        expect(beadNumeralClass('at_maximum')).toContain('text-white');
        expect(beadNumeralClass('unscored')).toContain('text-gray-900');
    });

    it('uses a hollow green-outline max ring, distinct from solid Demonstrated beads', () => {
        const maxClass = maxRingSurfaceClass();
        const legendSwatch = maxRingLegendSwatchClass();
        const demonstratedFill = snapshotCellClass('at_maximum');

        expect(maxClass).toContain('border-green-700');
        expect(maxClass).toContain('bg-white');
        expect(maxClass).toMatch(/border-2/);
        expect(maxClass).not.toMatch(/bg-green/);
        expect(legendSwatch).toContain('border-green-700');
        expect(legendSwatch).toContain('bg-white');
        expect(demonstratedFill).toContain('bg-green-600');
        expect(maxRingAccessibleLabel('Mand 1', '4')).toBe('Mand 1 · Maximum 4');
        expect(maxRingAccessibleLabel('Mand 1', '4')).not.toMatch(/master/i);
    });

    it('applies calm title-case grammar for domain and chapter titles', () => {
        expect(toDisplayTitleCase('LEVEL 1')).toBe('Level 1');
        expect(toDisplayTitleCase('COOPERATION & REINFORCER EFFECTIVENESS')).toBe(
            'Cooperation & Reinforcer Effectiveness'
        );
        expect(toDisplayTitleCase('Listener Responding')).toBe('Listener Responding');
    });
});
