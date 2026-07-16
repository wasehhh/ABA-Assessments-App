import { describe, expect, it } from 'vitest';
import { LearnerMapCell } from '../../../services/learnerMapProfile';
import { resolveBeadSurfaceText, resolveThreadLabelDisplay } from './snapshotThreadDisplay';
import { resolveThreadDisplayLabel } from './threadsLayout';

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

describe('snapshotThreadDisplay', () => {
    it('shows code only — never a visible subtitle', () => {
        const screen = resolveThreadLabelDisplay(
            { targetId: 'ECHO_12', title: 'Echoic imitation' },
            0,
            'screen'
        );
        const print = resolveThreadLabelDisplay(
            { targetId: 'ECHO_12', title: 'Echoic imitation' },
            0,
            'print'
        );

        expect(screen.visibleCode).toBe('ECHO_12');
        expect(screen.showSubtitle).toBe(false);
        expect(screen.subtitle).toBeNull();
        expect(print.showSubtitle).toBe(false);
        expect(print.subtitle).toBeNull();
        expect(print.visibleCode).toBe('ECHO_12');
    });

    it('keeps the full title in tooltip / accessibility copy', () => {
        const label = resolveThreadLabelDisplay(
            { targetId: 'A1', title: 'Take a reinforcer when offered' },
            0,
            'screen'
        );

        expect(label.accessibleLabel).toBe('A1 — Take a reinforcer when offered');
        expect(label.fullTitle).toBe('Take a reinforcer when offered');
        expect(label.accessibleLabel).toContain('Take a reinforcer when offered');
    });

    it('preserves AFLS identity when codes are long', () => {
        const a = resolveThreadLabelDisplay(
            { targetId: 'AFLS_1', title: 'Grooming skill 1' },
            0,
            'screen'
        );
        const b = resolveThreadLabelDisplay(
            { targetId: 'AFLS_205', title: 'Grooming skill 205' },
            204,
            'screen'
        );

        expect(a.visibleCode).not.toBe(b.visibleCode);
        expect(a.visibleCode).toContain('1');
        expect(b.visibleCode).toContain('205');
        expect(a.accessibleLabel).toContain('AFLS_1');
        expect(b.accessibleLabel).toContain('AFLS_205');
    });

    it('uses positional fallback instead of a long description as the visible code', () => {
        const label = resolveThreadLabelDisplay(
            {
                targetId: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
                title: 'A very long clinical description that must never become the row label',
            },
            4,
            'screen'
        );

        expect(label.visibleCode).not.toMatch(/very long clinical/i);
        expect(label.visibleCode).not.toMatch(/a1b2c3d4/i);
        expect(label.visibleCode.length).toBeLessThanOrEqual(10);
        expect(label.accessibleLabel).toContain(
            'A very long clinical description that must never become the row label'
        );
    });

    it('keeps unique visible codes for peers in a domain', () => {
        const targets = [
            { targetId: 'D1T1', title: 'Target 1.1' },
            { targetId: 'D1T2', title: 'Target 1.2' },
            { targetId: 'D1T3', title: 'Target 1.3' },
        ];
        const codes = targets.map((target, index) =>
            resolveThreadLabelDisplay(target, index, 'screen').visibleCode
        );
        expect(new Set(codes).size).toBe(codes.length);
        expect(codes).toEqual(['A1', 'A2', 'A3']);
    });

    it('renders numeric bead text from raw scores', () => {
        expect(resolveBeadSurfaceText(makeCell({ rawScore: 4, displayScoreWithMax: '4/4' }))).toBe(
            '4'
        );
    });

    it('falls back to compact label text for non-numeric display values', () => {
        expect(
            resolveBeadSurfaceText(
                makeCell({
                    rawScore: 1,
                    displayScoreWithMax: 'Yes/1',
                })
            )
        ).toBe('Y');
    });

    it('keeps unscored beads as em dash', () => {
        expect(
            resolveBeadSurfaceText(
                makeCell({
                    rawScore: null,
                    isUnscored: true,
                    displayScoreWithMax: '—',
                    competencyState: 'unscored',
                })
            )
        ).toBe('—');
    });

    it('does not mutate target identity input when resolving labels', () => {
        const target = { targetId: 'M3', title: 'Mand 3' };
        const frozen = JSON.stringify(target);
        resolveThreadLabelDisplay(target, 2, 'screen');
        resolveThreadDisplayLabel(
            { ...target, displayTargetMax: '4', cells: [] },
            2
        );
        expect(JSON.stringify(target)).toBe(frozen);
    });
});
