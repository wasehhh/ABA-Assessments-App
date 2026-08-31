import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AssessmentCommunicationReport } from '../services/reportAuthoringTypes';
import { buildCommunicationReportPrintFilename } from '../utils/finalizedReportPresentation';
import {
    UNRESOLVED_FINALIZED_BY_LABEL,
    formatFinalizedByDisplayName,
    issuedReportVersions,
    issuedVersionStatusLabel,
    shouldShowVersionHistoryLink,
} from './issuedReportVersions';

function row(
    overrides: Partial<AssessmentCommunicationReport>
): AssessmentCommunicationReport {
    return {
        id: 'r1',
        org_id: 'org-1',
        assessment_id: 'assess-1',
        cycle_id: 'cycle-1',
        status: 'finalized',
        version: 1,
        authoring: {
            template_version: 1,
            sections: {
                target_skills_focus: { focus_summary: '' },
                measurable_treatment_goals: { goals: [] },
                recommended_therapy_hours: { weekly_hours: 0, clinical_justification: '' },
                clinical_summary: { narrative: '' },
            },
        },
        embedded_computed: null,
        embedded_generated_at: null,
        created_by: 'u1',
        last_edited_by: 'u1',
        finalized_by: 'u1',
        finalized_at: '2026-08-01T12:00:00.000Z',
        created_at: '2026-08-01T12:00:00.000Z',
        updated_at: '2026-08-01T12:00:00.000Z',
        ...overrides,
    };
}

describe('issued report version list', () => {
    it('shows issued rows only, in service order, with no drafts', () => {
        const rows = [
            row({ id: 'd', version: 3, status: 'draft' }),
            row({ id: 's', version: 1, status: 'superseded' }),
            row({ id: 'c', version: 2, status: 'finalized' }),
        ];
        const issued = issuedReportVersions(rows);
        expect(issued.map((entry) => entry.id)).toEqual(['s', 'c']);
        expect(issued.every((entry) => entry.status !== 'draft')).toBe(true);
        expect(shouldShowVersionHistoryLink(rows)).toBe(true);
        expect(shouldShowVersionHistoryLink([row({ version: 1, status: 'finalized' })])).toBe(
            false
        );
        expect(issuedVersionStatusLabel('finalized')).toBe('Current');
        expect(issuedVersionStatusLabel('superseded')).toBe('Superseded');
    });

    it('does not render an aggregate figure on the list surface', () => {
        const listSource = readFileSync(resolve(__dirname, './ReportVersionHistory.tsx'), 'utf8');
        expect(listSource).not.toContain('coveragePercentage');
        expect(listSource).not.toContain('points_captured');
        expect(listSource).not.toContain('composite');
    });
});

describe('finalized_by display', () => {
    it('uses a profile name when present and an honest dash when not resolvable', () => {
        expect(
            formatFinalizedByDisplayName({ full_name: 'Ada Clinician', email: 'ada@org.test' })
        ).toBe('Ada Clinician');
        expect(formatFinalizedByDisplayName({ full_name: null, email: 'ada@org.test' })).toBe(
            'ada@org.test'
        );
        expect(formatFinalizedByDisplayName(null)).toBe(UNRESOLVED_FINALIZED_BY_LABEL);
        expect(formatFinalizedByDisplayName({ full_name: '  ', email: null })).toBe(
            UNRESOLVED_FINALIZED_BY_LABEL
        );
        expect(UNRESOLVED_FINALIZED_BY_LABEL).not.toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
    });
});

describe('communication report print filename', () => {
    const generatedAt = new Date('2026-08-30T12:00:00.000Z');

    it('carries superseded and v{N} on a superseded row, and omits superseded on current', () => {
        expect(
            buildCommunicationReportPrintFilename({
                assessmentId: 'assess-1',
                version: 2,
                superseded: true,
                generatedAt,
            })
        ).toBe('communication-report-superseded-v2-assess-1-2026-08-30.pdf');
        expect(
            buildCommunicationReportPrintFilename({
                assessmentId: 'assess-1',
                version: 4,
                superseded: false,
                generatedAt,
            })
        ).toBe('communication-report-v4-assess-1-2026-08-30.pdf');
        expect(
            buildCommunicationReportPrintFilename({
                assessmentId: 'assess-1',
                version: 4,
                superseded: false,
                generatedAt,
            })
        ).not.toContain('superseded');
    });
});

