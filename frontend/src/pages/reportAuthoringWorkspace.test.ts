import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ReportAuthoringForm } from '../components/reportAuthoring/ReportAuthoringForm';
import { createEmptyReportAuthoring } from '../services/reportAuthoringValidation';
import {
    buildReportAuthoringRouteHash,
    shouldShowReportAuthoringEntry,
} from './assessmentMatrixReportEntry';

describe('assessmentMatrixReportEntry', () => {
    it('shows the Report entry only for approved assessments and admin/senior_therapist roles', () => {
        expect(shouldShowReportAuthoringEntry('approved', 'admin')).toBe(true);
        expect(shouldShowReportAuthoringEntry('approved', 'senior_therapist')).toBe(true);
        expect(shouldShowReportAuthoringEntry('approved', 'therapist')).toBe(false);
        expect(shouldShowReportAuthoringEntry('approved', 'viewer')).toBe(false);
        expect(shouldShowReportAuthoringEntry('submitted', 'admin')).toBe(false);
        expect(shouldShowReportAuthoringEntry('in_progress', 'senior_therapist')).toBe(false);
    });

    it('builds the report edit route with cycleId query param', () => {
        expect(buildReportAuthoringRouteHash('assess-1', 'cycle-9')).toBe(
            '#/assessment/assess-1/report/edit?cycleId=cycle-9'
        );
    });

    it('renders the matrix Report entry markup only when gated flag is true', () => {
        const source = readFileSync(resolve(__dirname, './AssessmentMatrix.tsx'), 'utf8');
        expect(source).toContain('shouldShowReportAuthoringEntry');
        expect(source).toContain('data-report-authoring-entry');
        expect(source).toContain('buildReportAuthoringRouteHash');
        expect(source).not.toMatch(/data-report-authoring-entry[\s\S]*disabled=/);
    });
});

describe('ReportAuthoringForm', () => {
    const packDomains = [
        {
            domain_id: 'DOM_A',
            title: 'Domain A',
            targets: [],
        },
    ];

    it('binds section fields to the authoring shape and enforces maxlength attributes', () => {
        const authoring = createEmptyReportAuthoring();
        authoring.sections.target_skills_focus.focus_summary = 'Focus text';
        authoring.sections.measurable_treatment_goals.goals = [
            {
                id: 'goal-1',
                domain_id: 'DOM_A',
                goal_statement: 'Goal',
                mastery_criterion: 'Criterion',
                target_timeframe: '3_months',
            },
        ];
        authoring.sections.recommended_therapy_hours = {
            weekly_hours: 12,
            clinical_justification: 'Because',
        };
        authoring.sections.clinical_summary.narrative = 'Summary';

        const markup = renderToStaticMarkup(
            createElement(ReportAuthoringForm, {
                authoring,
                packDomains,
                onChange: vi.fn(),
            })
        );

        expect(markup).toContain('Focus text');
        expect(markup).toContain('Goal');
        expect(markup).toContain('Because');
        expect(markup).toContain('Summary');
        expect(markup).toContain('maxLength="1500"');
        expect(markup).toContain('maxLength="800"');
        expect(markup).toContain('maxLength="300"');
        expect(markup).toContain('maxLength="1200"');
        expect(markup).toContain('maxLength="4000"');
        expect(markup).toContain('value="3_months"');
        expect(markup).toContain('value="6_months"');
        expect(markup).toContain('value="12_months"');
    });

    it('surfaces finalize validation errors passed from the service-layer helper', () => {
        const markup = renderToStaticMarkup(
            createElement(ReportAuthoringForm, {
                authoring: createEmptyReportAuthoring(),
                packDomains,
                onChange: vi.fn(),
                finalizeError: 'Clinical Summary requires a non-empty narrative.',
            })
        );

        expect(markup).toContain('data-report-authoring-finalize-error');
        expect(markup).toContain('Clinical Summary requires a non-empty narrative.');
    });
});

describe('ReportAuthoring page wiring', () => {
    it('does not add print or PHI acknowledgement surfaces', () => {
        const source = readFileSync(resolve(__dirname, './ReportAuthoring.tsx'), 'utf8');
        expect(source).not.toContain('window.print');
        expect(source).not.toContain('ReportExportDialog');
        expect(source).not.toContain('hasReportExportAcknowledged');
    });

    it('reuses getAuthoringFinalizeValidationError before finalizeReport', () => {
        const source = readFileSync(resolve(__dirname, './ReportAuthoring.tsx'), 'utf8');
        expect(source).toContain('getAuthoringFinalizeValidationError');
        expect(source).toContain('reportAuthoringService.finalizeReport');
        expect(source).toContain('loadOrCreateDraftReport');
    });

    it('does not keep the stale finalized-view gate or pending-view copy', () => {
        const pageSource = readFileSync(resolve(__dirname, './ReportAuthoring.tsx'), 'utf8');
        const loadSource = readFileSync(
            resolve(__dirname, './reportAuthoringWorkspaceLoad.ts'),
            'utf8'
        );
        expect(pageSource).not.toContain(
            'Creating a new version will be available once the finalized report view ships.'
        );
        expect(pageSource).not.toContain('The finalized report view is not available yet');
        expect(loadSource).not.toContain(
            'Creating a new version will be available once the finalized report view ships.'
        );
        expect(pageSource).toContain('beginNewVersionDraftFromFinalized');
        expect(loadSource).toContain('createNewVersionDraftFromFinalized');
        expect(pageSource).toContain('data-report-authoring-needs-new-version');
        expect(pageSource).toContain('data-report-authoring-create-new-version');
        expect(pageSource).toContain('data-report-authoring-existing-draft');
    });

    it('does not create a new version from loadOrCreateDraftReport', () => {
        const source = readFileSync(
            resolve(__dirname, './reportAuthoringWorkspaceLoad.ts'),
            'utf8'
        );
        const loadStart = source.indexOf('export async function loadOrCreateDraftReport');
        const createStart = source.indexOf(
            'export async function beginNewVersionDraftFromFinalized'
        );
        expect(loadStart).toBeGreaterThanOrEqual(0);
        expect(createStart).toBeGreaterThan(loadStart);
        const loadFn = source.slice(loadStart, createStart);
        expect(loadFn).not.toContain('createNewVersionDraftFromFinalized');
        expect(loadFn).toContain("'needs_new_version'");
    });
});
