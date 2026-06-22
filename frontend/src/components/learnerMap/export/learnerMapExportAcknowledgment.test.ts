import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    hasLearnerMapFullExportAcknowledged,
    isLearnerMapFullExportAcknowledged,
    learnerMapFullExportAckStorageKey,
    requiresLearnerMapFullExportAcknowledgment,
    setLearnerMapFullExportAcknowledged,
} from './learnerMapExportAcknowledgment';

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

describe('learnerMapExportAcknowledgment', () => {
    beforeEach(() => {
        vi.stubGlobal('sessionStorage', createSessionStorageMock());
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.unstubAllGlobals();
    });

    it('requires acknowledgment only for full mode', () => {
        expect(requiresLearnerMapFullExportAcknowledgment('full')).toBe(true);
        expect(requiresLearnerMapFullExportAcknowledgment('standard')).toBe(false);
        expect(requiresLearnerMapFullExportAcknowledgment('selected-domains')).toBe(false);
    });

    it('stores and reads full export acknowledgment per assessment', () => {
        expect(hasLearnerMapFullExportAcknowledged('assess-1')).toBe(false);

        setLearnerMapFullExportAcknowledged('assess-1');

        expect(sessionStorage.getItem(learnerMapFullExportAckStorageKey('assess-1'))).toBe('1');
        expect(hasLearnerMapFullExportAcknowledged('assess-1')).toBe(true);
        expect(hasLearnerMapFullExportAcknowledged('assess-2')).toBe(false);
    });

    it('treats non-full modes as acknowledged without storage', () => {
        expect(isLearnerMapFullExportAcknowledged('assess-1', 'standard')).toBe(true);
        expect(isLearnerMapFullExportAcknowledged('assess-1', 'selected-domains')).toBe(true);
    });

    it('blocks full mode until acknowledgment is stored', () => {
        expect(isLearnerMapFullExportAcknowledged('assess-1', 'full')).toBe(false);

        setLearnerMapFullExportAcknowledged('assess-1');

        expect(isLearnerMapFullExportAcknowledged('assess-1', 'full')).toBe(true);
    });
});
