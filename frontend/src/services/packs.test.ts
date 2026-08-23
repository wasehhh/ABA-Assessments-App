import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentPack } from '../types';

const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockEqUpdatedAt = vi.fn();
const mockEqId = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: (...args: unknown[]) => mockFrom(...args),
    },
}));

vi.mock('./audit', () => ({
    auditService: {
        log: vi.fn(),
    },
}));

function samplePack(overrides: Partial<ContentPack> = {}): ContentPack {
    return {
        id: 'pack-1',
        org_id: 'org-1',
        title: 'Pack',
        description: 'Desc',
        version: '1.0',
        pack_data: {
            pack_id: 'pack-1',
            org_id: 'org-1',
            title: 'Pack',
            description: 'Desc',
            version: '1.0',
            domains: [],
        },
        licence_proof_url: null,
        uploaded_by: 'user-1',
        uploaded_at: '2026-01-01T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        status: 'active',
        ...overrides,
    };
}

describe('packService.updateIfRevisionMatches', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockMaybeSingle.mockResolvedValue({ data: samplePack(), error: null });
        mockSelect.mockReturnValue({ maybeSingle: mockMaybeSingle });
        mockEqUpdatedAt.mockReturnValue({ select: mockSelect });
        mockEqId.mockReturnValue({ eq: mockEqUpdatedAt });
        mockUpdate.mockReturnValue({ eq: mockEqId });
        mockFrom.mockReturnValue({ update: mockUpdate });
    });

    it('returns ok with updated pack when revision matches', async () => {
        const { packService } = await import('./packs');
        const updated = samplePack({ title: 'Updated', updated_at: '2026-08-23T12:00:00.000Z' });
        mockMaybeSingle.mockResolvedValueOnce({ data: updated, error: null });

        const result = await packService.updateIfRevisionMatches(
            'pack-1',
            { title: 'Updated' },
            '2026-01-01T00:00:00.000Z'
        );

        expect(result).toEqual({ ok: true, pack: updated });
        expect(mockFrom).toHaveBeenCalledWith('content_packs');
        expect(mockUpdate).toHaveBeenCalledWith({ title: 'Updated' });
        expect(mockEqId).toHaveBeenCalledWith('id', 'pack-1');
        expect(mockEqUpdatedAt).toHaveBeenCalledWith('updated_at', '2026-01-01T00:00:00.000Z');
    });

    it('returns conflict when zero rows updated', async () => {
        const { packService } = await import('./packs');
        mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

        const result = await packService.updateIfRevisionMatches(
            'pack-1',
            { title: 'Stale save' },
            '2026-01-01T00:00:00.000Z'
        );

        expect(result).toEqual({ ok: false, conflict: true });
    });

    it('throws when Supabase returns an error', async () => {
        const { packService } = await import('./packs');
        mockMaybeSingle.mockResolvedValueOnce({
            data: null,
            error: new Error('db unavailable'),
        });

        await expect(
            packService.updateIfRevisionMatches(
                'pack-1',
                { title: 'Updated' },
                '2026-01-01T00:00:00.000Z'
            )
        ).rejects.toThrow('db unavailable');
    });
});
