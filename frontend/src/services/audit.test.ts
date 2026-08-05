import { describe, expect, it } from 'vitest';
import { normalizeAuditAction } from './audit';

describe('normalizeAuditAction EXPORT', () => {
    it('keeps EXPORT as a canonical action without mapped_from_action note', () => {
        expect(normalizeAuditAction('EXPORT')).toEqual({ action: 'EXPORT' });
        expect(normalizeAuditAction('export')).toEqual({ action: 'EXPORT' });
    });

    it('does not rewrite EXPORT to VIEW', () => {
        const result = normalizeAuditAction('EXPORT');
        expect(result.action).not.toBe('VIEW');
        expect(result.legacyNote).toBeUndefined();
    });
});
