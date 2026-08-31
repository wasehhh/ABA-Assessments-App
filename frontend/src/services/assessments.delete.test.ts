import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Assessment, UserProfile } from '../types';
import { auditService } from './audit';
import { userService } from './users';
import {
    ASSESSMENT_DELETE_ROLE_REFUSED,
    ASSESSMENT_DELETE_STATUS_REFUSED,
    assessmentDeleteConfirmMessage,
    assessmentService,
    canDeleteAssessment,
    countRecordedScores,
    recordedScoresDestroyedSentence,
} from './assessments';

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

function assessmentRow(status: Assessment['status']): Assessment {
    return {
        id: 'assess-1',
        org_id: 'org-1',
        client_id: 'client-1',
        content_pack_id: 'pack-1',
        pack_snapshot: {
            pack_id: 'pack-1',
            org_id: 'org-1',
            title: 'Pack',
            description: '',
            version: '1.0',
            domains: [],
        },
        created_by: 'user-1',
        assigned_to: null,
        assessment_date: null,
        status,
        submitted_at: null,
        approved_by: null,
        approved_at: null,
        created_at: '2026-08-01T00:00:00.000Z',
    };
}

function profile(role: UserProfile['role']): UserProfile {
    return {
        id: 'user-1',
        org_id: 'org-1',
        role,
        full_name: 'Clinician',
        email: 'c@org.test',
        created_at: '2026-08-01T00:00:00.000Z',
    };
}

describe('canDeleteAssessment', () => {
    it('allows admin and senior_therapist to delete draft and in_progress only', () => {
        for (const role of ['admin', 'senior_therapist'] as const) {
            expect(canDeleteAssessment('draft', role)).toBe(true);
            expect(canDeleteAssessment('in_progress', role)).toBe(true);
            expect(canDeleteAssessment('submitted', role)).toBe(false);
            expect(canDeleteAssessment('approved', role)).toBe(false);
        }
    });

    it('refuses therapist and viewer on every status', () => {
        for (const role of ['therapist', 'viewer'] as const) {
            expect(canDeleteAssessment('draft', role)).toBe(false);
            expect(canDeleteAssessment('in_progress', role)).toBe(false);
            expect(canDeleteAssessment('submitted', role)).toBe(false);
            expect(canDeleteAssessment('approved', role)).toBe(false);
        }
    });
});

describe('countRecordedScores', () => {
    it('counts non-null scores across every cycle and ignores placeholder rows', () => {
        expect(
            countRecordedScores([
                { score: null },
                { score: 0 },
                { score: 2 },
                { score: null },
                { score: 1 },
            ])
        ).toBe(3);
        expect(
            countRecordedScores([
                { score: null },
                { score: null },
                { score: null },
            ])
        ).toBe(0);
        expect(
            countRecordedScores([
                { score: 1 },
                { score: null },
                { score: 3 },
                { score: null },
            ])
        ).toBe(2);
    });
});

describe('recordedScoresDestroyedSentence', () => {
    it('names the recorded-score count, and states none when the count is zero', () => {
        expect(recordedScoresDestroyedSentence(47)).toBe(
            'This will permanently delete 47 recorded scores.'
        );
        expect(recordedScoresDestroyedSentence(0)).toBe(
            'This assessment has no recorded scores.'
        );
        expect(recordedScoresDestroyedSentence(0)).not.toContain('150');
        expect(recordedScoresDestroyedSentence(0)).not.toMatch(/delete 0 recorded/);
    });
});

describe('assessmentDeleteConfirmMessage', () => {
    it('names the recorded-score count for a draft with scores — the first-cycle case', () => {
        expect(assessmentDeleteConfirmMessage('Joe M - QA D1 Tiny Pack', 1)).toBe(
            'Are you sure you want to delete the assessment for Joe M - QA D1 Tiny Pack? This will permanently delete 1 recorded scores. This action cannot be undone.'
        );
    });

    it('names the recorded-score count for an in_progress assessment', () => {
        expect(assessmentDeleteConfirmMessage('Joe M - QA D1 Tiny Pack', 12)).toBe(
            'Are you sure you want to delete the assessment for Joe M - QA D1 Tiny Pack? This will permanently delete 12 recorded scores. This action cannot be undone.'
        );
    });

    it('uses the zero-case wording and does not claim scores will be destroyed', () => {
        const message = assessmentDeleteConfirmMessage('Joe M - QA D1 Tiny Pack', 0);
        expect(message).toContain(
            'Are you sure you want to delete the assessment for Joe M - QA D1 Tiny Pack?'
        );
        expect(message).toContain('This assessment has no recorded scores.');
        expect(message).not.toMatch(/delete 0 recorded/);
        expect(message).not.toContain('This will permanently delete');
    });

    it('counts a score of 0 and ignores a placeholder row', () => {
        const recorded = countRecordedScores([{ score: 0 }, { score: null }]);
        expect(recorded).toBe(1);
        expect(assessmentDeleteConfirmMessage('Joe M - Pack', recorded)).toContain(
            '1 recorded scores'
        );
    });
});

describe('assessmentService.delete', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        mockFrom.mockReset();
        vi.mocked(auditService.log).mockResolvedValue(undefined as never);
    });

    function stubLookup(status: Assessment['status'], role: UserProfile['role']) {
        vi.spyOn(assessmentService, 'getById').mockResolvedValue(assessmentRow(status));
        vi.spyOn(userService, 'getById').mockResolvedValue(profile(role));
    }

    it('refuses approved and submitted regardless of admin role', async () => {
        stubLookup('approved', 'admin');
        await expect(assessmentService.delete('assess-1', 'org-1', 'user-1')).rejects.toThrow(
            ASSESSMENT_DELETE_STATUS_REFUSED
        );
        stubLookup('submitted', 'admin');
        await expect(assessmentService.delete('assess-1', 'org-1', 'user-1')).rejects.toThrow(
            ASSESSMENT_DELETE_STATUS_REFUSED
        );
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('refuses a therapist caller even for draft and in_progress', async () => {
        stubLookup('draft', 'therapist');
        await expect(assessmentService.delete('assess-1', 'org-1', 'user-1')).rejects.toThrow(
            ASSESSMENT_DELETE_ROLE_REFUSED
        );
        stubLookup('in_progress', 'therapist');
        await expect(assessmentService.delete('assess-1', 'org-1', 'user-1')).rejects.toThrow(
            ASSESSMENT_DELETE_ROLE_REFUSED
        );
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('deletes a draft when the caller is admin', async () => {
        stubLookup('draft', 'admin');
        const chain = {
            delete: vi.fn(),
            eq: vi.fn(),
        };
        chain.delete.mockReturnValue(chain);
        chain.eq.mockResolvedValue({ error: null });
        mockFrom.mockReturnValue(chain);

        await assessmentService.delete('assess-1', 'org-1', 'user-1');

        expect(mockFrom).toHaveBeenCalledWith('assessments');
        expect(chain.delete).toHaveBeenCalled();
        expect(chain.eq).toHaveBeenCalledWith('id', 'assess-1');
        expect(auditService.log).toHaveBeenCalled();
    });
});
