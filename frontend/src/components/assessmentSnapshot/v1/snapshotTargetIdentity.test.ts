import { describe, expect, it } from 'vitest';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { getAssessmentSnapshotStressScenario } from '../../../pages/dev/assessmentSnapshotMockData';
import {
    compactStructuredTargetId,
    disambiguateVisibleCodes,
    isUnusableAuthoredTargetId,
    resolveThreadDisplayLabel,
} from './snapshotTargetIdentity';
import {
    resolveThreadLabelDisplay,
    resolveZoneThreadLabelDisplays,
} from './snapshotThreadDisplay';

describe('snapshotTargetIdentity (PR13.5B)', () => {
    it('lets structured targetId win over a title-derived numeric suffix', () => {
        const label = resolveThreadDisplayLabel(
            {
                targetId: 'L1_LISTENER_RESPONDING_1',
                title: 'Listener Responding milestone 1',
            },
            0
        );

        expect(label.primary).not.toBe('1');
        expect(label.primary).not.toMatch(/^…?1$/);
        expect(label.primary).toBe('L1-LR-1');
        expect(label.accessibilityIdentity).toBe('L1_LISTENER_RESPONDING_1');
    });

    it('compacts long structured IDs while preserving prefix and suffix', () => {
        expect(compactStructuredTargetId('L1_LISTENER_RESPONDING_1')).toBe('L1-LR-1');
        expect(compactStructuredTargetId('L1_VISUAL_PERFORMANCE_3')).toBe('L1-VP-3');
        expect(compactStructuredTargetId('L2_INTRAVERBAL_4')).toBe('L2-INT-4');
        // Shorter structured IDs that fit the column stay intact; 11+ char IDs compact.
        expect(resolveThreadDisplayLabel({ targetId: 'L1_MAND_1', title: 'Mand 1' }, 0).primary).toBe(
            'L1_MAND_1'
        );
        expect(
            resolveThreadDisplayLabel({ targetId: 'L1_SOCIAL_2', title: 'Social 2' }, 0).primary
        ).toBe('L1-SOC-2');
    });

    it('keeps full authored ID in tooltip / aria when the visible code is compacted', () => {
        const label = resolveThreadLabelDisplay(
            {
                targetId: 'L1_LISTENER_RESPONDING_1',
                title: 'Listener Responding milestone 1',
            },
            0,
            'screen'
        );

        expect(label.visibleCode).toBe('L1-LR-1');
        expect(label.accessibleLabel).toBe(
            'L1_LISTENER_RESPONDING_1 — Listener Responding milestone 1'
        );
        expect(label.accessibleLabel).toContain('L1_LISTENER_RESPONDING_1');
        expect(label.accessibleLabel.startsWith('L1-LR-1')).toBe(false);
    });

    it('uses safe fallback for UUID-like IDs without exposing the UUID as the visible code', () => {
        const uuid = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
        const label = resolveThreadLabelDisplay(
            {
                targetId: uuid,
                title: 'Take reinforcer when offered',
            },
            3,
            'screen'
        );

        expect(isUnusableAuthoredTargetId(uuid)).toBe(true);
        expect(label.visibleCode).not.toBe(uuid);
        expect(label.visibleCode).not.toMatch(/a1b2c3d4/i);
        expect(label.accessibleLabel).toContain('Take reinforcer when offered');
    });

    it('disambiguates duplicate visible codes within a zone deterministically', () => {
        expect(disambiguateVisibleCodes(['LR1', 'LR1', 'A1', 'LR1'])).toEqual([
            'LR1',
            'LR1-2',
            'A1',
            'LR1-3',
        ]);

        const zone = resolveZoneThreadLabelDisplays(
            [
                { targetId: 'L1_MOTOR_SKILL_1', title: 'Motor 1' },
                { targetId: 'L1_MEMORY_SKILL_1', title: 'Memory 1' },
            ],
            'screen'
        );
        expect(zone[0]!.visibleCode).toBe('L1-MS-1');
        expect(zone[1]!.visibleCode).toBe('L1-MS-1-2');

        const colliding = resolveZoneThreadLabelDisplays(
            [
                {
                    targetId: 'L1_LISTENER_RESPONDING_1',
                    title: 'Listener 1',
                },
                {
                    targetId: 'L1_LISTENER_READING_1',
                    title: 'Reading 1',
                },
            ],
            'screen'
        );
        expect(colliding[0]!.visibleCode).toBe('L1-LR-1');
        expect(colliding[1]!.visibleCode).toBe('L1-LR-1-2');
    });

    it('preserves Alpha, AFLS, PEAK, ABLLS-style, and Extreme short codes', () => {
        expect(
            resolveThreadLabelDisplay({ targetId: 'D1T1', title: 'Target 1.1' }, 0, 'screen')
                .visibleCode
        ).toBe('A1');
        expect(
            resolveThreadLabelDisplay({ targetId: 'AFLS_205', title: 'Skill 205' }, 204, 'screen')
                .visibleCode
        ).toBe('AFLS_205');
        expect(
            resolveThreadLabelDisplay({ targetId: 'P184', title: 'Peak item 184' }, 183, 'screen')
                .visibleCode
        ).toBe('P184');
        expect(
            resolveThreadLabelDisplay({ targetId: 'X250', title: 'Extreme 250' }, 249, 'screen')
                .visibleCode
        ).toBe('X250');
        expect(
            resolveThreadLabelDisplay(
                { targetId: 'DOM_1_T04', title: 'Cooperation A4' },
                3,
                'screen'
            ).visibleCode
        ).toBe('A4');
        expect(
            resolveThreadLabelDisplay({ targetId: '11', title: 'Mand 11' }, 0, 'screen').visibleCode
        ).toBe('11');
        expect(
            resolveThreadLabelDisplay({ targetId: 'ECHO_12', title: 'Echoic' }, 0, 'screen')
                .visibleCode
        ).toBe('ECHO_12');
    });

    it('keeps VB-MAPP-like fixture codes meaningful and unique per secondary zone', () => {
        const scenario = getAssessmentSnapshotStressScenario('vb-mapp-like');
        const profile = buildAssessmentSnapshotProfile(scenario.profile);
        const level1 = profile.domains.find((domain) => domain.domainId === 'L1');
        expect(level1?.targetSections?.length).toBeGreaterThan(0);

        for (const section of level1!.targetSections ?? []) {
            const labels = resolveZoneThreadLabelDisplays(section.targets, 'screen');
            const codes = labels.map((label) => label.visibleCode);
            expect(new Set(codes).size).toBe(codes.length);

            for (let index = 0; index < labels.length; index += 1) {
                const label = labels[index]!;
                const target = section.targets[index]!;
                expect(label.visibleCode).not.toMatch(/^…?\d+$/);
                expect(label.visibleCode.length).toBeGreaterThan(1);
                expect(label.accessibleLabel).toContain(target.targetId);
                expect(label.accessibleLabel).toContain(target.title);
            }
        }
    });

    it('does not mutate target identity inputs', () => {
        const target = {
            targetId: 'L1_LISTENER_RESPONDING_1',
            title: 'Listener Responding milestone 1',
        };
        const frozen = JSON.stringify(target);
        resolveThreadDisplayLabel(target, 0);
        resolveThreadLabelDisplay(target, 0, 'print');
        resolveZoneThreadLabelDisplays([target, { ...target, targetId: 'L1_SOCIAL_2' }], 'screen');
        expect(JSON.stringify(target)).toBe(frozen);
    });
});
