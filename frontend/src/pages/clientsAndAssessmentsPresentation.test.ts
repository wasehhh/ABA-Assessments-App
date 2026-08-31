import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    formatAssessmentListDateLine,
    formatAssessmentListPackLine,
} from '../services/assessments';
import { assessmentsEmptyCopy } from './Assessments';
import { isClientsLayoutNavCurrent } from '../components/Layout';

const assessmentsSource = readFileSync(resolve(__dirname, './Assessments.tsx'), 'utf8');
const clientsSource = readFileSync(resolve(__dirname, './Clients.tsx'), 'utf8');
const detailSource = readFileSync(resolve(__dirname, './ClientDetail.tsx'), 'utf8');
const layoutSource = readFileSync(resolve(__dirname, '../components/Layout.tsx'), 'utf8');

function filledCreateOccurrences(source: string): number {
    return source.split('data-filled-create').length - 1;
}

describe('A7 list progress is current-cycle and named', () => {
    it('loads the figure via loadCurrentCycleProgressFigure on both list surfaces', () => {
        expect(assessmentsSource).toContain('loadCurrentCycleProgressFigure');
        expect(detailSource).toContain('loadCurrentCycleProgressFigure');
        expect(assessmentsSource).toContain('data-cycle-progress');
        expect(detailSource).toContain('data-cycle-progress');
    });

    it('keeps in-progress delete confirm on unscoped getScores (all cycles)', () => {
        expect(assessmentsSource).toContain('assessmentService.getScores(assessment.id)');
        expect(detailSource).toContain('assessmentService.getScores(assessment.id)');
        expect(assessmentsSource).toContain('countRecordedScores(scores)');
        expect(detailSource).toContain('countRecordedScores(scores)');
        expect(assessmentsSource).toContain('assessmentDeleteConfirmMessage');
        expect(detailSource).toContain('assessmentDeleteConfirmMessage');
        expect(assessmentsSource).toContain(
            '`${assessment.client?.first_name} ${assessment.client?.last_name} - ${assessment.pack?.title}`'
        );
        expect(detailSource).toContain(
            '`${client.first_name} ${client.last_name} - ${assessment.pack_snapshot.title}`'
        );
    });
});

describe('C4b filled create only where creating is the job', () => {
    it('places exactly one filled create on each active surface, gated off Submitted/Approved/Archived', () => {
        expect(filledCreateOccurrences(assessmentsSource)).toBe(1);
        expect(filledCreateOccurrences(clientsSource)).toBe(1);
        expect(filledCreateOccurrences(detailSource)).toBe(1);

        expect(assessmentsSource).toMatch(
            /statusFilter === 'active' && \['admin', 'senior_therapist'\][\s\S]*data-filled-create[\s\S]*New Assessment/
        );
        expect(clientsSource).toMatch(
            /statusFilter === 'active' && \['admin', 'senior_therapist'\][\s\S]*data-filled-create[\s\S]*Add Client/
        );
        expect(detailSource).toMatch(
            /canManageClient && client\.status === 'active'[\s\S]*data-filled-create[\s\S]*New Assessment/
        );
    });

    it('makes Client detail New Assessment emerald, matching the Assessments list', () => {
        expect(assessmentsSource).toContain(
            'bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition'
        );
        expect(detailSource).toContain(
            'bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition'
        );
        expect(detailSource).not.toContain('bg-blue-600 hover:bg-blue-700');
    });
});

describe('C4b row and card identity', () => {
    it('formats pack title with version and assessment_date with Created fallback', () => {
        expect(formatAssessmentListPackLine({ title: 'PEAK', version: '2.1' })).toBe(
            'PEAK · v2.1'
        );
        expect(formatAssessmentListDateLine({
            assessment_date: '2026-01-15',
            created_at: '2026-08-01T00:00:00.000Z',
        })).not.toContain('Created');
        expect(formatAssessmentListDateLine({
            assessment_date: null,
            created_at: '2026-08-01T00:00:00.000Z',
        })).toMatch(/^Created /);
        expect(assessmentsSource).toContain('formatAssessmentListPackLine(assessment.pack)');
        expect(assessmentsSource).toContain('formatAssessmentListDateLine(assessment)');
        expect(detailSource).toContain('formatAssessmentListPackLine');
        expect(detailSource).toContain('formatAssessmentListDateLine(assessment)');
        expect(clientsSource).toContain('Added {new Date(client.created_at).toLocaleDateString()}');
        expect(clientsSource).toContain('data-client-added');
    });
});

