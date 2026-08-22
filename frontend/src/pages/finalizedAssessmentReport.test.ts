import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FinalizedReportDocument } from '../components/report/FinalizedReportDocument';
import {
    canPrintFinalizedReport,
    canViewFinalizedReport,
} from '../services/reportAuthoringRoles';
import {
    AssessmentCommunicationReport,
    ReportAuthoring,
} from '../services/reportAuthoringTypes';
import {
    FINALIZED_REPORT_SECTION_ORDER,
    finalizedReportHasRenderableSnapshot,
} from '../utils/finalizedReportPresentation';

const authoringFixture: ReportAuthoring = {
    template_version: 1,
    sections: {
        target_skills_focus: { focus_summary: 'Focus on communication and play skills.' },
        measurable_treatment_goals: {
            goals: [
                {
                    id: 'goal-1',
                    domain_id: 'DOM_A',
                    goal_statement: 'Client will mand for preferred items.',
                    mastery_criterion: '80% across 3 sessions',
                    target_timeframe: '3_months',
                },
            ],
        },
        recommended_therapy_hours: {
            weekly_hours: 15,
            clinical_justification: 'Intensity supports acquisition goals.',
        },
        clinical_summary: {
            narrative: 'Client demonstrates emerging skills across domains.',
        },
    },
};

const finalizedRowFixture: AssessmentCommunicationReport = {
    id: 'report-1',
    org_id: 'org-1',
    assessment_id: 'assess-1',
    cycle_id: 'cycle-1',
    status: 'finalized',
    version: 2,
    authoring: authoringFixture,
    embedded_computed: {
        provenance: {
            snapshot_at: '2026-08-01T12:00:00.000Z',
            pack_title: 'ABA Pack',
            pack_version: '1.0',
            assessment_id: 'assess-1',
            cycle_id: 'cycle-1',
            cycle_number: 1,
            pack_snapshot_frozen: true,
        },
        overview: {
            client_name: 'Jamie Lee',
            client_id: 'client-1',
            pack_title: 'ABA Pack',
            pack_version: '1.0',
            assessment_id: 'assess-1',
            cycle_id: 'cycle-1',
            cycle_number: 1,
            cycle_start_date: '2026-01-01',
            cycle_end_date: null,
            assessment_date: '2026-05-01',
            authoring_clinician_name: 'Dr. Smith',
            authoring_clinician_user_id: 'user-1',
        },
        present_levels: {
            rollup: {
                totalDomains: 1,
                incompleteDomains: 0,
                scoredTargets: 3,
                totalTargets: 4,
                coveragePercentage: 75,
                pointsCapturedPercentage: 60,
            },
            assessment_band_distribution: {
                unscored: 1,
                not_yet: 0,
                in_progress: 1,
                at_maximum: 2,
                showsInProgressBucket: true,
            },
            domains: [
                {
                    domain_id: 'DOM_A',
                    title: 'Communication',
                    coverage: { scored: 3, total: 4 },
                    points_captured_percentage: 60,
                    state_distribution: {
                        unscored: 1,
                        not_yet: 0,
                        in_progress: 1,
                        at_maximum: 2,
                        showsInProgressBucket: true,
                    },
                },
            ],
        },
        target_skills: {
            domains: [
                {
                    domain_id: 'DOM_A',
                    title: 'Communication',
                    targets: [
                        {
                            target_id: 'T1',
                            title: 'Manding',
                            display_score_with_max: '2/2',
                            competency_state: 'at_maximum',
                            normalized_ratio: 1,
                        },
                    ],
                },
            ],
        },
    },
    embedded_generated_at: '2026-08-01T12:00:00.000Z',
    created_by: 'user-1',
    last_edited_by: 'user-1',
    finalized_by: 'user-1',
    finalized_at: '2026-08-01T12:00:00.000Z',
    created_at: '2026-08-01T12:00:00.000Z',
    updated_at: '2026-08-01T12:00:00.000Z',
};

describe('Finalized assessment report roles (contract §8.1)', () => {
    it('allows all four roles to view finalized reports', () => {
        for (const role of ['admin', 'senior_therapist', 'therapist', 'viewer'] as const) {
            expect(canViewFinalizedReport(role)).toBe(true);
        }
    });

    it('allows only admin and senior_therapist to print finalized reports', () => {
        expect(canPrintFinalizedReport('admin')).toBe(true);
        expect(canPrintFinalizedReport('senior_therapist')).toBe(true);
        expect(canPrintFinalizedReport('therapist')).toBe(false);
        expect(canPrintFinalizedReport('viewer')).toBe(false);
    });
});

