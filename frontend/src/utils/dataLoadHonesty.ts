export type DataLoadState = 'loading' | 'loaded' | 'error';

export function shouldDiscardStaleLoadRequest(
    requestId: number,
    currentRequestId: number
): boolean {
    return requestId !== currentRequestId;
}

export type ProtectedLoadResult<T> =
    | { kind: 'stale' }
    | { kind: 'success'; data: T }
    | { kind: 'error' };

/**
 * Runs an async fetch with stale-request discard so an older response cannot
 * overwrite state after a newer load started (e.g. filter or route change).
 */
export async function executeProtectedLoad<T>(input: {
    requestId: number;
    getCurrentRequestId: () => number;
    load: () => Promise<T>;
}): Promise<ProtectedLoadResult<T>> {
    try {
        const data = await input.load();
        if (shouldDiscardStaleLoadRequest(input.requestId, input.getCurrentRequestId())) {
            return { kind: 'stale' };
        }
        return { kind: 'success', data };
    } catch {
        if (shouldDiscardStaleLoadRequest(input.requestId, input.getCurrentRequestId())) {
            return { kind: 'stale' };
        }
        return { kind: 'error' };
    }
}

export function isLoadedEmpty<T>(state: DataLoadState, items: readonly T[]): boolean {
    return state === 'loaded' && items.length === 0;
}
