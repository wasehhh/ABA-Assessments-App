import { describe, expect, it } from 'vitest';
import { formatCycleLabel } from './snapshotConceptShared';

describe('snapshotConceptShared', () => {
    it('formats cycle labels with optional dates', () => {
        const cycle = { cycleId: 'c1', cycleNumber: 2, cycleStatus: 'closed' };

        expect(formatCycleLabel(cycle)).toBe('Cycle 2');
        expect(formatCycleLabel(cycle, { c1: 'Mar 2026' })).toBe('Cycle 2 · Mar 2026');
    });
});
