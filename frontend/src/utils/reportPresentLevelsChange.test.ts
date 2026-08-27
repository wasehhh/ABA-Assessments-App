import { describe, expect, it } from 'vitest';
import { AssessmentScore, ContentPackData, Target } from '../types';
import {
    classifyCompetencyTransition,
    computePresentLevelsChange,
    REPORT_COMPARISON_METHOD,
    resolveTargetAnchors,
    type ReportPriorCycleInput,
} from './reportPresentLevelsChange';

function makeTarget(targetId: string, title = targetId): Target {
    return {
        target_id: targetId,
        title,
        success_criteria: 'Criteria',
        materials: '',
        scoring: {
            type: 'numeric',
            scale: [0, 1, 2, 3, 4],
            scale_labels: {},
            no_opportunity_allowed: false,
        },
    };
}

function makePack(targetIds: string[]): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Pack',
        description: '',
        version: '1.0',
        domains: [
            {
                domain_id: 'DOM_A',
                title: 'Domain A',
                targets: targetIds.map((id) => makeTarget(id)),
            },
        ],
    };
}

function makeScore(
    targetId: string,
    score: number | null,
    cycleId: string,
    timestamps: { scored_at: string; created_at: string } = {
        scored_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
    }
): AssessmentScore {
    return {
        id: `score-${cycleId}-${targetId}`,
        assessment_id: 'assess-1',
        assessment_cycle_id: cycleId,
        client_id: 'client-1',
        pack_snapshot_id: 'pack-1',
        target_id: targetId,
        domain_id: 'DOM_A',
        score,
        note: 'private clinical note must not affect classification',
        evidence_files: [],
        assessor_user_id: 'user-1',
        scored_at: timestamps.scored_at,
        created_at: timestamps.created_at,
        updated_at: timestamps.created_at,
    };
}

function makePriorCycle(
    cycleNumber: number,
    scores: AssessmentScore[],
    dates: { start_date: string | null; end_date: string | null } = {
        start_date: `2026-0${cycleNumber}-01`,
        end_date: `2026-0${cycleNumber}-28`,
    }
): ReportPriorCycleInput {
    return {
        cycle_id: `cycle-${cycleNumber}`,
        cycle_number: cycleNumber,
        start_date: dates.start_date,
        end_date: dates.end_date,
        scores,
    };
}

function reportCycle(cycleNumber: number) {
    return {
        cycle_id: `cycle-${cycleNumber}`,
        cycle_number: cycleNumber,
        start_date: `2026-0${cycleNumber}-01`,
        end_date: `2026-0${cycleNumber}-28`,
    };
}

describe('classifyCompetencyTransition', () => {
    it('maps the scored ladder without treating Unscored as a rung', () => {
        expect(classifyCompetencyTransition('not_yet', 'in_progress')).toBe('improved');
        expect(classifyCompetencyTransition('not_yet', 'at_maximum')).toBe('improved');
        expect(classifyCompetencyTransition('in_progress', 'at_maximum')).toBe('improved');
        expect(classifyCompetencyTransition('in_progress', 'not_yet')).toBe('regressed');
        expect(classifyCompetencyTransition('at_maximum', 'in_progress')).toBe('regressed');
        expect(classifyCompetencyTransition('at_maximum', 'not_yet')).toBe('regressed');
        expect(classifyCompetencyTransition('not_yet', 'not_yet')).toBe('stable');
        expect(classifyCompetencyTransition('in_progress', 'in_progress')).toBe('stable');
        expect(classifyCompetencyTransition('at_maximum', 'at_maximum')).toBe('stable');
    });

    it('treats Unscored→scored as newly assessed, not improved', () => {
        expect(classifyCompetencyTransition('unscored', 'not_yet')).toBe('newly_assessed');
        expect(classifyCompetencyTransition('unscored', 'in_progress')).toBe('newly_assessed');
        expect(classifyCompetencyTransition('unscored', 'at_maximum')).toBe('newly_assessed');
        expect(classifyCompetencyTransition('unscored', 'unscored')).toBe('still_unscored');
    });

    it('treats scored→Unscored as no longer scored, not regressed', () => {
        expect(classifyCompetencyTransition('not_yet', 'unscored')).toBe('no_longer_scored');
        expect(classifyCompetencyTransition('in_progress', 'unscored')).toBe('no_longer_scored');
        expect(classifyCompetencyTransition('at_maximum', 'unscored')).toBe('no_longer_scored');
    });
});

