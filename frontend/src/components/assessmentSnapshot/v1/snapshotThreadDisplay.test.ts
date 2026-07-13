import { describe, expect, it } from 'vitest';
import { LearnerMapCell } from '../../../services/learnerMapProfile';
import {
    resolveBeadSurfaceText,
    resolveThreadLabelDisplay,
    shortenThreadTitle,
} from './snapshotThreadDisplay';

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
    it('shortens long titles for compact display', () => {
        expect(shortenThreadTitle('Echoic imitation with long descriptor', 18)).toBe(
            'Echoic imitation …'
        );
    });

    it('resolves short codes for screen and print modes', () => {
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

        expect(screen.code).toBe('ECHO_12');
        expect(print.code).toBe('ECHO_12');
        expect(print.accessibleLabel).toContain('ECHO_12');
        expect(print.accessibleLabel).toContain('Echoic imitation');
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
});
