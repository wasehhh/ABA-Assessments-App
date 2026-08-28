import { describe, expect, it } from 'vitest';
import { AssessmentScore, ContentPackData } from '../types';
import {
    buildEmbeddedComputedFromReportProfile,
    ReportEmbeddedComputedError,
} from './reportEmbeddedComputed';
import { REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION } from './reportAuthoringTypes';
import { ReportPriorCycleInput } from '../utils/reportPresentLevelsChange';

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

function makeScore(
    overrides: Partial<AssessmentScore> & Pick<AssessmentScore, 'score' | 'assessment_cycle_id'>
): AssessmentScore {
    return {
        id: 'score-1',
        assessment_id: 'assess-1',
        client_id: 'client-1',
        pack_snapshot_id: 'pack-1',
        target_id: 'T1',
        domain_id: 'DOM_A',
        note: null,
        evidence_files: [],
        assessor_user_id: 'user-1',
        scored_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

function makePriorCycle(
    cycleNumber: number,
    scores: AssessmentScore[],
    extras: Partial<ReportPriorCycleInput> = {}
): ReportPriorCycleInput {
    return {
        cycle_id: `cycle-${cycleNumber}`,
        cycle_number: cycleNumber,
        start_date: extras.start_date ?? '2026-01-01',
        end_date: extras.end_date ?? null,
        scores,
        ...extras,
    };
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
    if (Array.isArray(value)) {
        value.forEach((item) => collectKeys(item, keys));
        return keys;
    }
    if (value && typeof value === 'object') {
        for (const [key, nested] of Object.entries(value)) {
            keys.add(key);
            collectKeys(nested, keys);
        }
    }
    return keys;
}

const forbiddenEmbedKeys = [
    'scores',
    'target_id',
    'rollup',
    'assessment_band_distribution',
    'points_captured_percentage',
    'overall_points_captured',
    'target_skills',
    'normalized_ratio',
    'note',
    'domains',
] as const;

describe('buildEmbeddedComputedFromReportProfile', () => {
    it('writes slim first-assessment present_levels without raw scores, per-target maps, or aggregates', () => {
        const snapshotAt = new Date('2026-08-19T12:00:00.000Z');
        const scores = [makeScore({ score: 2, assessment_cycle_id: 'cycle-1', note: 'SECRET_NOTE' })];

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
                cycle_number: 1,
                status: 'in_progress',
                start_date: '2026-07-01T00:00:00.000Z',
                end_date: null,
            },
            scores,
            priorCycles: [],
            finalizedByUserId: 'user-final',
            authoringClinicianName: 'Dr. Smith',
            snapshotAt,
        });

        expect(embedded.provenance).toEqual({
            snapshot_at: snapshotAt.toISOString(),
            pack_title: 'Embed Pack',
            pack_version: '2.1',
            assessment_id: 'assess-1',
            cycle_id: 'cycle-1',
            cycle_number: 1,
            pack_snapshot_frozen: true,
        });
        expect(embedded.computed_schema_version).toBe(REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION);
        expect(embedded.overview.authoring_clinician_user_id).toBe('user-final');
        expect(embedded.overview.authoring_clinician_name).toBe('Dr. Smith');
        expect(embedded.overview.client_name).toBe('Jamie Lee');
        expect(embedded.present_levels).toEqual({
            mode: 'first_assessment',
            comparison_method: 'per_target_last_and_first_scored',
            first_assessment: {
                statement_key: 'first_assessment',
                counts: {
                    demonstrated: 1,
                    emerging: 0,
                    not_demonstrated: 0,
                    unscored: 0,
                },
            },
            comparisons: [],
        });
        expect(embedded).not.toHaveProperty('target_skills');

        const keys = collectKeys(embedded);
        for (const forbidden of forbiddenEmbedKeys) {
            expect(keys.has(forbidden)).toBe(false);
        }
        expect(JSON.stringify(embedded)).not.toContain('SECRET_NOTE');
    });

    it('persists comparison results plus method, span, and cycle histogram provenance', () => {
        const snapshotAt = new Date('2026-08-19T12:00:00.000Z');
        const priorScores = [makeScore({ score: 0, assessment_cycle_id: 'cycle-1', id: 'score-prior' })];
        const scores = [makeScore({ score: 2, assessment_cycle_id: 'cycle-2', note: 'SECRET_NOTE' })];

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
                id: 'cycle-2',
                cycle_number: 2,
                status: 'in_progress',
                start_date: '2026-07-01T00:00:00.000Z',
                end_date: null,
            },
            scores,
            priorCycles: [makePriorCycle(1, priorScores)],
            finalizedByUserId: 'user-final',
            authoringClinicianName: 'Dr. Smith',
            snapshotAt,
        });

        expect(embedded.computed_schema_version).toBe(REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION);
        if (!('mode' in embedded.present_levels) || !('comparisons' in embedded.present_levels)) {
            throw new Error('expected change-metric present_levels');
        }
        expect(embedded.present_levels.mode).toBe('single_comparison');
        expect(embedded.present_levels).toMatchObject({
            comparison_method: 'per_target_last_and_first_scored',
            first_assessment: null,
        });
        expect(embedded.present_levels.comparisons).toHaveLength(1);
        const line = embedded.present_levels.comparisons[0]!;
        expect(line.role).toBe('last_assessed');
        expect(line.label_key).toBe('since_last_assessed');
        expect(line.skills_improved).toBe(1);
        expect(line.skills_regressed).toBe(0);
        expect(line.newly_assessed).toBe(0);
        expect(line.no_longer_scored).toBe(0);
        expect(line.anchors_by_cycle_number).toEqual({ '1': 1 });
        expect(line.anchor_span.available).toBe(true);
        expect(line.anchor_span.earliest_cycle_number).toBe(1);
        expect(line.anchor_span.latest_cycle_number).toBe(1);

        const keys = collectKeys(embedded);
        for (const forbidden of forbiddenEmbedKeys) {
            expect(keys.has(forbidden)).toBe(false);
        }
        expect(JSON.stringify(embedded)).not.toContain('SECRET_NOTE');
        expect(embedded).not.toHaveProperty('target_skills');
    });

    it('refuses to embed when cycle_number > 1 and priorCycles is empty', () => {
        expect(() =>
            buildEmbeddedComputedFromReportProfile({
                assessment: {
                    id: 'assess-1',
                    pack_snapshot: pack,
                },
                cycle: {
                    id: 'cycle-3',
                    cycle_number: 3,
                    status: 'in_progress',
                    start_date: null,
                    end_date: null,
                },
                scores: [],
                priorCycles: [],
                finalizedByUserId: 'user-final',
                authoringClinicianName: 'Dr. Smith',
            })
        ).toThrow(ReportEmbeddedComputedError);
        expect(() =>
            buildEmbeddedComputedFromReportProfile({
                assessment: {
                    id: 'assess-1',
                    pack_snapshot: pack,
                },
                cycle: {
                    id: 'cycle-3',
                    cycle_number: 3,
                    status: 'in_progress',
                    start_date: null,
                    end_date: null,
                },
                scores: [],
                priorCycles: [],
                finalizedByUserId: 'user-final',
                authoringClinicianName: 'Dr. Smith',
            })
        ).toThrow(/empty priorCycles would misreport this as a first assessment/);
    });

    it('does not write a slim embed without computed_schema_version', () => {
        const embedded = buildEmbeddedComputedFromReportProfile({
            assessment: {
                id: 'assess-1',
                pack_snapshot: pack,
                client: { first_name: 'Jamie', last_name: 'Lee' },
            },
            cycle: {
                id: 'cycle-1',
                cycle_number: 1,
                status: 'in_progress',
                start_date: null,
                end_date: null,
            },
            scores: [],
            priorCycles: [],
            finalizedByUserId: 'user-final',
            authoringClinicianName: 'Dr. Smith',
            snapshotAt: new Date('2026-08-19T12:00:00.000Z'),
        });

        expect(embedded).toHaveProperty(
            'computed_schema_version',
            REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION
        );
        expect('mode' in embedded.present_levels).toBe(true);
    });
});
