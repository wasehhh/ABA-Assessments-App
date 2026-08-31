/**
 * A calendar date (`YYYY-MM-DD`, Postgres DATE) is not a UTC midnight instant.
 * Parsing it with `new Date('2018-06-15')` and then `toLocaleDateString()`
 * shifts the displayed day west of UTC.
 *
 * Timestamps (`timestamptz` / ISO date-time) must not use this path.
 */

const CALENDAR_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCalendarDateOnly(value: string): boolean {
    return CALENDAR_DATE_ONLY.test(value);
}

/**
 * Render a date-only value as that calendar date, independent of viewer timezone.
 */
export function formatCalendarDate(
    value: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const match = CALENDAR_DATE_ONLY.exec(value);
    if (!match) {
        return value;
    }
    const utc = new Date(
        Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    );
    return utc.toLocaleDateString(undefined, { ...options, timeZone: 'UTC' });
}

/**
 * Date input value from a DATE column: the stored calendar string, not a Date parse.
 */
export function calendarDateInputValue(value: string | null | undefined): string {
    if (!value) {
        return '';
    }
    return isCalendarDateOnly(value) ? value : '';
}
