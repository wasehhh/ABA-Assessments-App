import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentCommunicationReport } from '../services/reportAuthoringTypes';
import { createEmptyReportAuthoring } from '../services/reportAuthoringValidation';

const mockListReportVersions = vi.fn();
const mockCreateDraftReport = vi.fn();
const mockCreateNewVersionDraftFromFinalized = vi.fn();

vi.mock('../services/reportAuthoring', () => {
    class ReportAuthoringError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'ReportAuthoringError';
        }
    }

    return {
        ReportAuthoringError,
        reportAuthoringService: {
            listReportVersions: (...args: unknown[]) => mockListReportVersions(...args),
            createDraftReport: (...args: unknown[]) => mockCreateDraftReport(...args),
            createNewVersionDraftFromFinalized: (...args: unknown[]) =>
                mockCreateNewVersionDraftFromFinalized(...args),
        },
    };
});

import { ReportAuthoringError } from '../services/reportAuthoring';
import {
    beginNewVersionDraftFromFinalized,
    loadOrCreateDraftReport,
} from './reportAuthoringWorkspaceLoad';

function reportRow(
    overrides: Partial<AssessmentCommunicationReport> = {}
): AssessmentCommunicationReport {
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

describe('report authoring new-version workspace load', () => {
    beforeEach(() => {
        mockListReportVersions.mockReset();
        mockCreateDraftReport.mockReset();
        mockCreateNewVersionDraftFromFinalized.mockReset();
    });

    it('does not throw the stale finalized gate when a finalized report exists', async () => {
        mockListReportVersions.mockResolvedValue([
            reportRow({ id: 'report-final-1', status: 'finalized', version: 1 }),
        ]);

        await expect(loadOrCreateDraftReport('assess-1', 'cycle-1')).resolves.toEqual({
            kind: 'needs_new_version',
        });
        expect(mockCreateNewVersionDraftFromFinalized).not.toHaveBeenCalled();
        expect(mockCreateDraftReport).not.toHaveBeenCalled();
    });

    it('does not create a new version on load when a finalized report exists and no draft does', async () => {
        mockListReportVersions.mockResolvedValue([
            reportRow({ id: 'report-final-2', status: 'finalized', version: 2 }),
        ]);

        const result = await loadOrCreateDraftReport('assess-1', 'cycle-1');

        expect(result.kind).toBe('needs_new_version');
        expect(mockCreateNewVersionDraftFromFinalized).not.toHaveBeenCalled();
        expect(mockCreateDraftReport).not.toHaveBeenCalled();
    });

    it('opens an existing draft instead of treating it as an error', async () => {
        const existingDraft = reportRow({ id: 'report-draft-2', status: 'draft', version: 2 });
        mockListReportVersions.mockResolvedValue([
            reportRow({ id: 'report-final-1', status: 'finalized', version: 1 }),
            existingDraft,
        ]);

        const result = await loadOrCreateDraftReport('assess-1', 'cycle-1');

        expect(result).toEqual({ kind: 'draft', report: existingDraft });
        expect(mockCreateNewVersionDraftFromFinalized).not.toHaveBeenCalled();
        expect(mockCreateDraftReport).not.toHaveBeenCalled();
    });

    it('still creates the first draft when no report exists for the cycle', async () => {
        const created = reportRow();
        mockListReportVersions.mockResolvedValue([]);
        mockCreateDraftReport.mockResolvedValue(created);

        const result = await loadOrCreateDraftReport('assess-1', 'cycle-1');

        expect(result).toEqual({ kind: 'draft', report: created });
        expect(mockCreateDraftReport).toHaveBeenCalledWith('assess-1', 'cycle-1');
        expect(mockCreateNewVersionDraftFromFinalized).not.toHaveBeenCalled();
    });
});

describe('beginNewVersionDraftFromFinalized', () => {
    beforeEach(() => {
        mockListReportVersions.mockReset();
        mockCreateDraftReport.mockReset();
        mockCreateNewVersionDraftFromFinalized.mockReset();
    });

    it('returns the draft version from the service rather than assigning one', async () => {
        const created = reportRow({ id: 'report-3', status: 'draft', version: 3 });
        mockCreateNewVersionDraftFromFinalized.mockResolvedValue(created);

        const result = await beginNewVersionDraftFromFinalized('assess-1', 'cycle-1');

        expect(result).toEqual({ kind: 'created', report: created });
        expect(result.kind === 'created' && result.report.version).toBe(3);
        expect(mockCreateNewVersionDraftFromFinalized).toHaveBeenCalledWith('assess-1', 'cycle-1');
        expect(mockCreateDraftReport).not.toHaveBeenCalled();
    });

    it('presents an existing draft as a state instead of an error', async () => {
        const existingDraft = reportRow({ id: 'report-draft-2', status: 'draft', version: 2 });
        mockCreateNewVersionDraftFromFinalized.mockRejectedValue(
            new ReportAuthoringError('A draft report already exists for this assessment and cycle.')
        );
        mockListReportVersions.mockResolvedValue([
            reportRow({ id: 'report-final-1', status: 'finalized', version: 1 }),
            existingDraft,
        ]);

        const result = await beginNewVersionDraftFromFinalized('assess-1', 'cycle-1');

        expect(result).toEqual({ kind: 'existing_draft', report: existingDraft });
        expect(mockCreateDraftReport).not.toHaveBeenCalled();
    });

    it('rethrows when new-version creation fails and no draft exists', async () => {
        mockCreateNewVersionDraftFromFinalized.mockRejectedValue(
            new ReportAuthoringError('No finalized report exists to duplicate into a new draft version.')
        );
        mockListReportVersions.mockResolvedValue([]);

        await expect(beginNewVersionDraftFromFinalized('assess-1', 'cycle-1')).rejects.toThrow(
            ReportAuthoringError
        );
        await expect(beginNewVersionDraftFromFinalized('assess-1', 'cycle-1')).rejects.toThrow(
            /No finalized report exists/
        );
    });
});
