import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReportAssessmentScoreDistribution } from '../ReportAssessmentScoreDistribution';
import { ReportDomainScoreDistribution } from '../ReportDomainScoreDistribution';
import { ReportDomainSummaryTable } from '../ReportDomainSummaryTable';
import { buildReportProfile } from '../../../services/reportProfile';
import { AssessmentScore, ContentPackData } from '../../../types';

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

    it('does not read or render ReportTargetRow.note in AssessmentReport.tsx', () => {
        const source = readFileSync(
            resolve(__dirname, '../../../pages/AssessmentReport.tsx'),
            'utf8'
        );

        expect(source).not.toContain('targetRow.note');
        expect(source).not.toMatch(/\bnote:\s*targetRow/);
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

describe('AssessmentReport print gate wiring', () => {
    it('gates only print — view loads without acknowledgement check', () => {
        const source = readFileSync(
            resolve(__dirname, '../../../pages/AssessmentReport.tsx'),
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
            resolve(__dirname, '../../../pages/AssessmentReport.tsx'),
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
