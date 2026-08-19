import { describe, expect, it, vi } from 'vitest';
import { AssessmentScore, ContentPackData } from '../types';
import * as reportProfileModule from './reportProfile';
import { buildEmbeddedComputedFromReportProfile } from './reportEmbeddedComputed';

const pack: ContentPackData = {
    pack_id: 'pack-1',
    org_id: 'org-1',
    title: 'Embed Pack',
    description: '',
    version: '2.1',
    domains: [
        {
            domain_id: 'DOM_A',
            title: 'Domain A',
            targets: [
                {
                    target_id: 'T1',
                    title: 'Target One',
                    success_criteria: '',
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

function makeScore(note: string | null): AssessmentScore {
    return {
        id: 'score-1',
        assessment_id: 'assess-1',
        assessment_cycle_id: 'cycle-1',
        client_id: 'client-1',
        pack_snapshot_id: 'pack-1',
        target_id: 'T1',
        domain_id: 'DOM_A',
        score: 2,
        note,
        evidence_files: [],
        assessor_user_id: 'user-1',
        scored_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

describe('buildEmbeddedComputedFromReportProfile', () => {
    it('delegates computation to buildReportProfile and maps contract keys verbatim', () => {
        const buildSpy = vi.spyOn(reportProfileModule, 'buildReportProfile');
        const snapshotAt = new Date('2026-08-19T12:00:00.000Z');
        const scores = [makeScore('SECRET_NOTE')];

        const embedded = buildEmbeddedComputedFromReportProfile({
            assessment: {
                id: 'assess-1',
                client_id: 'client-1',
                pack_snapshot: pack,
                assessment_date: '2026-08-01',
                status: 'approved',
                client: { first_name: 'Jamie', last_name: 'Lee' },
            },
            cycle: {
                id: 'cycle-1',
                cycle_number: 2,
                status: 'in_progress',
                start_date: '2026-07-01T00:00:00.000Z',
                end_date: null,
            },
            scores,
            previousScores: [],
            finalizedByUserId: 'user-final',
            authoringClinicianName: 'Dr. Smith',
            snapshotAt,
        });

        expect(buildSpy).toHaveBeenCalledTimes(1);

        const reportProfile = reportProfileModule.buildReportProfile({
            assessment: {
                id: 'assess-1',
                client_id: 'client-1',
                pack_snapshot: pack,
                assessment_date: '2026-08-01',
                status: 'approved',
                client: { first_name: 'Jamie', last_name: 'Lee' },
            },
            cycle: {
                id: 'cycle-1',
                cycle_number: 2,
                status: 'in_progress',
            },
            scores,
            generatedAt: snapshotAt,
        });

        expect(embedded.provenance).toEqual({
            snapshot_at: snapshotAt.toISOString(),
            pack_title: 'Embed Pack',
            pack_version: '2.1',
            assessment_id: 'assess-1',
            cycle_id: 'cycle-1',
            cycle_number: 2,
            pack_snapshot_frozen: true,
        });
        expect(embedded.overview.authoring_clinician_user_id).toBe('user-final');
        expect(embedded.overview.authoring_clinician_name).toBe('Dr. Smith');
        expect(embedded.present_levels.rollup).toEqual(reportProfile.rollup);
        expect(embedded.present_levels.assessment_band_distribution).toEqual(
            reportProfile.assessmentBandDistribution
        );
        expect(embedded.target_skills.domains[0]?.targets[0]).toEqual({
            target_id: 'T1',
            title: 'Target One',
            display_score_with_max: reportProfile.domains[0]!.targets[0]!.displayScoreWithMax,
            competency_state: reportProfile.domains[0]!.targets[0]!.competencyState,
            normalized_ratio: reportProfile.domains[0]!.targets[0]!.normalizedRatio,
        });
        expect(embedded.target_skills.domains[0]?.targets[0]).not.toHaveProperty('note');
        expect(JSON.stringify(embedded)).not.toContain('SECRET_NOTE');

        buildSpy.mockRestore();
    });
});
