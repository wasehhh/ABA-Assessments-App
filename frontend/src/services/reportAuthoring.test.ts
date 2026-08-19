import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Assessment } from '../types';
import { AssessmentCommunicationReport } from './reportAuthoringTypes';
import { createEmptyReportAuthoring } from './reportAuthoringValidation';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockBuildEmbedded = vi.fn();
const mockGetById = vi.fn();
const mockGetCycles = vi.fn();
const mockGetScores = vi.fn();

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: () => mockGetUser(),
        },
        from: (...args: unknown[]) => mockFrom(...args),
    },
}));

vi.mock('./assessments', () => ({
    assessmentService: {
        getById: (...args: unknown[]) => mockGetById(...args),
        getCycles: (...args: unknown[]) => mockGetCycles(...args),
        getScores: (...args: unknown[]) => mockGetScores(...args),
    },
}));

vi.mock('./reportEmbeddedComputed', () => ({
    buildEmbeddedComputedFromReportProfile: (...args: unknown[]) => mockBuildEmbedded(...args),
}));

function adminProfile() {
    return {
        id: 'user-admin',
        org_id: 'org-1',
        role: 'admin',
        full_name: 'Admin User',
        email: 'admin@example.com',
        created_at: '2026-01-01T00:00:00Z',
    };
}

function approvedAssessment(): Assessment {
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
            domains: [
                {
                    domain_id: 'DOM_A',
                    title: 'Domain A',
                    targets: [],
                },
            ],
        },
        created_by: 'user-admin',
        assigned_to: null,
        assessment_date: '2026-08-01',
        status: 'approved',
        submitted_at: null,
        approved_by: 'user-admin',
        approved_at: '2026-08-02T00:00:00Z',
        created_at: '2026-08-01T00:00:00Z',
    };
}

function draftRow(overrides: Partial<AssessmentCommunicationReport> = {}): AssessmentCommunicationReport {
    return {
        id: 'report-1',
        org_id: 'org-1',
        assessment_id: 'assess-1',
        cycle_id: 'cycle-1',
        status: 'draft',
        version: 1,
        authoring: createEmptyReportAuthoring(),
        embedded_computed: null,
        embedded_generated_at: null,
        created_by: 'user-admin',
        last_edited_by: 'user-admin',
        finalized_by: null,
        finalized_at: null,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
        ...overrides,
    };
}

function finalizedRow(version = 1): AssessmentCommunicationReport {
    return draftRow({
        id: `report-final-${version}`,
        status: 'finalized',
        version,
        embedded_computed: {
            provenance: {
                snapshot_at: '2026-08-19T12:00:00.000Z',
                pack_title: 'Pack',
                pack_version: '1.0',
                assessment_id: 'assess-1',
                cycle_id: 'cycle-1',
                cycle_number: 1,
                pack_snapshot_frozen: true,
            },
            overview: {
                client_name: 'Jamie Lee',
                client_id: 'client-1',
                pack_title: 'Pack',
                pack_version: '1.0',
                assessment_id: 'assess-1',
                cycle_id: 'cycle-1',
                cycle_number: 1,
                cycle_start_date: null,
                cycle_end_date: null,
                assessment_date: '2026-08-01',
                authoring_clinician_name: 'Admin User',
                authoring_clinician_user_id: 'user-admin',
            },
            present_levels: {
                rollup: {
                    totalDomains: 1,
                    incompleteDomains: 0,
                    scoredTargets: 0,
                    totalTargets: 0,
                    coveragePercentage: 0,
                    pointsCapturedPercentage: 0,
                },
                assessment_band_distribution: {
                    unscored: 0,
                    not_yet: 0,
                    in_progress: 0,
                    at_maximum: 0,
                    showsInProgressBucket: false,
                },
                domains: [],
            },
            target_skills: { domains: [] },
        },
        embedded_generated_at: '2026-08-19T12:00:00.000Z',
        finalized_by: 'user-admin',
        finalized_at: '2026-08-19T12:00:00.000Z',
    });
}

type QueryMode = 'list' | 'single' | 'maybeSingle' | 'updateFinalize' | 'updateSupersede' | 'insert';

function createQueryChain(mode: QueryMode, payload: unknown) {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    const self = () => chain;

    for (const method of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'lt']) {
        chain[method] = vi.fn(self);
    }

    if (mode === 'list') {
        const result = { data: payload, error: null };
        chain.select = vi.fn(self);
        chain.eq = vi.fn(self);
        chain.order = vi.fn(async () => result);
        return chain;
    }

    if (mode === 'maybeSingle') {
        chain.limit = vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: payload, error: null })),
        }));
    }

    if (mode === 'single') {
        chain.single = vi.fn(async () => ({ data: payload, error: null }));
        chain.maybeSingle = vi.fn(async () => ({ data: payload, error: null }));
        chain.select = vi.fn(self);
        chain.eq = vi.fn(self);
        chain.insert = vi.fn(self);
        chain.update = vi.fn(self);
    }

    if (mode === 'insert') {
        chain.insert = vi.fn(() => ({
            select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: payload, error: null })),
            })),
        }));
    }

    if (mode === 'updateFinalize') {
        chain.update = vi.fn(() => ({
            eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn(async () => ({ data: payload, error: null })),
                    })),
                })),
            })),
        }));
    }

    if (mode === 'updateSupersede') {
        chain.update = vi.fn(() => ({
            eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        lt: vi.fn(async () => ({ error: null })),
                    })),
                })),
            })),
        }));
    }

    return chain;
}