describe('per-target last-scored / first-scored resolution', () => {
    it('anchors a cycle-1 scored / cycle-2 unscored / cycle-3 scored target to cycle 1, not cycle 2, and not newly assessed', () => {
        const pack = makePack(['T']);
        const input = {
            packSnapshot: pack,
            reportCycle: reportCycle(3),
            scores: [makeScore('T', 2, 'cycle-3')],
            priorCycles: [
                makePriorCycle(1, [makeScore('T', 4, 'cycle-1')]),
                makePriorCycle(2, []),
            ],
        };

        const anchors = resolveTargetAnchors(pack.domains[0].targets[0], input);
        expect(anchors.lastScored?.cycle_number).toBe(1);
        expect(anchors.lastScored?.state).toBe('at_maximum');
        expect(anchors.to).toBe('in_progress');
        expect(anchors.firstScored?.cycle_number).toBe(1);

        const result = computePresentLevelsChange(input);
        const lastLine = result.comparisons[0];
        expect(lastLine.newly_assessed).toBe(0);
        expect(lastLine.skills_regressed).toBe(1);
        expect(lastLine.skills_improved).toBe(0);
        expect(lastLine.anchors_by_cycle_number).toEqual({ '1': 1 });
        expect(lastLine.anchor_span.earliest_cycle_number).toBe(1);
        expect(lastLine.anchor_span.latest_cycle_number).toBe(1);
    });

    it('classifies a target never scored before as newly assessed and not improved or regressed', () => {
        const pack = makePack(['T']);
        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(2),
            scores: [makeScore('T', 4, 'cycle-2')],
            priorCycles: [makePriorCycle(1, [])],
        });

        expect(result.mode).toBe('single_comparison');
        const lastLine = result.comparisons[0];
        expect(lastLine.newly_assessed).toBe(1);
        expect(lastLine.skills_improved).toBe(0);
        expect(lastLine.skills_regressed).toBe(0);
        expect(lastLine.no_longer_scored).toBe(0);
        expect(lastLine.anchor_span.available).toBe(false);
        expect(lastLine.anchors_by_cycle_number).toEqual({});
    });

    it('counts ten first-time scores as newly assessed 10 and improved 0 (worked example A)', () => {
        const ids = Array.from({ length: 10 }, (_, index) => `T${index + 1}`);
        const pack = makePack(ids);
        const reportScores = ids.map((id, index) =>
            makeScore(id, index < 5 ? 4 : 0, 'cycle-2')
        );

        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(2),
            scores: reportScores,
            priorCycles: [makePriorCycle(1, [])],
        });

        const lastLine = result.comparisons[0];
        expect(lastLine.skills_improved).toBe(0);
        expect(lastLine.newly_assessed).toBe(10);
        expect(lastLine.skills_regressed).toBe(0);
        expect(lastLine.no_longer_scored).toBe(0);
    });

    it('reports regression as a real field, including when the count is zero', () => {
        const pack = makePack(['GAIN', 'STABLE']);
        const withRegression = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(2),
            scores: [makeScore('GAIN', 2, 'cycle-2'), makeScore('STABLE', 0, 'cycle-2')],
            priorCycles: [
                makePriorCycle(1, [
                    makeScore('GAIN', 4, 'cycle-1'),
                    makeScore('STABLE', 0, 'cycle-1'),
                ]),
            ],
        });
        expect(withRegression.comparisons[0]).toEqual(
            expect.objectContaining({
                skills_regressed: 1,
                skills_improved: 0,
                newly_assessed: 0,
            })
        );
        expect(Object.keys(withRegression.comparisons[0])).toContain('skills_regressed');

        const noRegression = computePresentLevelsChange({
            packSnapshot: makePack(['T']),
            reportCycle: reportCycle(2),
            scores: [makeScore('T', 4, 'cycle-2')],
            priorCycles: [makePriorCycle(1, [makeScore('T', 0, 'cycle-1')])],
        });
        expect(noRegression.comparisons[0].skills_regressed).toBe(0);
        expect(Object.keys(noRegression.comparisons[0])).toContain('skills_regressed');
        expect(noRegression.comparisons[0].skills_improved).toBe(1);
    });

    it('counts a target whose first and last anchors coincide on the last-assessed line only', () => {
        const pack = makePack(['T']);
        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(3),
            scores: [makeScore('T', 4, 'cycle-3')],
            priorCycles: [
                makePriorCycle(1, [makeScore('T', 0, 'cycle-1')]),
                makePriorCycle(2, []),
            ],
        });

        expect(result.mode).toBe('single_comparison');
        expect(result.comparisons).toHaveLength(1);
        expect(result.comparisons[0].role).toBe('last_assessed');
        expect(result.comparisons[0].skills_improved).toBe(1);
        expect(result.comparisons[0].newly_assessed).toBe(0);
    });

    it('yields single_comparison on cycle 2 and dual_comparison on cycle 3+ when first and last anchors differ', () => {
        const pack = makePack(['T']);

        const cycleTwo = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(2),
            scores: [makeScore('T', 2, 'cycle-2')],
            priorCycles: [makePriorCycle(1, [makeScore('T', 0, 'cycle-1')])],
        });
        expect(cycleTwo.mode).toBe('single_comparison');
        expect(cycleTwo.comparisons.map((line) => line.role)).toEqual(['last_assessed']);

        const cycleThree = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(3),
            scores: [makeScore('T', 4, 'cycle-3')],
            priorCycles: [
                makePriorCycle(1, [makeScore('T', 0, 'cycle-1')]),
                makePriorCycle(2, [makeScore('T', 2, 'cycle-2')]),
            ],
        });
        expect(cycleThree.mode).toBe('dual_comparison');
        expect(cycleThree.comparisons.map((line) => line.role)).toEqual([
            'last_assessed',
            'first_assessed',
        ]);
        expect(cycleThree.comparisons[0].skills_improved).toBe(1);
        expect(cycleThree.comparisons[1].skills_improved).toBe(1);
        expect(cycleThree.comparisons[0].anchors_by_cycle_number).toEqual({ '2': 1 });
        expect(cycleThree.comparisons[1].anchors_by_cycle_number).toEqual({ '1': 1 });
    });

    it('orders last-scored by cycle_number when two scored priors have inverted timestamps', () => {
        const pack = makePack(['T']);
        const cycle1JuneDemonstrated = makePriorCycle(
            1,
            [
                makeScore('T', 4, 'cycle-1', {
                    scored_at: '2026-06-15T00:00:00Z',
                    created_at: '2026-06-15T00:00:00Z',
                }),
            ],
            { start_date: '2026-06-01', end_date: '2026-06-30' }
        );
        const cycle2JanuaryNotDemonstrated = makePriorCycle(
            2,
            [
                makeScore('T', 0, 'cycle-2', {
                    scored_at: '2026-01-15T00:00:00Z',
                    created_at: '2026-01-15T00:00:00Z',
                }),
            ],
            { start_date: '2026-01-01', end_date: '2026-01-31' }
        );

        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: {
                cycle_id: 'cycle-3',
                cycle_number: 3,
                start_date: '2026-09-01',
                end_date: '2026-09-30',
            },
            scores: [
                makeScore('T', 2, 'cycle-3', {
                    scored_at: '2026-09-15T00:00:00Z',
                    created_at: '2026-09-15T00:00:00Z',
                }),
            ],
            priorCycles: [cycle1JuneDemonstrated, cycle2JanuaryNotDemonstrated],
        });

        const lastLine = result.comparisons[0];
        expect(lastLine.role).toBe('last_assessed');
        expect(lastLine.anchors_by_cycle_number).toEqual({ '2': 1 });
        expect(lastLine.skills_improved).toBe(1);
        expect(lastLine.skills_regressed).toBe(0);
        expect(lastLine.newly_assessed).toBe(0);
    });

    it('classifies scored-before / unscored-now as no longer scored, not regressed, and does not drop the target', () => {
        const pack = makePack(['T', 'STILL_SCORED']);
        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(3),
            scores: [makeScore('STILL_SCORED', 4, 'cycle-3')],
            priorCycles: [
                makePriorCycle(1, [
                    makeScore('T', 4, 'cycle-1'),
                    makeScore('STILL_SCORED', 0, 'cycle-1'),
                ]),
                makePriorCycle(2, [
                    makeScore('T', 2, 'cycle-2'),
                    makeScore('STILL_SCORED', 2, 'cycle-2'),
                ]),
            ],
        });

        const lastLine = result.comparisons[0];
        expect(lastLine.no_longer_scored).toBe(1);
        expect(lastLine.skills_regressed).toBe(0);
        expect(lastLine.newly_assessed).toBe(0);
        expect(lastLine.skills_improved).toBe(1);
        expect(
            lastLine.no_longer_scored +
                lastLine.skills_regressed +
                lastLine.newly_assessed +
                lastLine.skills_improved
        ).toBe(2);
    });
});

