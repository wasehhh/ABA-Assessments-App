import { describe, expect, it } from 'vitest';
import {
    SNAPSHOT_CYCLE_DATE_UNAVAILABLE,
    buildSnapshotCycleDateLabels,
    buildSnapshotCycleReferenceEntries,
    formatSnapshotCycleReferenceDate,
    formatSnapshotCycleReferenceEntry,
} from './snapshotCycleReference';

describe('snapshotCycleReference', () => {
    it('formats full dates with day for screen and print parity', () => {
        const screen = formatSnapshotCycleReferenceDate('2026-01-12T00:00:00.000Z');
        const print = formatSnapshotCycleReferenceDate('2026-01-12T00:00:00.000Z');
        expect(screen).toMatch(/Jan/);
        expect(screen).toMatch(/12/);
        expect(screen).toMatch(/2026/);
        expect(screen).toBe(print);
    });

    it('preserves the UTC calendar day for midnight ISO timestamps', () => {
        expect(formatSnapshotCycleReferenceDate('2026-01-12T00:00:00Z')).toBe('Jan 12, 2026');
        expect(formatSnapshotCycleReferenceDate('2026-01-12T00:00:00.000Z')).toBe('Jan 12, 2026');
    });

    it('builds one reference entry per cycle in order', () => {
        const entries = buildSnapshotCycleReferenceEntries(
            [
                { cycleId: 'c1', cycleNumber: 1 },
                { cycleId: 'c2', cycleNumber: 2 },
                { cycleId: 'c3', cycleNumber: 3 },
            ],
            {
                c1: 'Jan 12, 2026',
                c2: 'Mar 18, 2026',
                c3: 'Jun 10, 2026',
            }
        );

        expect(entries.map((entry) => entry.label)).toEqual([
            'C1 — Jan 12, 2026',
            'C2 — Mar 18, 2026',
            'C3 — Jun 10, 2026',
        ]);
        expect(entries).toHaveLength(3);
    });

    it('uses a neutral missing-date fallback without omitting the cycle', () => {
        const entries = buildSnapshotCycleReferenceEntries(
            [
                { cycleId: 'c1', cycleNumber: 1 },
                { cycleId: 'c2', cycleNumber: 2 },
            ],
            { c1: 'Jan 12, 2026' }
        );

        expect(entries[0].label).toBe('C1 — Jan 12, 2026');
        expect(entries[1].label).toBe(`C2 — ${SNAPSHOT_CYCLE_DATE_UNAVAILABLE}`);
        expect(entries[1].hasDate).toBe(false);
        expect(formatSnapshotCycleReferenceEntry(1, null)).toBe(
            `C1 — ${SNAPSHOT_CYCLE_DATE_UNAVAILABLE}`
        );
    });

    it('builds snapshot date labels from cycle sources without mutating input', () => {
        const cycles = [
            { id: 'cycle-1', start_date: '2026-01-12T00:00:00.000Z' },
            { id: 'cycle-2' },
        ];
        const frozen = JSON.stringify(cycles);
        const labels = buildSnapshotCycleDateLabels(cycles);

        expect(labels['cycle-1']).toMatch(/Jan/);
        expect(labels['cycle-1']).toMatch(/12/);
        expect(labels['cycle-2']).toBeUndefined();
        expect(JSON.stringify(cycles)).toBe(frozen);
    });
});