describe('reportAuthoringService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-admin' } }, error: null });
        mockGetById.mockResolvedValue(approvedAssessment());
        mockGetCycles.mockResolvedValue([
            {
                id: 'cycle-1',
                assessment_id: 'assess-1',
                org_id: 'org-1',
                cycle_number: 1,
                status: 'in_progress',
                start_date: null,
                end_date: null,
                created_at: '2026-08-01T00:00:00Z',
            },
        ]);
        mockGetScores.mockResolvedValue([]);
    });

    it('createDraftReport fails cleanly when assessment is not approved', async () => {
        mockFrom.mockImplementation((table: string) => {
            if (table === 'user_profiles') {
                return createQueryChain('single', adminProfile());
            }
            throw new Error(`Unexpected table ${table}`);
        });

        mockGetById.mockResolvedValue({
            ...approvedAssessment(),
            status: 'submitted',
        });

        const { reportAuthoringService, ReportAuthoringError } = await import('./reportAuthoring');

        await expect(
            reportAuthoringService.createDraftReport('assess-1', 'cycle-1')
        ).rejects.toThrow(ReportAuthoringError);
        await expect(
            reportAuthoringService.createDraftReport('assess-1', 'cycle-1')
        ).rejects.toThrow(/approved/i);
    });

    it('createNewVersionDraftFromFinalized does not supersede the prior finalized row', async () => {
        const finalized = finalizedRow(1);
        const newDraft = draftRow({ id: 'report-2', version: 2, authoring: finalized.authoring });
        let reportsCallCount = 0;
        const updateMock = vi.fn();

        mockFrom.mockImplementation((table: string) => {
            if (table === 'user_profiles') {
                return createQueryChain('single', adminProfile());
            }
            if (table === 'assessment_communication_reports') {
                reportsCallCount += 1;
                if (reportsCallCount === 1) {
                    return createQueryChain('list', []);
                }
                if (reportsCallCount === 2) {
                    return createQueryChain('maybeSingle', finalized);
                }
                return createQueryChain('insert', newDraft);
            }
            throw new Error(`Unexpected table ${table}`);
        });

        const { reportAuthoringService } = await import('./reportAuthoring');
        const created = await reportAuthoringService.createNewVersionDraftFromFinalized(
            'assess-1',
            'cycle-1'
        );

        expect(created.version).toBe(2);
        expect(created.status).toBe('draft');
        expect(updateMock).not.toHaveBeenCalled();
        expect(finalized.status).toBe('finalized');
    });

    it('finalizeReport writes embedded_computed via buildReportProfile wrapper and supersedes older finalized rows', async () => {
        const draft = draftRow({
            authoring: {
                template_version: 1,
                sections: {
                    target_skills_focus: { focus_summary: 'Focus' },
                    measurable_treatment_goals: {
                        goals: [
                            {
                                id: 'goal-1',
                                domain_id: 'DOM_A',
                                goal_statement: 'Goal',
                                mastery_criterion: 'Criterion',
                                target_timeframe: '3_months',
                            },
                        ],
                    },
                    recommended_therapy_hours: {
                        weekly_hours: 10,
                        clinical_justification: 'Because',
                    },
                    clinical_summary: { narrative: 'Summary' },
                },
            },
        });
        const finalizedPayload = finalizedRow(1);
        mockBuildEmbedded.mockReturnValue(finalizedPayload.embedded_computed);

        let reportsCallCount = 0;
        mockFrom.mockImplementation((table: string) => {
            if (table === 'user_profiles') {
                return createQueryChain('single', adminProfile());
            }
            if (table === 'assessment_communication_reports') {
                reportsCallCount += 1;
                if (reportsCallCount === 1) {
                    return createQueryChain('single', draft);
                }
                if (reportsCallCount === 2) {
                    return createQueryChain('updateFinalize', {
                        ...draft,
                        status: 'finalized',
                        embedded_computed: finalizedPayload.embedded_computed,
                    });
                }
                return createQueryChain('updateSupersede', null);
            }
            throw new Error(`Unexpected table ${table}`);
        });

        const { reportAuthoringService } = await import('./reportAuthoring');
        const finalized = await reportAuthoringService.finalizeReport('report-1');

        expect(mockBuildEmbedded).toHaveBeenCalledTimes(1);
        expect(finalized.status).toBe('finalized');
        expect(finalized.embedded_computed).toEqual(finalizedPayload.embedded_computed);
    });

    it('getCurrentFinalizedVersion excludes superseded rows by querying status finalized only', async () => {
        const finalized = finalizedRow(2);
        const eqMock = vi.fn();
        const chain = createQueryChain('maybeSingle', finalized);
        chain.eq = vi.fn(() => {
            eqMock();
            return chain;
        });

        mockFrom.mockImplementation((table: string) => {
            if (table === 'assessment_communication_reports') {
                return chain;
            }
            throw new Error(`Unexpected table ${table}`);
        });

        const { reportAuthoringService } = await import('./reportAuthoring');
        const current = await reportAuthoringService.getCurrentFinalizedVersion(
            'assess-1',
            'cycle-1'
        );

        expect(current?.version).toBe(2);
        expect(current?.status).toBe('finalized');
        expect(eqMock).toHaveBeenCalled();
    });
});