describe('FinalizedAssessmentReport page contract', () => {
    const pageSource = readFileSync(
        resolve(__dirname, './FinalizedAssessmentReport.tsx'),
        'utf8'
    );

    it('does not live-recompute via buildReportProfile()', () => {
        expect(pageSource).not.toContain('buildReportProfile');
        expect(pageSource).toContain('getCurrentFinalizedVersion');
        expect(pageSource).toContain('embedded_computed');
    });

    it('gates print on canPrintFinalizedReport and reuses ReportExportDialog', () => {
        expect(pageSource).toContain('canPrintFinalizedReport');
        expect(pageSource).toContain('ReportExportDialog');
        expect(pageSource).toContain('data-finalized-report-print');
        expect(pageSource).toMatch(/canPrint\s*\?\s*\(/);
    });

    it('does not require acknowledgement to view the page', () => {
        expect(pageSource).not.toMatch(/hasReportExportAcknowledged[\s\S]*return null/);
    });

    it('includes report version in print audit payload', () => {
        expect(pageSource).toContain('version: reportRow.version');
    });

    it('shows empty state when no finalized version exists', () => {
        expect(pageSource).toContain('data-finalized-report-not-yet-finalized');
        expect(pageSource).toContain('finalizedReportHasRenderableSnapshot');
    });
});

describe('FinalizedReportDocument six-section template', () => {
    it('renders sections in fixed contract order with authored + embedded content', () => {
        const markup = renderToStaticMarkup(
            createElement(FinalizedReportDocument, {
                report: finalizedRowFixture,
                structureLabels: { primary_group: 'Domain', target: 'Target' },
            })
        );

        const sectionIds = FINALIZED_REPORT_SECTION_ORDER.map((id) => {
            const match = markup.match(new RegExp(`data-finalized-report-section="${id}"`));
            return match ? id : null;
        }).filter(Boolean);

        expect(sectionIds).toEqual([...FINALIZED_REPORT_SECTION_ORDER]);

        const indices = FINALIZED_REPORT_SECTION_ORDER.map((id) =>
            markup.indexOf(`data-finalized-report-section="${id}"`)
        );
        for (let i = 1; i < indices.length; i += 1) {
            expect(indices[i]).toBeGreaterThan(indices[i - 1]!);
        }

        expect(markup).toContain('Focus on communication and play skills.');
        expect(markup).toContain('Client will mand for preferred items.');
        expect(markup).toContain('15 hours / week');
        expect(markup).toContain('Client demonstrates emerging skills across domains.');
        expect(markup).toContain('Jamie Lee');
        expect(markup).toContain('Manding');
        expect(markup).not.toContain('CONFIDENTIAL_NOTE');
    });
});

describe('finalizedReportHasRenderableSnapshot', () => {
    it('requires finalized status and embedded_computed payload', () => {
        expect(finalizedReportHasRenderableSnapshot(finalizedRowFixture)).toBe(true);
        expect(
            finalizedReportHasRenderableSnapshot({
                ...finalizedRowFixture,
                status: 'draft',
            })
        ).toBe(false);
        expect(
            finalizedReportHasRenderableSnapshot({
                ...finalizedRowFixture,
                embedded_computed: null,
            })
        ).toBe(false);
    });
});

describe('Report export acknowledgement audit version (contract §7.3)', () => {
    it('includes optional version in clinical export audit and dialog ack recorder', () => {
        const auditSource = readFileSync(
            resolve(__dirname, '../clinicalExport/clinicalExportAudit.ts'),
            'utf8'
        );
        const dialogSource = readFileSync(
            resolve(__dirname, '../components/report/export/ReportExportDialog.tsx'),
            'utf8'
        );

        expect(auditSource).toContain('version?: number');
        expect(auditSource).toContain('...(input.version !== undefined ? { version: input.version } : {})');
        expect(dialogSource).toContain(
            '...(input.reportVersion !== undefined ? { version: input.reportVersion } : {})'
        );
    });
});
