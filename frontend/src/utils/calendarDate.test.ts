import { describe, expect, it } from 'vitest';
import {
    calendarDateInputValue,
    formatCalendarDate,
    isCalendarDateOnly,
} from './calendarDate';
import { formatFinalizedReportDate } from './finalizedReportPresentation';

describe('calendar date rendering', () => {
    it('treats YYYY-MM-DD as a calendar date, not a UTC midnight instant', () => {
        expect(isCalendarDateOnly('2018-06-15')).toBe(true);
        expect(isCalendarDateOnly('2018-06-15T00:00:00.000Z')).toBe(false);
        expect(isCalendarDateOnly('2018-06-15T12:00:00')).toBe(false);
    });

    it('renders a date-only value as the entered day under a negative-offset timezone', () => {
        const value = '2018-06-15';
        const shiftedInToronto = new Date(value).toLocaleDateString('en-US', {
            timeZone: 'America/Toronto',
        });
        expect(shiftedInToronto).toBe('6/14/2018');
        expect(formatCalendarDate(value)).toBe(
            new Date(Date.UTC(2018, 5, 15)).toLocaleDateString(undefined, {
                timeZone: 'UTC',
            })
        );
        expect(formatCalendarDate(value)).not.toBe(shiftedInToronto);
        expect(formatCalendarDate(value, { dateStyle: 'long' })).not.toBe(
            new Date(value).toLocaleDateString(undefined, {
                dateStyle: 'long',
                timeZone: 'America/Toronto',
            })
        );
    });

    it('does not shift a stored DATE when populating an edit input', () => {
        expect(calendarDateInputValue('2018-06-15')).toBe('2018-06-15');
        expect(calendarDateInputValue(null)).toBe('');
        expect(calendarDateInputValue('2018-06-15T00:00:00.000Z')).toBe('');
        expect(new Date('2018-06-15').toISOString().split('T')[0]).toBe('2018-06-15');
    });
});

describe('formatFinalizedReportDate', () => {
    it('renders a date-only value as that calendar date', () => {
        const value = '2018-06-15';
        expect(formatFinalizedReportDate(value)).toBe(
            formatCalendarDate(value, { dateStyle: 'long' })
        );
        expect(formatFinalizedReportDate(value)).not.toBe(
            new Date(value).toLocaleDateString(undefined, {
                dateStyle: 'long',
                timeZone: 'America/Toronto',
            })
        );
        expect(formatFinalizedReportDate(value)).not.toBe('—');
    });

    it('renders a timestamp the same way as today (local instant, not UTC calendar)', () => {
        const timestamp = '2026-08-27T20:07:00.000Z';
        expect(formatFinalizedReportDate(timestamp)).toBe(
            new Date(timestamp).toLocaleDateString(undefined, { dateStyle: 'long' })
        );
        expect(formatFinalizedReportDate(null)).toBe('—');
        expect(formatFinalizedReportDate('')).toBe('—');
    });
});
