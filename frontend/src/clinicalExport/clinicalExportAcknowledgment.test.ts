import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    CLINICAL_EXPORT_ACK_NAMESPACES,
    clinicalExportAckStorageKey,
    hasClinicalExportAcknowledged,
    isClinicalExportAcknowledged,
    setClinicalExportAcknowledged,
} from './clinicalExportAcknowledgment';

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

describe('clinicalExportAcknowledgment', () => {
    beforeEach(() => {
        vi.stubGlobal('sessionStorage', createSessionStorageMock());
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.unstubAllGlobals();
    });

    it('namespaces storage keys by artifact kind', () => {
        expect(CLINICAL_EXPORT_ACK_NAMESPACES['learner-map']).toBe(
            'learner-map-full-export-ack:'
        );
        expect(CLINICAL_EXPORT_ACK_NAMESPACES.snapshot).toBe('snapshot-export-ack:');
        expect(CLINICAL_EXPORT_ACK_NAMESPACES.report).toBe('report-export-ack:');
        expect(clinicalExportAckStorageKey('learner-map', 'a1')).toBe(
            'learner-map-full-export-ack:a1'
        );
        expect(clinicalExportAckStorageKey('snapshot', 'a1')).toBe('snapshot-export-ack:a1');
    });

    it('keeps Snapshot and Learner Map acknowledgements independent', () => {
        setClinicalExportAcknowledged('snapshot', 'a1');
        expect(hasClinicalExportAcknowledged('snapshot', 'a1')).toBe(true);
        expect(hasClinicalExportAcknowledged('learner-map', 'a1')).toBe(false);
    });

    it('treats sessionStorage failures as unacknowledged', () => {
        vi.stubGlobal('sessionStorage', {
            getItem: () => {
                throw new Error('unavailable');
            },
            setItem: () => {
                throw new Error('unavailable');
            },
            removeItem: () => undefined,
            clear: () => undefined,
            key: () => null,
            length: 0,
        } satisfies Storage);

        setClinicalExportAcknowledged('snapshot', 'a1');
        expect(hasClinicalExportAcknowledged('snapshot', 'a1')).toBe(false);
        expect(
            isClinicalExportAcknowledged('snapshot', 'a1', 'full', () => true)
        ).toBe(false);
    });
});