describe('listReportVersions has no service-level authorisation', () => {
    it('does not call assertAuthoringRole', () => {
        const source = readFileSync(resolve(__dirname, '../services/reportAuthoring.ts'), 'utf8');
        const start = source.indexOf('async listReportVersions');
        const end = source.indexOf('async getCurrentFinalizedVersion');
        expect(start).toBeGreaterThan(-1);
        expect(end).toBeGreaterThan(start);
        expect(source.slice(start, end)).not.toContain('assertAuthoringRole');
        expect(source.slice(start, end)).toContain('getReportsForScope');
    });
});

describe('version history page and viewer wiring', () => {
    const historySource = readFileSync(resolve(__dirname, './ReportVersionHistory.tsx'), 'utf8');
    const pageSource = readFileSync(
        resolve(__dirname, './FinalizedAssessmentReport.tsx'),
        'utf8'
    );
    const authoringSource = readFileSync(resolve(__dirname, './ReportAuthoring.tsx'), 'utf8');
    const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
    const auditSource = readFileSync(
        resolve(__dirname, '../clinicalExport/reportViewAudit.ts'),
        'utf8'
    );

    it('wires the versions route and keeps edit/finalized routes', () => {
        expect(appSource).toContain('reportVersionsMatch');
        expect(appSource).toContain('<ReportVersionHistory');
        expect(appSource).toContain('finalizedReportMatch');
        expect(appSource).toContain('reportEditMatch');
    });

    it('lists issued rows with View links and no draft rows', () => {
        expect(historySource).toContain('issuedReportVersions');
        expect(historySource).toContain('View');
        expect(historySource).not.toContain("'draft'");
        expect(historySource).toContain('canViewFinalizedReport');
    });

    it('emits VIEW audit on the list and on opening a document, with version in details', () => {
        expect(historySource).toContain('logReportHistoryListViewAudit');
        expect(pageSource).toContain('logReportDocumentViewAudit');
        expect(pageSource).toContain('version: selectedRow.version');
        expect(pageSource).toContain('version: reportRow.version');
        expect(auditSource).toContain("action: 'VIEW'");
        expect(auditSource).toContain("entity_type: 'report'");
        expect(auditSource).toContain("surface: 'version_document'");
        expect(auditSource).toContain("surface: 'version_history'");
    });

    it('prints superseded through the same PHI gate and role check as current', () => {
        expect(pageSource).toContain('canPrintFinalizedReport');
        expect(pageSource).toContain('ReportExportDialog');
        expect(pageSource).toContain('hasReportExportAcknowledged');
        expect(pageSource).toContain('buildCommunicationReportPrintFilename');
        expect(pageSource).toContain("superseded: reportRow.status === 'superseded'");
        expect(pageSource).not.toMatch(/canPrintFinalizedReport\([^)]*status/);
    });

    it('shows Version history as a secondary link on both report surfaces', () => {
        expect(pageSource).toContain('data-report-version-history-link');
        expect(authoringSource).toContain('data-report-version-history-link');
        expect(pageSource).toContain('shouldShowVersionHistoryLink');
        expect(authoringSource).toContain('shouldShowVersionHistoryLink');
        expect(pageSource).not.toMatch(
            /data-report-version-history-link[\s\S]{0,200}bg-emerald-700/
        );
        expect(authoringSource).not.toMatch(
            /data-report-version-history-link[\s\S]{0,200}bg-emerald-700/
        );
    });

    it('loads a specific issued version from the list and current via getCurrentFinalizedVersion', () => {
        expect(pageSource).toContain('getCurrentFinalizedVersion');
        expect(pageSource).toContain('listReportVersions');
        expect(pageSource).toContain("versionQuery.kind === 'specific'");
        expect(pageSource).toContain("status === 'superseded'");
        expect(pageSource).toContain('finalizedReportHasRenderableSnapshot');
    });
});
