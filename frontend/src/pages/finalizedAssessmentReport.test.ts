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
    REPORT_AUTHORING_TEMPLATE_VERSION,
    REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION,
} from '../services/reportAuthoringTypes';
import {
    FINALIZED_REPORT_PRINT_UNAVAILABLE_MESSAGE,
    FINALIZED_REPORT_SECTION_ORDER,
    finalizedReportAllowsPrintEmission,
    finalizedReportHasRenderableSnapshot,
    PRESENT_LEVELS_CORRUPT_EMBED_MESSAGE,
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
        expect(pageSource).toContain('offerPrint');
        expect(pageSource).toContain('finalizedReportAllowsPrintEmission');
    });

    it('does not offer Print / Save PDF when Present Levels is corrupt', () => {
        expect(pageSource).toContain('data-finalized-report-print-unavailable');
        expect(pageSource).toContain('FINALIZED_REPORT_PRINT_UNAVAILABLE_MESSAGE');
        expect(FINALIZED_REPORT_PRINT_UNAVAILABLE_MESSAGE).not.toContain('computed_schema_version');
        expect(pageSource).not.toContain('computed_schema_version');
        expect(pageSource).toMatch(
            /if\s*\(\s*!finalizedReportAllowsPrintEmission\(reportRow\.embedded_computed\)\s*\)/
        );
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
        expect(markup).toContain('Goal 1 · Communication');
        expect(markup).not.toContain('CONFIDENTIAL_NOTE');
    });

    it('omits Present Levels numerics on a legacy fat row and fabricates nothing', () => {
        const markup = renderToStaticMarkup(
            createElement(FinalizedReportDocument, {
                report: finalizedRowFixture,
                structureLabels: { primary_group: 'Domain', target: 'Target' },
            })
        );

        expect(markup).toContain('data-present-levels-without-change-metrics');
        expect(markup).not.toContain('data-present-levels-change');
        expect(markup).not.toContain('This is a first assessment');
        expect(markup).not.toContain('Skills improved');
        expect(markup).not.toContain('Skills regressed');
        expect(markup).not.toContain('Newly assessed');
        expect(markup).not.toContain('No longer scored');
        expect(markup).not.toContain('Points Captured');
        expect(markup).not.toMatch(/\b60%/);
    });

    it('does not render removed Present Levels or target-list sections', () => {
        const markup = renderToStaticMarkup(
            createElement(FinalizedReportDocument, {
                report: finalizedRowFixture,
                structureLabels: { primary_group: 'Domain', target: 'Target' },
            })
        );
        const documentSource = readFileSync(
            resolve(__dirname, '../components/report/FinalizedReportDocument.tsx'),
            'utf8'
        );

        expect(markup).not.toContain('Assessment Score Distribution');
        expect(markup).not.toContain('Domain summary');
        expect(markup).not.toContain('Manding');
        expect(markup).not.toContain('2/2');
        expect(documentSource).not.toContain('ReportAssessmentScoreDistribution');
        expect(documentSource).not.toContain('ReportDomainScoreDistribution');
        expect(documentSource).not.toContain('ReportDomainSummaryTable');
    });

    it('renders transition counts and comparison lines from a slim change-metric embed', () => {
        const slimReport: AssessmentCommunicationReport = {
            ...finalizedRowFixture,
            embedded_computed: {
                ...finalizedRowFixture.embedded_computed!,
                computed_schema_version: REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION,
                present_levels: {
                    mode: 'dual_comparison',
                    comparison_method: 'per_target_last_and_first_scored',
                    first_assessment: null,
                    comparisons: [
                        {
                            role: 'last_assessed',
                            label_key: 'since_last_assessed',
                            anchor_span: {
                                earliest_cycle_number: 2,
                                latest_cycle_number: 2,
                                earliest_date: '2026-04-01',
                                latest_date: '2026-04-01',
                                available: true,
                            },
                            anchors_by_cycle_number: { '2': 3 },
                            skills_improved: 2,
                            skills_regressed: 1,
                            newly_assessed: 0,
                            no_longer_scored: 0,
                        },
                        {
                            role: 'first_assessed',
                            label_key: 'since_first_assessed',
                            anchor_span: {
                                earliest_cycle_number: 1,
                                latest_cycle_number: 1,
                                earliest_date: '2026-01-01',
                                latest_date: '2026-01-01',
                                available: true,
                            },
                            anchors_by_cycle_number: { '1': 3 },
                            skills_improved: 1,
                            skills_regressed: 0,
                            newly_assessed: 0,
                            no_longer_scored: 1,
                        },
                    ],
                },
                target_skills: undefined,
            },
        };

        const markup = renderToStaticMarkup(
            createElement(FinalizedReportDocument, {
                report: slimReport,
                structureLabels: { primary_group: 'Domain', target: 'Target' },
            })
        );

        expect(markup).toContain('data-present-levels-change');
        expect(markup).toContain('Since each skill was last assessed');
        expect(markup).toContain('Since each skill was first assessed');
        expect(markup).toContain('Skills improved');
        expect(markup).toContain('Skills regressed');
        expect(markup).toContain('Newly assessed');
        expect(markup).toContain('No longer scored');
        expect(markup).toContain('Prior scores used for comparison range from');
        expect(markup).not.toContain('vs previous cycle');
        expect(markup).not.toContain('vs Cycle 1');
        expect(markup).not.toContain('Points Captured');
        expect(markup).not.toContain('Assessment Score Distribution');
        expect(markup).not.toContain('Manding');
    });

    it('does not treat a slim-shaped embed missing computed_schema_version as change metrics', () => {
        const slimWithoutVersion: AssessmentCommunicationReport = {
            ...finalizedRowFixture,
            embedded_computed: {
                ...finalizedRowFixture.embedded_computed!,
                present_levels: {
                    mode: 'first_assessment',
                    comparison_method: 'per_target_last_and_first_scored',
                    first_assessment: {
                        statement_key: 'first_assessment',
                        counts: {
                            demonstrated: 4,
                            emerging: 3,
                            not_demonstrated: 2,
                            unscored: 1,
                        },
                    },
                    comparisons: [],
                },
            },
        };

        const markup = renderToStaticMarkup(
            createElement(FinalizedReportDocument, {
                report: slimWithoutVersion,
                structureLabels: { primary_group: 'Domain', target: 'Target' },
            })
        );

        expect(markup).toContain('data-present-levels-without-change-metrics');
        expect(markup).not.toContain('data-present-levels-change');
        expect(markup).not.toContain('data-present-levels-corrupt-embed');
        expect(markup).not.toContain('This is a first assessment');
        expect(markup).not.toContain('Skills improved');
    });

    it('surfaces a declared change-metric schema that is missing mode or comparison_method', () => {
        const malformedBodies = [
            {
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
            { mode: 'first_assessment' },
            { comparison_method: 'per_target_last_and_first_scored' },
        ] as const;

        for (const presentLevels of malformedBodies) {
            const report: AssessmentCommunicationReport = {
                ...finalizedRowFixture,
                embedded_computed: {
                    ...finalizedRowFixture.embedded_computed!,
                    computed_schema_version: REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION,
                    present_levels: presentLevels as never,
                },
            };

            const markup = renderToStaticMarkup(
                createElement(FinalizedReportDocument, {
                    report,
                    structureLabels: { primary_group: 'Domain', target: 'Target' },
                })
            );

            expect(markup).toContain('data-present-levels-corrupt-embed');
            expect(markup).toContain(PRESENT_LEVELS_CORRUPT_EMBED_MESSAGE);
            expect(markup).not.toContain('data-present-levels-without-change-metrics');
            expect(markup).not.toContain('data-present-levels-change');
            expect(markup).not.toContain('Skills improved');
            expect(markup).not.toContain('This is a first assessment');
            expect(markup).not.toContain('Points Captured');
        }
    });

    it('keeps REPORT_AUTHORING_TEMPLATE_VERSION at 1 so existing drafts still finalize', () => {
        expect(REPORT_AUTHORING_TEMPLATE_VERSION).toBe(1);
        expect(authoringFixture.template_version).toBe(1);
        expect(REPORT_AUTHORING_TEMPLATE_VERSION).not.toBe(REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION);
    });

    it('does not allow print emission on a corrupt Present Levels body', () => {
        expect(finalizedReportAllowsPrintEmission(finalizedRowFixture.embedded_computed!)).toBe(true);

        const slimValid = {
            ...finalizedRowFixture.embedded_computed!,
            computed_schema_version: REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION,
            present_levels: {
                mode: 'first_assessment' as const,
                comparison_method: 'per_target_last_and_first_scored' as const,
                first_assessment: {
                    statement_key: 'first_assessment' as const,
                    counts: { demonstrated: 1, emerging: 0, not_demonstrated: 0, unscored: 0 },
                },
                comparisons: [],
            },
        };
        expect(finalizedReportAllowsPrintEmission(slimValid)).toBe(true);

        const corruptDeclared = {
            ...finalizedRowFixture.embedded_computed!,
            computed_schema_version: REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION,
        };
        expect(finalizedReportAllowsPrintEmission(corruptDeclared)).toBe(false);
    });

    it('renders a stored goal domain_title instead of the raw domain id', () => {
        const titledReport: AssessmentCommunicationReport = {
            ...finalizedRowFixture,
            authoring: {
                ...authoringFixture,
                sections: {
                    ...authoringFixture.sections,
                    measurable_treatment_goals: {
                        goals: [
                            {
                                ...authoringFixture.sections.measurable_treatment_goals.goals[0]!,
                                domain_id: 'A',
                                domain_title: 'Communication',
                            },
                        ],
                    },
                },
            },
            embedded_computed: {
                ...finalizedRowFixture.embedded_computed!,
                computed_schema_version: REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION,
                present_levels: {
                    mode: 'first_assessment',
                    comparison_method: 'per_target_last_and_first_scored',
                    first_assessment: {
                        statement_key: 'first_assessment',
                        counts: { demonstrated: 1, emerging: 0, not_demonstrated: 0, unscored: 0 },
                    },
                    comparisons: [],
                },
            },
        };

        const markup = renderToStaticMarkup(
            createElement(FinalizedReportDocument, {
                report: titledReport,
                structureLabels: { primary_group: 'Domain', target: 'Target' },
            })
        );

        expect(markup).toContain('Goal 1 · Communication');
        expect(markup).not.toContain('Goal 1 · A');
        expect(markup).not.toContain('Goal 1 · DOM_A');
    });

    it('does not resolve goal domain titles from live pack data at render', () => {
        const documentSource = readFileSync(
            resolve(__dirname, '../components/report/FinalizedReportDocument.tsx'),
            'utf8'
        );
        const presentationSource = readFileSync(
            resolve(__dirname, '../utils/finalizedReportPresentation.ts'),
            'utf8'
        );
        expect(documentSource).toContain('resolveGoalDomainHeading');
        expect(documentSource).not.toContain('pack_snapshot');
        expect(documentSource).not.toContain('assessmentService');
        expect(presentationSource).toContain('goal.domain_title');
        expect(presentationSource).not.toContain('pack_snapshot');
    });

    it('does not regress legacy fat-embed goal domain headings', () => {
        const markup = renderToStaticMarkup(
            createElement(FinalizedReportDocument, {
                report: finalizedRowFixture,
                structureLabels: { primary_group: 'Domain', target: 'Target' },
            })
        );

        expect(markup).toContain('Goal 1 · Communication');
        expect(markup).not.toContain('Goal 1 · DOM_A');
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
