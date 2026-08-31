import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AssessmentCommunicationReport } from '../services/reportAuthoringTypes';
import {
    shouldShowFinalizedReportEntry,
    shouldShowReportAuthoringEntry,
} from './assessmentMatrixReportEntry';
import { hasRenderableIssuedReports } from './issuedReportVersions';
import {
    formatCycleSectionHeading,
    groupIssuedReportsByCycle,
} from './reportDocumentsIndexGrouping';

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
        embedded_computed: {
            provenance: {
                snapshot_at: '2026-08-01T12:00:00.000Z',
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
                authoring_clinician_name: 'Ada',
                authoring_clinician_user_id: 'u1',
            },
            present_levels: {
                rollup: {
                    totalDomains: 0,
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
        embedded_generated_at: '2026-08-01T12:00:00.000Z',
        created_by: 'u1',
        last_edited_by: 'u1',
        finalized_by: 'u1',
        finalized_at: '2026-08-01T12:00:00.000Z',
        created_at: '2026-08-01T12:00:00.000Z',
        updated_at: '2026-08-01T12:00:00.000Z',
        ...overrides,
    };
}

const cycles = [
    {
        id: 'cycle-1',
        cycle_number: 1,
        status: 'locked' as const,
        start_date: '2026-01-01',
        end_date: '2026-03-01',
    },
    {
        id: 'cycle-2',
        cycle_number: 2,
        status: 'in_progress' as const,
        start_date: '2026-04-01',
        end_date: null,
    },
];

describe('documents index grouping', () => {
    it('groups issued rows by cycle, newest cycle first and newest version first, and drops drafts', () => {
        const sections = groupIssuedReportsByCycle(
            [
                row({
                    id: 'c2-draft',
                    cycle_id: 'cycle-2',
                    version: 3,
                    status: 'draft',
                    embedded_computed: null,
                }),
                row({
                    id: 'c1-v1',
                    cycle_id: 'cycle-1',
                    version: 1,
                    status: 'superseded',
                }),
                row({
                    id: 'c2-v1',
                    cycle_id: 'cycle-2',
                    version: 1,
                    status: 'superseded',
                }),
                row({
                    id: 'c1-v2',
                    cycle_id: 'cycle-1',
                    version: 2,
                    status: 'finalized',
                }),
                row({
                    id: 'c2-v2',
                    cycle_id: 'cycle-2',
                    version: 2,
                    status: 'finalized',
                }),
            ],
            cycles
        );

        expect(sections.map((section) => section.cycleNumber)).toEqual([2, 1]);
        expect(sections[0]?.isActiveCycle).toBe(true);
        expect(sections[1]?.isActiveCycle).toBe(false);
        expect(sections[0]?.rows.map((entry) => entry.id)).toEqual(['c2-v2', 'c2-v1']);
        expect(sections[1]?.rows.map((entry) => entry.id)).toEqual(['c1-v2', 'c1-v1']);
        expect(sections.flatMap((section) => section.rows).every((entry) => entry.status !== 'draft')).toBe(
            true
        );
        expect(formatCycleSectionHeading(sections[0]!)).toContain('Cycle 2');
    });

    it('keeps a superseded row addressable by its cycle and version', () => {
        const sections = groupIssuedReportsByCycle(
            [
                row({
                    id: 'old',
                    cycle_id: 'cycle-1',
                    version: 1,
                    status: 'superseded',
                }),
                row({
                    id: 'current',
                    cycle_id: 'cycle-1',
                    version: 2,
                    status: 'finalized',
                }),
            ],
            cycles
        );
        const superseded = sections[0]?.rows.find((entry) => entry.status === 'superseded');
        expect(superseded?.cycle_id).toBe('cycle-1');
        expect(superseded?.version).toBe(1);
    });
});

describe('issued-report existence for the Communication Report door', () => {
    it('requires an issued row with a frozen embed and ignores drafts', () => {
        expect(
            hasRenderableIssuedReports([row({ status: 'finalized' })])
        ).toBe(true);
        expect(
            hasRenderableIssuedReports([row({ status: 'superseded' })])
        ).toBe(true);
        expect(
            hasRenderableIssuedReports([
                row({ status: 'draft', embedded_computed: null }),
            ])
        ).toBe(false);
        expect(
            hasRenderableIssuedReports([
                row({ status: 'finalized', embedded_computed: null }),
            ])
        ).toBe(false);
        expect(hasRenderableIssuedReports([])).toBe(false);
    });
});

describe('documents index route, gating, and audit', () => {
    const indexSource = readFileSync(resolve(__dirname, './ReportDocumentsIndex.tsx'), 'utf8');
    const groupingSource = readFileSync(
        resolve(__dirname, './reportDocumentsIndexGrouping.ts'),
        'utf8'
    );
    const matrixSource = readFileSync(resolve(__dirname, './AssessmentMatrix.tsx'), 'utf8');
    const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
    const auditSource = readFileSync(
        resolve(__dirname, '../clinicalExport/reportViewAudit.ts'),
        'utf8'
    );
    const authoringSource = readFileSync(resolve(__dirname, './ReportAuthoring.tsx'), 'utf8');
    const pageSource = readFileSync(
        resolve(__dirname, './FinalizedAssessmentReport.tsx'),
        'utf8'
    );
    const serviceSource = readFileSync(
        resolve(__dirname, '../services/reportAuthoring.ts'),
        'utf8'
    );

    it('resolves #/assessment/:id/reports with no cycleId and lists issued rows across cycles', () => {
        expect(appSource).toContain('documentsIndexMatch');
        expect(appSource).toContain('<ReportDocumentsIndex');
        expect(appSource).toMatch(
            /match\(\/\^#\\\/assessment\\\/\(\[\^\\\/\]\+\)\\\/reports\$\/\)/
        );
        expect(indexSource).toContain('listIssuedReportsForAssessment');
        expect(indexSource).toContain('groupIssuedReportsByCycle');
        expect(indexSource).not.toContain('listReportVersions');
        expect(indexSource).not.toContain('selectedCycleId');
        expect(groupingSource).not.toContain('selectedCycleId');
    });

    it('still reaches issued reports when the assessment is not approved', () => {
        expect(shouldShowFinalizedReportEntry('admin', true)).toBe(true);
        expect(shouldShowFinalizedReportEntry('therapist', true)).toBe(true);
        expect(shouldShowFinalizedReportEntry('viewer', true)).toBe(true);
        expect(shouldShowReportAuthoringEntry('in_progress', 'admin')).toBe(false);
        expect(shouldShowReportAuthoringEntry('submitted', 'admin')).toBe(false);

        expect(matrixSource).toContain('listIssuedReportsForAssessment(assessmentId)');
        expect(matrixSource).toMatch(
            /shouldShowFinalizedReportEntry\(\s*profile\?\.role,\s*hasIssuedReports\s*\)/
        );
        expect(matrixSource).not.toContain('getCurrentFinalizedVersion');
        expect(matrixSource).not.toMatch(/shouldShowFinalizedReportEntry\([^)]*assessment/);
        expect(matrixSource).toMatch(
            /onCommunicationReport=\{\(\) => \{\s*window\.location\.hash = buildDocumentsIndexRouteHash\(assessmentId\);\s*\}\}/
        );
        expect(matrixSource).not.toContain('buildFinalizedReportRouteHash');
    });

    it('keeps Write Report gated on approved and hides the Communication Report door when nothing is issued', () => {
        expect(shouldShowReportAuthoringEntry('approved', 'admin')).toBe(true);
        expect(shouldShowReportAuthoringEntry('approved', 'therapist')).toBe(false);
        expect(shouldShowFinalizedReportEntry('admin', false)).toBe(false);
        expect(matrixSource).toContain(
            'shouldShowReportAuthoringEntry(assessment.status, profile?.role)'
        );
    });

    it('does not render an aggregate figure on the index', () => {
        expect(indexSource).not.toContain('coveragePercentage');
        expect(indexSource).not.toContain('points_captured');
        expect(indexSource).not.toContain('pointsCapturedPercentage');
        expect(indexSource).not.toContain('composite');
        expect(groupingSource).not.toContain('coveragePercentage');
    });

    it('opens a superseded row on the existing finalized route with cycleId and version', () => {
        expect(indexSource).toContain('buildFinalizedReportRouteHash');
        expect(indexSource).toContain('row.cycle_id');
        expect(indexSource).toContain('row.version');
        expect(indexSource).toContain('issuedVersionStatusLabel');
        expect(indexSource).toContain('data-report-status={row.status}');
        expect(pageSource).toContain("status === 'superseded'");
    });

    it('emits VIEW audit with surface documents_index and no cycle_id', () => {
        expect(indexSource).toContain('logReportDocumentsIndexViewAudit');
        expect(auditSource).toContain("surface: 'documents_index'");
        expect(auditSource).toContain('logReportDocumentsIndexViewAudit');
        const helperStart = auditSource.indexOf('export function logReportDocumentsIndexViewAudit');
        const helperEnd = auditSource.indexOf('export function logReportDocumentViewAudit');
        expect(helperStart).toBeGreaterThan(-1);
        expect(helperEnd).toBeGreaterThan(helperStart);
        expect(auditSource.slice(helperStart, helperEnd)).not.toContain('cycle_id');
    });

    it('uses one assessment-scoped issued select and does not add service-level authorisation', () => {
        const start = serviceSource.indexOf('async listIssuedReportsForAssessment');
        expect(start).toBeGreaterThan(-1);
        const fn = serviceSource.slice(start);
        expect(fn).toContain(".in('status', ['finalized', 'superseded'])");
        expect(fn).not.toContain('assertAuthoringRole');
        expect(fn).not.toContain('listReportVersions');
        expect(fn).not.toContain('getCycles');
    });

    it('links the index from the document and Write Report as a secondary control', () => {
        expect(pageSource).toContain('data-report-documents-index-link');
        expect(authoringSource).toContain('data-report-documents-index-link');
        expect(pageSource).toContain('All issued reports');
        expect(authoringSource).toContain('All issued reports');
        expect(indexSource).toContain(
            'No issued communication reports for this assessment yet.'
        );
    });
});
