import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReportAssessmentScoreDistribution } from '../ReportAssessmentScoreDistribution';
import { ReportDomainScoreDistribution } from '../ReportDomainScoreDistribution';
import { ReportDomainSummaryTable } from '../ReportDomainSummaryTable';
import { FinalizedReportDocument } from '../FinalizedReportDocument';
import { buildReportProfile } from '../../../services/reportProfile';
import { buildEmbeddedComputedFromReportProfile } from '../../../services/reportEmbeddedComputed';
import { AssessmentScore, ContentPackData } from '../../../types';
import { AssessmentCommunicationReport, ReportAuthoring } from '../../../services/reportAuthoringTypes';

const NOTE_LEAK_PROBE = 'CONFIDENTIAL_TARGET_NOTE_DO_NOT_RENDER';

const probePack: ContentPackData = {
    pack_id: 'pack-probe',
    org_id: 'org-1',
    title: 'Probe Pack',
    description: '',
    version: '1.0',
    domains: [
        {
            domain_id: 'DOM_PROBE',
            title: 'Probe Domain',
            targets: [
                {
                    target_id: 'T_PROBE',
                    title: 'Probe Target',
                    success_criteria: 'Criteria',
                    materials: '',
                    scoring: {
                        type: 'numeric',
                        scale: [0, 1, 2],
                        scale_labels: {},
                        no_opportunity_allowed: false,
                    },
                },
            ],
        },
    ],
};

