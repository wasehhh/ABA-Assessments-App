import { describe, expect, it } from 'vitest';
import {
    buildCycleDateLabels,
    formatCycleAnchorLabel,
    resolveCycleAnchorIso,
} from './cycleDateDisplay';

describe('cycleDateDisplay', () => {
    it('prefers end_date, then start_date, then created_at', () => {
        expect(
            resolveCycleAnchorIso({
                id: 'c1',
                end_date: '2026-06-15T00:00:00.000Z',
                start_date: '2026-01-01T00:00:00.000Z',
                created_at: '2025-12-01T00:00:00.000Z',
            })
        ).toBe('2026-06-15T00:00:00.000Z');

        expect(
            resolveCycleAnchorIso({
                id: 'c2',
                start_date: '2026-03-20T00:00:00.000Z',
                created_at: '2026-01-01T00:00:00.000Z',
            })
        ).toBe('2026-03-20T00:00:00.000Z');
    });

    it('formats month-year labels for cycle rows', () => {
        expect(formatCycleAnchorLabel('2026-01-15T00:00:00.000Z')).toMatch(/Jan.*2026/);
    });

    it('builds cycle id labels and skips cycles without dates', () => {
        expect(
            buildCycleDateLabels([
                { id: 'cycle-1', start_date: '2026-01-15T00:00:00.000Z' },
                { id: 'cycle-2' },
            ])
        ).toEqual({
            'cycle-1': formatCycleAnchorLabel('2026-01-15T00:00:00.000Z'),
        });
    });
});
