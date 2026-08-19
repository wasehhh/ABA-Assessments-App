import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    hasReportExportAcknowledged,
    reportExportAckStorageKey,
    REPORT_EXPORT_MODE,
    setReportExportAcknowledged,
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

describe('reportExportAcknowledgment', () => {
    beforeEach(() => {
        vi.stubGlobal('sessionStorage', createSessionStorageMock());
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.unstubAllGlobals();
    });

    it('uses report-export-ack: namespace', () => {
        expect(reportExportAckStorageKey('assess-9')).toBe('report-export-ack:assess-9');
    });

    it('locks Report export mode to standard (contract §5.4 / OQ-3)', () => {
        expect(REPORT_EXPORT_MODE).toBe('standard');
    });

    it('fails closed when unacknowledged', () => {
        expect(hasReportExportAcknowledged('assess-9')).toBe(false);
    });

    it('proceeds after acknowledgement is stored for the session', () => {
        setReportExportAcknowledged('assess-9');

        expect(sessionStorage.getItem(reportExportAckStorageKey('assess-9'))).toBe('1');
        expect(hasReportExportAcknowledged('assess-9')).toBe(true);
    });

    it('does not unlock a different assessment when one is acknowledged', () => {
        setReportExportAcknowledged('assess-A');

        expect(hasReportExportAcknowledged('assess-A')).toBe(true);
        expect(hasReportExportAcknowledged('assess-B')).toBe(false);
    });

    it('treats unavailable sessionStorage as unacknowledged', () => {
        vi.stubGlobal('sessionStorage', {
            getItem: () => {
                throw new Error('denied');
            },
            setItem: () => {
                throw new Error('denied');
            },
            removeItem: () => undefined,
            clear: () => undefined,
            key: () => null,
            length: 0,
        } satisfies Storage);

        setReportExportAcknowledged('assess-9');
        expect(hasReportExportAcknowledged('assess-9')).toBe(false);
    });
});

describe('report print gate resolution', () => {
    beforeEach(() => {
        vi.stubGlobal('sessionStorage', createSessionStorageMock());
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.unstubAllGlobals();
    });

    function resolvePrintGate(assessmentId: string): 'print' | 'dialog' {
        return hasReportExportAcknowledged(assessmentId) ? 'print' : 'dialog';
    }

    it('opens the acknowledgement dialog when print is requested without prior acknowledgement', () => {
        expect(resolvePrintGate('assess-1')).toBe('dialog');
    });

    it('prints directly when acknowledgement was already stored this session', () => {
        setReportExportAcknowledged('assess-1');
        expect(resolvePrintGate('assess-1')).toBe('print');
    });
});
