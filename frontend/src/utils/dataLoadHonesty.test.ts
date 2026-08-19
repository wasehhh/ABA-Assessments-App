import { describe, expect, it, vi } from 'vitest';
import {
    executeProtectedLoad,
    isLoadedEmpty,
    shouldDiscardStaleLoadRequest,
} from './dataLoadHonesty';

describe('shouldDiscardStaleLoadRequest', () => {
    it('discards an older response when a newer request superseded it', () => {
        expect(shouldDiscardStaleLoadRequest(1, 2)).toBe(true);
        expect(shouldDiscardStaleLoadRequest(2, 2)).toBe(false);
    });
});

describe('executeProtectedLoad', () => {
    it('returns success when the fetch resolves', async () => {
        const result = await executeProtectedLoad({
            requestId: 1,
            getCurrentRequestId: () => 1,
            load: async () => ['a'],
        });
        expect(result).toEqual({ kind: 'success', data: ['a'] });
    });

    it('returns error when the fetch rejects so loading can terminate', async () => {
        const result = await executeProtectedLoad({
            requestId: 1,
            getCurrentRequestId: () => 1,
            load: async () => {
                throw new Error('network');
            },
        });
        expect(result).toEqual({ kind: 'error' });
    });

    it('discards stale responses when a newer load started', async () => {
        let currentRequestId = 1;

        const slow = executeProtectedLoad({
            requestId: 1,
            getCurrentRequestId: () => currentRequestId,
            load: async () => {
                await new Promise((resolve) => setTimeout(resolve, 20));
                return ['stale'];
            },
        });

        currentRequestId = 2;
        const newer = await executeProtectedLoad({
            requestId: 2,
            getCurrentRequestId: () => currentRequestId,
            load: async () => ['fresh'],
        });

        const older = await slow;

        expect(older).toEqual({ kind: 'stale' });
        expect(newer).toEqual({ kind: 'success', data: ['fresh'] });
    });
});

describe('isLoadedEmpty', () => {
    it('distinguishes loaded-empty from non-loaded states', () => {
        expect(isLoadedEmpty('loaded', [])).toBe(true);
        expect(isLoadedEmpty('loaded', [1])).toBe(false);
        expect(isLoadedEmpty('error', [])).toBe(false);
        expect(isLoadedEmpty('loading', [])).toBe(false);
    });
});

describe('executeProtectedLoad retry contract', () => {
    it('allows a caller to refetch by invoking load again after error', async () => {
        let shouldFail = true;
        const load = vi.fn(async () => {
            if (shouldFail) {
                throw new Error('temporary');
            }
            return ['ok'];
        });

        const first = await executeProtectedLoad({
            requestId: 1,
            getCurrentRequestId: () => 1,
            load,
        });
        expect(first.kind).toBe('error');

        shouldFail = false;
        const second = await executeProtectedLoad({
            requestId: 2,
            getCurrentRequestId: () => 2,
            load,
        });
        expect(second).toEqual({ kind: 'success', data: ['ok'] });
        expect(load).toHaveBeenCalledTimes(2);
    });
});
