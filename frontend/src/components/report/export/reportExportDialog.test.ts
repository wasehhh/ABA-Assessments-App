import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditService } from '../../../services/audit';
import { logClinicalExportAudit } from '../../../clinicalExport/clinicalExportAudit';
import {
    REPORT_EXPORT_DIALOG_BODY,
    recordReportExportAcknowledgement,
    ReportExportDialog,
} from './ReportExportDialog';
import {
    hasReportExportAcknowledged,
    REPORT_EXPORT_MODE,
} from './reportExportAcknowledgment';

function createSessionStorageMock(): Storage {
    const store = new Map<string, string>();

    return {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => {
            store.delete(key);
        },
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    };
}

describe('ReportExportDialog', () => {
    beforeEach(() => {
        vi.stubGlobal('sessionStorage', createSessionStorageMock());
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('renders nothing when closed (view route does not show acknowledgement UI)', () => {
        const markup = renderToStaticMarkup(
            createElement(ReportExportDialog, {
                isOpen: false,
                assessmentId: 'assess-1',
                onClose: vi.fn(),
            })
        );

        expect(markup).toBe('');
    });

    it('renders PHI acknowledgement copy when open', () => {
        const markup = renderToStaticMarkup(
            createElement(ReportExportDialog, {
                isOpen: true,
                assessmentId: 'assess-1',
                onClose: vi.fn(),
            })
        );

        expect(markup).toContain(REPORT_EXPORT_DIALOG_BODY);
        expect(markup).toContain('data-report-export-dialog-body="standard"');
        expect(markup).toContain('Personal health information');
        expect(markup).toContain('leave Evalis access control');
        expect(markup).toContain('PHI policy');
        expect(markup).toContain('not a diagnosis, treatment plan');
        expect(markup).toContain('disabled=""');
    });

    it('records acknowledgement audit with report / print / standard and omits surface', () => {
        const logSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined);

        recordReportExportAcknowledgement({
            assessmentId: 'assess-1',
            orgId: 'org-1',
            userId: 'user-1',
        });

        expect(logSpy).toHaveBeenCalledWith({
            org_id: 'org-1',
            user_id: 'user-1',
            action: 'EXPORT',
            entity_type: 'assessment',
            entity_id: 'assess-1',
            details: {
                artifact: 'report',
                channel: 'print',
                mode: REPORT_EXPORT_MODE,
                event: 'acknowledgement',
            },
        });
        expect(logSpy.mock.calls[0]?.[0]?.details).not.toHaveProperty('surface');
        expect(hasReportExportAcknowledged('assess-1')).toBe(true);
    });

    it('stores acknowledgement after audit log (contract confirm order)', () => {
        const callOrder: string[] = [];
        vi.spyOn(auditService, 'log').mockImplementation(async () => {
            callOrder.push('audit');
            expect(hasReportExportAcknowledged('assess-1')).toBe(false);
        });

        const originalSet = sessionStorage.setItem.bind(sessionStorage);
        vi.spyOn(sessionStorage, 'setItem').mockImplementation((key, value) => {
            callOrder.push('storage');
            originalSet(key, value);
        });

        recordReportExportAcknowledgement({
            assessmentId: 'assess-1',
            orgId: 'org-1',
            userId: 'user-1',
        });

        expect(callOrder).toEqual(['audit', 'storage']);
    });

    it('invokes continue callback after acknowledgement is recorded', () => {
        vi.spyOn(auditService, 'log').mockResolvedValue(undefined);
        const onContinue = vi.fn();

        recordReportExportAcknowledgement({
            assessmentId: 'assess-1',
            orgId: 'org-1',
            userId: 'user-1',
        });
        onContinue();

        expect(onContinue).toHaveBeenCalledTimes(1);
        expect(hasReportExportAcknowledged('assess-1')).toBe(true);
    });
});

describe('report print audit payload', () => {
    it('uses report artifact, print channel, and standard mode without surface', () => {
        const logSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined);

        logClinicalExportAudit({
            orgId: 'org-1',
            userId: 'user-1',
            assessmentId: 'assess-1',
            artifact: 'report',
            channel: 'print',
            mode: REPORT_EXPORT_MODE,
            event: 'print',
        });

        expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                details: {
                    artifact: 'report',
                    channel: 'print',
                    mode: 'standard',
                    event: 'print',
                },
            })
        );
        expect(logSpy.mock.calls[0]?.[0]?.details).not.toHaveProperty('surface');
    });
});
