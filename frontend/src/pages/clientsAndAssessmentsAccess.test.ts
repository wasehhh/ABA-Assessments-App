import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const assessmentsSource = readFileSync(resolve(__dirname, './Assessments.tsx'), 'utf8');
const clientsSource = readFileSync(resolve(__dirname, './Clients.tsx'), 'utf8');
const detailSource = readFileSync(resolve(__dirname, './ClientDetail.tsx'), 'utf8');

function primaryActionSlice(source: string): string {
    const marker = 'data-row-primary-action';
    const idx = source.indexOf(marker);
    expect(idx).toBeGreaterThan(-1);
    return source.slice(Math.max(0, idx - 400), idx + 400);
}

describe('C4a primary open/view without hover', () => {
    it('keeps Assessments Open as a real always-visible control', () => {
        const slice = primaryActionSlice(assessmentsSource);
        expect(slice).toMatch(/<a\b/);
        expect(slice).toContain('Open');
        expect(slice).toContain('aria-label={`Open assessment for');
        expect(slice).not.toContain('opacity-0');
        expect(slice).not.toContain('sm:opacity-0');
        expect(slice).not.toContain('group-hover:opacity-100');
        expect(assessmentsSource).toContain('href={`#/assessment/${assessment.id}`}');
    });

    it('keeps Clients View as a real always-visible control at every breakpoint', () => {
        const slice = primaryActionSlice(clientsSource);
        expect(slice).toMatch(/<a\b/);
        expect(slice).toContain('View');
        expect(slice).toContain('aria-label={`View ${client.first_name} ${client.last_name}`}');
        expect(slice).not.toContain('opacity-0');
        expect(slice).not.toContain('sm:opacity-0');
        expect(clientsSource).toContain('href={`#/client/${client.id}`}');
        expect(clientsSource).not.toMatch(
            /opacity-100 sm:opacity-0 group-hover:opacity-100[\s\S]{0,800}data-row-primary-action/
        );
    });

    it('keeps Client detail Open as a labelled button', () => {
        const slice = primaryActionSlice(detailSource);
        expect(slice).toMatch(/<button\b/);
        expect(slice).toContain('aria-label={`Open ${assessment.pack_snapshot.title}`}');
    });
});

describe('C4a Export demotion', () => {
    it('places Export beneath Open with an accessible name, not as an icon peer', () => {
        const openIdx = assessmentsSource.indexOf('data-row-primary-action');
        const exportIdx = assessmentsSource.indexOf('data-row-export');
        const deleteIdx = assessmentsSource.indexOf('data-row-delete');
        expect(openIdx).toBeGreaterThan(-1);
        expect(exportIdx).toBeGreaterThan(openIdx);
        expect(deleteIdx).toBeGreaterThan(exportIdx);
        expect(assessmentsSource).toContain('aria-label="Export assessment data"');
        expect(assessmentsSource).toContain('flex shrink-0 flex-col items-end gap-2');
        expect(assessmentsSource).not.toContain('title="Export Assessment"');
        expect(assessmentsSource).not.toMatch(/absolute top-5 right-5 flex items-center gap-2/);
    });
});

describe('C4a deletion policy on both surfaces', () => {
    it('gates list Delete with canDeleteAssessment and labels the control', () => {
        expect(assessmentsSource).toContain('canDeleteAssessment(assessment.status, profile?.role)');
        expect(detailSource).toContain('canDeleteAssessment(assessment.status, profile?.role)');
        expect(assessmentsSource).toContain('data-row-delete');
        expect(detailSource).toContain('data-row-delete');
        expect(assessmentsSource).toContain('aria-label={`Delete assessment for');
        expect(detailSource).toContain('aria-label={`Delete ${assessment.pack_snapshot.title} assessment`}');
        expect(assessmentsSource).not.toContain('<Trash2');
        expect(detailSource).not.toContain('title="Delete draft"');
    });

    it('loads getScores for in_progress confirm and keeps the draft confirm', () => {
        expect(assessmentsSource).toContain("assessment.status === 'in_progress'");
        expect(assessmentsSource).toContain('assessmentService.getScores(assessment.id)');
        expect(assessmentsSource).toContain('countRecordedScores(scores)');
        expect(assessmentsSource).not.toContain('scoreCount: scores.length');
        expect(assessmentsSource).toContain('recordedScoresDestroyedSentence');
        expect(detailSource).toContain('assessmentService.getScores(assessment.id)');
        expect(detailSource).toContain('countRecordedScores(scores)');
        expect(detailSource).not.toContain('scoreCount: scores.length');
        expect(detailSource).toContain('recordedScoresDestroyedSentence');
        expect(detailSource).toContain(
            'Are you sure you want to delete this draft assessment? This action cannot be undone.'
        );
    });

    it('role-gates New Assessment on Client detail', () => {
        expect(detailSource).toContain(
            "['admin', 'senior_therapist'].includes(profile?.role || '')"
        );
        expect(detailSource).toContain('New Assessment');
    });
});