function makeScore(note: string): AssessmentScore {
    return {
        id: 'score-probe',
        assessment_id: 'assess-probe',
        assessment_cycle_id: 'cycle-1',
        client_id: 'client-1',
        pack_snapshot_id: 'pack-probe',
        target_id: 'T_PROBE',
        domain_id: 'DOM_PROBE',
        score: 2,
        note,
        evidence_files: [],
        assessor_user_id: 'user-1',
        scored_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

function buildProbeReport(note: string) {
    return buildReportProfile({
        assessment: {
            id: 'assess-probe',
            client_id: 'client-1',
            assessment_date: '2026-05-01',
            status: 'in_progress',
            client: { first_name: 'Jamie', last_name: 'Lee' },
            pack_snapshot: probePack,
        },
        cycle: { id: 'cycle-1', cycle_number: 1, status: 'in_progress' },
        scores: [makeScore(note)],
        generatedAt: new Date('2026-05-22T12:00:00.000Z'),
    });
}

describe('Assessment Report note non-leakage (OQ-7)', () => {
    it('keeps score notes on profile rows but out of report component markup', () => {
        const report = buildProbeReport(NOTE_LEAK_PROBE);

        expect(report.domains[0]?.targets[0]?.note).toBe(NOTE_LEAK_PROBE);

        const summaryMarkup = renderToStaticMarkup(
            createElement(ReportDomainSummaryTable, {
                domains: report.domains,
                structureLabels: report.structureLabels,
            })
        );
        const assessmentDistributionMarkup = renderToStaticMarkup(
            createElement(ReportAssessmentScoreDistribution, {
                distribution: report.assessmentBandDistribution,
            })
        );
        const domainDistributionMarkup = renderToStaticMarkup(
            createElement(ReportDomainScoreDistribution, {
                distribution: report.domains[0]!.profile.stateDistribution,
            })
        );

        for (const markup of [
            summaryMarkup,
            assessmentDistributionMarkup,
            domainDistributionMarkup,
        ]) {
            expect(markup).not.toContain(NOTE_LEAK_PROBE);
        }
    });

    it('NOTE_LEAK_PROBE covers FinalizedReportDocument via renderToStaticMarkup', () => {
        const embedded = buildEmbeddedComputedFromReportProfile({
            assessment: {
                id: 'assess-probe',
                client_id: 'client-1',
                pack_snapshot: probePack,
                assessment_date: '2026-05-01',
                status: 'approved',
                client: { first_name: 'Jamie', last_name: 'Lee' },
            },
            cycle: {
                id: 'cycle-1',
                cycle_number: 1,
                status: 'in_progress',
                start_date: null,
                end_date: null,
            },
            scores: [makeScore(NOTE_LEAK_PROBE)],
            priorCycles: [],
            finalizedByUserId: 'user-1',
            authoringClinicianName: 'Dr. Smith',
            snapshotAt: new Date('2026-05-22T12:00:00.000Z'),
        });

        const authoring: ReportAuthoring = {
            template_version: 1,
            sections: {
                target_skills_focus: { focus_summary: 'Focus summary without notes.' },
                measurable_treatment_goals: {
                    goals: [
                        {
                            id: 'goal-1',
                            domain_id: 'DOM_PROBE',
                            goal_statement: 'Goal statement.',
                            mastery_criterion: 'Criterion',
                            target_timeframe: '3_months',
                        },
                    ],
                },
                recommended_therapy_hours: {
                    weekly_hours: 10,
                    clinical_justification: 'Justification',
                },
                clinical_summary: { narrative: 'Summary' },
            },
        };

        const slimReport: AssessmentCommunicationReport = {
            id: 'report-probe',
            org_id: 'org-1',
            assessment_id: 'assess-probe',
            cycle_id: 'cycle-1',
            status: 'finalized',
            version: 1,
            authoring,
            embedded_computed: embedded,
            embedded_generated_at: '2026-05-22T12:00:00.000Z',
            created_by: 'user-1',
            last_edited_by: 'user-1',
            finalized_by: 'user-1',
            finalized_at: '2026-05-22T12:00:00.000Z',
            created_at: '2026-05-22T12:00:00.000Z',
            updated_at: '2026-05-22T12:00:00.000Z',
        };

        const slimMarkup = renderToStaticMarkup(
            createElement(FinalizedReportDocument, {
                report: slimReport,
                structureLabels: { primary_group: 'Domain', target: 'Target' },
            })
        );
        expect(slimMarkup).not.toContain(NOTE_LEAK_PROBE);
        expect(JSON.stringify(embedded)).not.toContain(NOTE_LEAK_PROBE);

        const leakyLegacy: AssessmentCommunicationReport = {
            ...slimReport,
            embedded_computed: {
                ...embedded,
                present_levels: {
                    rollup: {
                        totalDomains: 1,
                        incompleteDomains: 0,
                        scoredTargets: 1,
                        totalTargets: 1,
                        coveragePercentage: 100,
                        pointsCapturedPercentage: 100,
                    },
                    assessment_band_distribution: {
                        unscored: 0,
                        not_yet: 0,
                        in_progress: 0,
                        at_maximum: 1,
                        showsInProgressBucket: false,
                    },
                    domains: [
                        {
                            domain_id: 'DOM_PROBE',
                            title: 'Probe Domain',
                            coverage: { scored: 1, total: 1 },
                            points_captured_percentage: 100,
                            state_distribution: {
                                unscored: 0,
                                not_yet: 0,
                                in_progress: 0,
                                at_maximum: 1,
                                showsInProgressBucket: false,
                            },
                        },
                    ],
                },
                target_skills: {
                    domains: [
                        {
                            domain_id: 'DOM_PROBE',
                            title: 'Probe Domain',
                            targets: [
                                {
                                    target_id: 'T_PROBE',
                                    title: 'Probe Target',
                                    display_score_with_max: '2/2',
                                    competency_state: 'at_maximum',
                                    normalized_ratio: 1,
                                    note: NOTE_LEAK_PROBE,
                                } as never,
                            ],
                        },
                    ],
                },
            },
        };

        const legacyMarkup = renderToStaticMarkup(
            createElement(FinalizedReportDocument, {
                report: leakyLegacy,
                structureLabels: { primary_group: 'Domain', target: 'Target' },
            })
        );
        expect(legacyMarkup).not.toContain(NOTE_LEAK_PROBE);
        expect(legacyMarkup).not.toContain('Probe Target');
    });

    it('does not read or render score notes in the finalized report surface', () => {
        const pageSource = readFileSync(
            resolve(__dirname, '../../../pages/FinalizedAssessmentReport.tsx'),
            'utf8'
        );
        const documentSource = readFileSync(
            resolve(__dirname, '../FinalizedReportDocument.tsx'),
            'utf8'
        );

        expect(pageSource).not.toContain('targetRow.note');
        expect(pageSource).not.toMatch(/\bnote:\s*targetRow/);
        expect(documentSource).not.toContain('.note');
    });

    it('does not reference score notes in report components', () => {
        const componentPaths = [
            '../ReportAssessmentScoreDistribution.tsx',
            '../ReportDomainScoreDistribution.tsx',
            '../ReportDomainSummaryTable.tsx',
        ];

        for (const relativePath of componentPaths) {
            const source = readFileSync(resolve(__dirname, relativePath), 'utf8');
            expect(source).not.toContain('.note');
        }
    });
});

describe('FinalizedAssessmentReport print gate wiring', () => {
    it('gates only print — view loads without acknowledgement check', () => {
        const source = readFileSync(
            resolve(__dirname, '../../../pages/FinalizedAssessmentReport.tsx'),
            'utf8'
        );

        expect(source).toContain('hasReportExportAcknowledged(assessmentId)');
        expect(source).toContain('handlePrintClick');
        expect(source).toContain('printDialogOpen');
        expect(source).toContain('isOpen={printDialogOpen}');
        expect(source).not.toMatch(/if\s*\(\s*!hasReportExportAcknowledged/);
    });

    it('logs print audit before window.print and omits surface', () => {
        const source = readFileSync(
            resolve(__dirname, '../../../pages/FinalizedAssessmentReport.tsx'),
            'utf8'
        );

        expect(source).toContain("artifact: 'report'");
        expect(source).toContain("channel: 'print'");
        expect(source).toContain('mode: REPORT_EXPORT_MODE');
        expect(source).toContain("event: 'print'");
        expect(source).not.toContain('surface:');
        expect(source).toMatch(/runPrint[\s\S]*logClinicalExportAudit[\s\S]*window\.print\(\)/);
    });
});
