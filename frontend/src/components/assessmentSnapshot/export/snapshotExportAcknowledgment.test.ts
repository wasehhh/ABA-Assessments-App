import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    hasSnapshotExportAcknowledged,
    isSnapshotExportAcknowledged,
    setSnapshotExportAcknowledged,
    snapshotExportAckStorageKey,
} from './snapshotExportAcknowledgment';
import { coerceSnapshotExportMode } from './snapshotExportMode';
import {
    buildSnapshotExportPreviewHash,
    parseSnapshotExportPreviewParams,
} from './snapshotExportState';

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

describe('snapshotExportAcknowledgment', () => {
    beforeEach(() => {
        vi.stubGlobal('sessionStorage', createSessionStorageMock());
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.unstubAllGlobals();
    });

    it('uses snapshot-export-ack: namespace', () => {
        expect(snapshotExportAckStorageKey('assess-9')).toBe('snapshot-export-ack:assess-9');
    });

    it('fails closed when unacknowledged', () => {
        expect(isSnapshotExportAcknowledged('assess-9', 'full')).toBe(false);
    });

    it('proceeds after acknowledgement is stored', () => {
        setSnapshotExportAcknowledged('assess-9');
        expect(hasSnapshotExportAcknowledged('assess-9')).toBe(true);
        expect(isSnapshotExportAcknowledged('assess-9', 'full')).toBe(true);
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

        setSnapshotExportAcknowledged('assess-9');
        expect(hasSnapshotExportAcknowledged('assess-9')).toBe(false);
    });

    it('does not unlock a different assessment when one is acknowledged', () => {
        setSnapshotExportAcknowledged('assess-A');
        expect(hasSnapshotExportAcknowledged('assess-A')).toBe(true);
        expect(isSnapshotExportAcknowledged('assess-A', 'full')).toBe(true);
        expect(hasSnapshotExportAcknowledged('assess-B')).toBe(false);
        expect(isSnapshotExportAcknowledged('assess-B', 'full')).toBe(false);
    });
});

describe('snapshotExportMode / state', () => {
    it('coerces unknown and absent modes to full', () => {
        expect(coerceSnapshotExportMode('banana')).toBe('full');
        expect(coerceSnapshotExportMode(null)).toBe('full');
        expect(coerceSnapshotExportMode(undefined)).toBe('full');
        expect(coerceSnapshotExportMode('selected-domains')).toBe('full');
        expect(parseSnapshotExportPreviewParams('?mode=banana')).toEqual({ exportMode: 'full' });
        expect(parseSnapshotExportPreviewParams('')).toEqual({ exportMode: 'full' });
        expect(buildSnapshotExportPreviewHash('a1')).toBe(
            '#/assessment/a1/snapshot/export?mode=full'
        );
    });
});
