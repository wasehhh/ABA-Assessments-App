import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditService } from '../services/audit';
import { normalizeAuditAction } from '../services/audit';
import {
    CLINICAL_EXPORT_AUDIT_EVENTS,
    claimExportViewAudit,
    logClinicalExportAudit,
} from './clinicalExportAudit';

describe('clinicalExportAudit event semantics', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('both artifacts share the same four events with the same meanings', () => {
        expect([...CLINICAL_EXPORT_AUDIT_EVENTS]).toEqual([
            'acknowledgement',
            'export_view',
            'html_export',
            'print',
        ]);
    });

    it('claimExportViewAudit fires once when acknowledged+available+ready', () => {
        const logged = { current: false };
        const guards = { acknowledged: true, available: true, ready: true };

        expect(claimExportViewAudit(logged, guards)).toBe(true);
        expect(logged.current).toBe(true);
        // re-render / second effect pass must not claim again
        expect(claimExportViewAudit(logged, guards)).toBe(false);
    });

    it('claimExportViewAudit does not fire when unacknowledged', () => {
        const logged = { current: false };
        expect(
            claimExportViewAudit(logged, {
                acknowledged: false,
                available: true,
                ready: true,
            })
        ).toBe(false);
        expect(logged.current).toBe(false);
    });

    it('claimExportViewAudit does not fire when unavailable or not ready', () => {
        const logged = { current: false };
        expect(
            claimExportViewAudit(logged, {
                acknowledged: true,
                available: false,
                ready: true,
            })
        ).toBe(false);
        expect(
            claimExportViewAudit(logged, {
                acknowledged: true,
                available: true,
                ready: false,
            })
        ).toBe(false);
        expect(logged.current).toBe(false);
    });

    it('Learner Map preview load uses export_view, not html_export', async () => {
        const logSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined);

        logClinicalExportAudit({
            orgId: 'org-1',
            userId: 'user-1',
            assessmentId: 'assess-1',
            artifact: 'learner-map',
            channel: 'export',
            mode: 'full',
            event: 'export_view',
        });

        expect(logSpy).toHaveBeenCalledTimes(1);
        const entry = logSpy.mock.calls[0][0];
        expect(entry.action).toBe('EXPORT');
        expect(entry.details).toMatchObject({
            artifact: 'learner-map',
            event: 'export_view',
        });
        expect(entry.details).not.toMatchObject({ event: 'html_export' });
        expect(normalizeAuditAction(String(entry.action))).toEqual({ action: 'EXPORT' });
    });

    it('Snapshot Download HTML uses html_export', async () => {
        const logSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined);

        logClinicalExportAudit({
            orgId: 'org-1',
            userId: 'user-1',
            assessmentId: 'assess-1',
            artifact: 'snapshot',
            channel: 'export',
            mode: 'full',
            event: 'html_export',
        });

        expect(logSpy).toHaveBeenCalledTimes(1);
        const entry = logSpy.mock.calls[0][0];
        expect(entry.action).toBe('EXPORT');
        expect(entry.details).toMatchObject({
            artifact: 'snapshot',
            event: 'html_export',
        });
        expect(entry.details).not.toHaveProperty('surface');
        expect(normalizeAuditAction(String(entry.action))).toEqual({ action: 'EXPORT' });
    });

    it('Snapshot export-page PDF uses print + surface export', async () => {
        const logSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined);

        logClinicalExportAudit({
            orgId: 'org-1',
            userId: 'user-1',
            assessmentId: 'assess-1',
            artifact: 'snapshot',
            channel: 'print',
            mode: 'full',
            event: 'print',
            surface: 'export',
        });

        expect(logSpy.mock.calls[0][0].details).toMatchObject({
            event: 'print',
            channel: 'print',
            surface: 'export',
        });
    });

    it('Snapshot main-page Print uses print + surface snapshot', async () => {
        const logSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined);

        logClinicalExportAudit({
            orgId: 'org-1',
            userId: 'user-1',
            assessmentId: 'assess-1',
            artifact: 'snapshot',
            channel: 'print',
            mode: 'full',
            event: 'print',
            surface: 'snapshot',
        });

        expect(logSpy.mock.calls[0][0].details).toMatchObject({
            event: 'print',
            surface: 'snapshot',
        });
    });

    it('Learner Map print may omit surface', async () => {
        const logSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined);

        logClinicalExportAudit({
            orgId: 'org-1',
            userId: 'user-1',
            assessmentId: 'assess-lm',
            artifact: 'learner-map',
            channel: 'print',
            mode: 'full',
            event: 'print',
        });

        expect(logSpy.mock.calls[0][0].details).toMatchObject({
            artifact: 'learner-map',
            event: 'print',
        });
        expect(logSpy.mock.calls[0][0].details).not.toHaveProperty('surface');
    });

    it('both artifacts log print with EXPORT action', async () => {
        const logSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined);

        logClinicalExportAudit({
            orgId: 'org-1',
            userId: 'user-1',
            assessmentId: 'assess-lm',
            artifact: 'learner-map',
            channel: 'print',
            mode: 'full',
            event: 'print',
        });
        logClinicalExportAudit({
            orgId: 'org-1',
            userId: 'user-1',
            assessmentId: 'assess-ss',
            artifact: 'snapshot',
            channel: 'print',
            mode: 'full',
            event: 'print',
        });

        expect(logSpy).toHaveBeenCalledTimes(2);
        for (const [entry] of logSpy.mock.calls) {
            expect(entry.action).toBe('EXPORT');
            expect(entry.details).toMatchObject({ event: 'print', channel: 'print' });
            expect(normalizeAuditAction(String(entry.action))).toEqual({ action: 'EXPORT' });
        }
    });

    it('Snapshot export_view uses the same meaning as Learner Map', () => {
        const logSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined);

        logClinicalExportAudit({
            orgId: 'org-1',
            userId: 'user-1',
            assessmentId: 'assess-1',
            artifact: 'snapshot',
            channel: 'export',
            mode: 'full',
            event: 'export_view',
        });

        expect(logSpy.mock.calls[0][0].action).toBe('EXPORT');
        expect(logSpy.mock.calls[0][0].details).toMatchObject({
            artifact: 'snapshot',
            event: 'export_view',
        });
    });

    it('audit logging failure does not throw to callers (egress remains unblocked)', () => {
        vi.spyOn(auditService, 'log').mockImplementation(() => {
            throw new Error('audit write failed');
        });
        const printSpy = vi.fn();

        expect(() => {
            logClinicalExportAudit({
                orgId: 'org-1',
                userId: 'user-1',
                assessmentId: 'assess-1',
                artifact: 'snapshot',
                channel: 'print',
                mode: 'full',
                event: 'print',
            });
            printSpy();
        }).not.toThrow();

        expect(printSpy).toHaveBeenCalled();
    });
});