describe('computePresentLevelsChange modes and provenance', () => {
    it('returns first_assessment counts on cycle 1 with no comparison lines', () => {
        const pack = makePack(['A', 'B', 'C', 'D']);
        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(1),
            scores: [
                makeScore('A', 4, 'cycle-1'),
                makeScore('B', 2, 'cycle-1'),
                makeScore('C', 0, 'cycle-1'),
            ],
            priorCycles: [],
        });

        expect(result.mode).toBe('first_assessment');
        expect(result.comparison_method).toBe(REPORT_COMPARISON_METHOD);
        expect(result.comparisons).toEqual([]);
        expect(result.first_assessment?.counts).toEqual({
            demonstrated: 1,
            emerging: 1,
            not_demonstrated: 1,
            unscored: 1,
        });
    });

    it('does not return aggregate percentages or raw score arrays', () => {
        const pack = makePack(['T']);
        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(2),
            scores: [makeScore('T', 4, 'cycle-2')],
            priorCycles: [makePriorCycle(1, [makeScore('T', 0, 'cycle-1')])],
        });
        const serialized = JSON.stringify(result);
        expect(serialized).not.toMatch(/percent/i);
        expect(serialized).not.toContain('overall_points_captured');
        expect(serialized).not.toContain('points_captured_percentage');
        expect(result).not.toHaveProperty('scores');
        expect(result.comparisons[0]).not.toHaveProperty('targets');
    });

    it('treats cycle_number > 1 with empty priorCycles as first_assessment (known input-contract gap; R2 must not call this way)', () => {
        const pack = makePack(['T']);
        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(3),
            scores: [makeScore('T', 4, 'cycle-3')],
            priorCycles: [],
        });

        expect(result.mode).toBe('first_assessment');
        expect(result.comparisons).toEqual([]);
        expect(result.first_assessment).not.toBeNull();
    });

    it('does not collapse empty prior shells into first_assessment: cycle 3 with unscored priors is single_comparison, all newly assessed', () => {
        const pack = makePack(['T1', 'T2']);
        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(3),
            scores: [makeScore('T1', 4, 'cycle-3'), makeScore('T2', 0, 'cycle-3')],
            priorCycles: [makePriorCycle(1, []), makePriorCycle(2, [])],
        });

        expect(result.mode).toBe('single_comparison');
        expect(result.comparisons).toHaveLength(1);
        expect(result.comparisons[0].newly_assessed).toBe(2);
        expect(result.comparisons[0].skills_improved).toBe(0);
        expect(result.comparisons[0].skills_regressed).toBe(0);
        expect(result.comparisons[0].no_longer_scored).toBe(0);
        expect(result.first_assessment).toBeNull();
    });

    it('ignores prior-cycle score rows whose target_id is absent from the frozen pack', () => {
        const pack = makePack(['T']);
        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(2),
            scores: [makeScore('T', 2, 'cycle-2')],
            priorCycles: [
                makePriorCycle(1, [
                    makeScore('T', 0, 'cycle-1'),
                    makeScore('GHOST', 4, 'cycle-1'),
                ]),
            ],
        });

        const lastLine = result.comparisons[0];
        expect(lastLine.skills_improved).toBe(1);
        expect(lastLine.skills_regressed).toBe(0);
        expect(lastLine.newly_assessed).toBe(0);
        expect(lastLine.no_longer_scored).toBe(0);
        expect(lastLine.anchors_by_cycle_number).toEqual({ '1': 1 });
    });

    it('anchors by cycle_number and drops priors at or above the report cycle when the array is unsorted', () => {
        const pack = makePack(['T']);
        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(3),
            scores: [makeScore('T', 2, 'cycle-3')],
            priorCycles: [
                makePriorCycle(4, [makeScore('T', 4, 'cycle-4')]),
                makePriorCycle(2, [makeScore('T', 0, 'cycle-2')]),
                makePriorCycle(3, [makeScore('T', 4, 'cycle-3')]),
                makePriorCycle(1, [makeScore('T', 4, 'cycle-1')]),
            ],
        });

        const lastLine = result.comparisons[0];
        expect(lastLine.role).toBe('last_assessed');
        expect(lastLine.anchors_by_cycle_number).toEqual({ '2': 1 });
        expect(lastLine.skills_improved).toBe(1);
        expect(lastLine.skills_regressed).toBe(0);
        expect(lastLine.newly_assessed).toBe(0);
    });

    it('uses the last duplicate score row for a target in one cycle (current behaviour; unspecified, not a contract rule)', () => {
        const pack = makePack(['T']);
        const firstRow = makeScore('T', 4, 'cycle-1');
        const lastRow = {
            ...makeScore('T', 0, 'cycle-1'),
            id: 'score-cycle-1-T-duplicate',
        };
        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(2),
            scores: [makeScore('T', 2, 'cycle-2')],
            priorCycles: [makePriorCycle(1, [firstRow, lastRow])],
        });

        const lastLine = result.comparisons[0];
        expect(lastLine.skills_improved).toBe(1);
        expect(lastLine.skills_regressed).toBe(0);
        expect(lastLine.newly_assessed).toBe(0);
    });

    it('omits span when every scored target is newly assessed', () => {
        const pack = makePack(['T1', 'T2']);
        const result = computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: reportCycle(2),
            scores: [makeScore('T1', 4, 'cycle-2'), makeScore('T2', 0, 'cycle-2')],
            priorCycles: [makePriorCycle(1, [])],
        });
        expect(result.comparisons[0].anchor_span).toEqual({
            earliest_cycle_number: null,
            latest_cycle_number: null,
            earliest_date: null,
            latest_date: null,
            available: false,
        });
    });
});