describe('C4b empty states and filter legend', () => {
    it('does not offer create from the Submitted empty state', () => {
        expect(assessmentsEmptyCopy('submitted', false).offerCreate).toBe(false);
        expect(assessmentsEmptyCopy('submitted', true).body).not.toMatch(/creating a new assessment/i);
        expect(assessmentsEmptyCopy('submitted', false).title).toBe('No assessments awaiting review');
        expect(assessmentsEmptyCopy('approved', false).offerCreate).toBe(false);
        expect(assessmentsEmptyCopy('active', true).offerCreate).toBe(true);
        expect(assessmentsSource).toContain('emptyCopy.offerCreate');
        expect(assessmentsSource).not.toContain("['admin', 'senior_therapist', 'therapist']");
    });

    it('places the status legend beside the filter controls', () => {
        expect(assessmentsSource).toContain('data-filter-legend');
        const legendIdx = assessmentsSource.indexOf('data-filter-legend');
        const filterIdx = assessmentsSource.indexOf("setStatusFilter('active')");
        expect(legendIdx).toBeGreaterThan(filterIdx);
        const filterCluster = assessmentsSource.slice(filterIdx, legendIdx + 80);
        expect(filterCluster).toContain("setStatusFilter('submitted')");
        expect(filterCluster).toContain("setStatusFilter('approved')");
    });
});

describe('C4b navigation consistency', () => {
    it('marks Clients current for #/client/:id and the Clients list', () => {
        expect(isClientsLayoutNavCurrent('#/clients')).toBe(true);
        expect(isClientsLayoutNavCurrent('#/client/abc-123')).toBe(true);
        expect(isClientsLayoutNavCurrent('#/client/abc-123?x=1')).toBe(true);
        expect(isClientsLayoutNavCurrent('#/assessments')).toBe(false);
        expect(isClientsLayoutNavCurrent('#/assessment/abc-123')).toBe(false);
        expect(isClientsLayoutNavCurrent('#/dashboard')).toBe(false);
        expect(layoutSource).toContain('aria-current={clientsNavCurrent ? \'page\' : undefined}');
        expect(layoutSource).toContain('isClientsLayoutNavCurrent(window.location.hash)');
    });

    it('exposes Edit on Client detail and demotes Back to secondary colour', () => {
        expect(detailSource).toContain('data-client-edit');
        expect(detailSource).toContain('openEditForm');
        expect(detailSource).toContain('clientService.update(clientId');
        expect(detailSource).toContain('text-gray-600 hover:text-emerald-700');
        expect(detailSource).toContain('Back to Clients');
        expect(detailSource).not.toContain('text-blue-600 hover:text-blue-700');
    });
});

describe('empty-state copy follows the actor', () => {
    it('instructs create on Active only when the reader can create', () => {
        const withCreate = assessmentsEmptyCopy('active', true);
        expect(withCreate.offerCreate).toBe(true);
        expect(withCreate.body).toBe('Get started by creating a new assessment.');

        const withoutCreate = assessmentsEmptyCopy('active', false);
        expect(withoutCreate.offerCreate).toBe(false);
        expect(withoutCreate.body).not.toMatch(/creating a new assessment/i);
        expect(withoutCreate.body).not.toMatch(/get started/i);
        expect(withoutCreate.body).toBe('There are no draft or in-progress assessments.');
    });

    it('does not instruct a Clients-list reader without Add Client to create', () => {
        expect(clientsSource).toContain('No {statusFilter} clients found.');
        expect(clientsSource).not.toMatch(/Get started by creating/);
        expect(clientsSource).toMatch(
            /statusFilter === 'active' && \['admin', 'senior_therapist'\][\s\S]*Add Client/
        );
        expect(detailSource).toContain(
            "client.status === 'active' && canManageClient"
        );
        expect(detailSource).toContain('No assessments yet. Create one to get started.');
        expect(detailSource).toContain("'No assessments.'");
    });
});

describe('row primary action visible focus', () => {
    it('reuses the AssessmentOverview emerald focus ring on Open, View, and detail Open', () => {
        const focusTreatment = 'focus:outline-none focus:ring-2 focus:ring-emerald-500';
        expect(assessmentsSource).toContain(focusTreatment);
        expect(clientsSource).toContain(focusTreatment);
        expect(detailSource).toContain(focusTreatment);

        const assessmentsPrimary = assessmentsSource.slice(
            assessmentsSource.indexOf('data-row-primary-action') - 280,
            assessmentsSource.indexOf('data-row-primary-action') + 40
        );
        const clientsPrimary = clientsSource.slice(
            clientsSource.indexOf('data-row-primary-action') - 280,
            clientsSource.indexOf('data-row-primary-action') + 40
        );
        const detailPrimary = detailSource.slice(
            detailSource.indexOf('data-row-primary-action') - 280,
            detailSource.indexOf('data-row-primary-action') + 40
        );
        expect(assessmentsPrimary).toContain(focusTreatment);
        expect(clientsPrimary).toContain(focusTreatment);
        expect(detailPrimary).toContain(focusTreatment);
    });
});

describe('Gap 3 in-progress delete dialog naming', () => {
    it('titles the confirm Delete Assessment on both surfaces, never Draft', () => {
        expect(assessmentsSource).toContain('title="Delete Assessment"');
        expect(detailSource).toContain('title="Delete Assessment"');
        expect(detailSource).not.toContain('Delete Draft Assessment');
    });
});
