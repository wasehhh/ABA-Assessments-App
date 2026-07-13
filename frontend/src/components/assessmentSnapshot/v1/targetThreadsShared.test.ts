import { describe, expect, it } from 'vitest';
import { beadScoreText, latestCycleId } from './targetThreadsShared';
import {
    resolveThreadDisplayLabel,
    resolveThreadsLayoutTier,
} from './threadsLayout';
import { LearnerMapCell, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { buildLearnerMapProfile } from '../../../services/learnerMapProfile';

function makeCell(overrides: Partial<LearnerMapCell> = {}): LearnerMapCell {
    return {
        cycleId: 'c1',
        cycleNumber: 1,
        rawScore: 2,
        displayScoreWithMax: '2/4',
        competencyState: 'in_progress',
        normalizedRatio: 0.5,
        isUnscored: false,
        movementFromPrevious: 'none',
        ...overrides,
    };
}

function makeTarget(overrides: Partial<LearnerMapTarget> = {}): LearnerMapTarget {
    return {
        targetId: 'T1',
        title: 'Target 1',
        displayTargetMax: '4',
        cells: [makeCell()],
        ...overrides,
    };
}

describe('targetThreadsShared', () => {
    it('formats bead score text from display score', () => {
        expect(beadScoreText(makeCell({ rawScore: 4, displayScoreWithMax: '4/4' }))).toBe('4');
        expect(beadScoreText(makeCell({ rawScore: null, isUnscored: true }))).toBe('—');
    });

    it('selects the last cycle as latest', () => {
        expect(
            latestCycleId([
                { cycleId: 'c1', cycleNumber: 1, cycleStatus: null },
                { cycleId: 'c2', cycleNumber: 2, cycleStatus: null },
            ])
        ).toBe('c2');
    });
});

describe('threadsLayout', () => {
    it('resolves thread labels from real target identity', () => {
        expect(resolveThreadDisplayLabel(makeTarget({ targetId: 'D1T3', title: 'Target 1.3' }), 2)).toEqual({
            primary: 'A3',
            fullTitle: 'Target 1.3',
        });

        expect(
            resolveThreadDisplayLabel(
                makeTarget({ targetId: 'ECHO_12', title: 'Echoic imitation' }),
                11
            )
        ).toEqual({
            primary: 'ECHO_12',
            fullTitle: 'Echoic imitation',
        });

        expect(
            resolveThreadDisplayLabel(makeTarget({ targetId: 'DOM_1_T04', title: 'Cooperation A4' }), 3)
        ).toEqual({
            primary: 'A4',
            fullTitle: 'Cooperation A4',
        });
    });

    it('selects dense layout tier for large assessments', () => {
        const profile = buildAssessmentSnapshotProfile(
            buildLearnerMapProfile({
                assessment: {
                    id: 'a1',
                    pack_snapshot: {
                        pack_id: 'p1',
                        org_id: 'o1',
                        title: 'Large Pack',
                        description: '',
                        version: '1',
                        domains: Array.from({ length: 8 }, (_, domainIndex) => ({
                            domain_id: `D${domainIndex + 1}`,
                            title: `Domain ${domainIndex + 1}`,
                            targets: Array.from({ length: 12 }, (_, targetIndex) => ({
                                target_id: `D${domainIndex + 1}T${targetIndex + 1}`,
                                title: `Target ${domainIndex + 1}.${targetIndex + 1}`,
                                success_criteria: '',
                                materials: '',
                                scoring: {
                                    type: 'numeric',
                                    scale: [0, 1, 2, 3, 4],
                                    scale_labels: {},
                                    no_opportunity_allowed: false,
                                },
                            })),
                        })),
                    },
                },
                cycles: Array.from({ length: 6 }, (_, index) => ({
                    cycle: { id: `c${index + 1}`, cycle_number: index + 1, status: 'closed' },
                    scores: [],
                })),
            })
        );

        expect(resolveThreadsLayoutTier(profile)).toBe('dense');
    });
});
