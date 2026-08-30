import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    matrixHeaderShowsApproveInMore,
    matrixHeaderShowsSubmit,
    resolveMatrixHeaderMode,
    shouldShowNewCycleAction,
    type MatrixHeaderModeInput,
} from './assessmentMatrixHeaderModes';

const root = dirname(fileURLToPath(import.meta.url));

function base(overrides: Partial<MatrixHeaderModeInput> = {}): MatrixHeaderModeInput {
    return {
        assessmentStatus: 'in_progress',
        cycleStatus: 'in_progress',
        role: 'therapist',
        scoresLoadState: 'loaded',
        pendingSaveCount: 0,
        failedSaveTargetIds: [],
        ...overrides,
    };
}

describe('resolveMatrixHeaderMode M1–M8', () => {
    it('M1 — active scoring when draft or in_progress, cycle open, not viewer, scores loaded', () => {
        expect(resolveMatrixHeaderMode(base())).toBe('M1');
        expect(resolveMatrixHeaderMode(base({ assessmentStatus: 'draft' }))).toBe('M1');
        expect(resolveMatrixHeaderMode(base({ role: 'admin' }))).toBe('M1');
        expect(matrixHeaderShowsSubmit('M1')).toBe(true);
    });

    it('M2 — active scoring blocked by load, pending saves, or failed saves', () => {
        expect(resolveMatrixHeaderMode(base({ scoresLoadState: 'loading' }))).toBe('M2');
        expect(resolveMatrixHeaderMode(base({ scoresLoadState: 'error' }))).toBe('M2');
        expect(resolveMatrixHeaderMode(base({ pendingSaveCount: 1 }))).toBe('M2');
        expect(resolveMatrixHeaderMode(base({ failedSaveTargetIds: ['T1'] }))).toBe('M2');
        expect(matrixHeaderShowsSubmit('M2')).toBe(true);
    });

    it('M3 — view only for viewer (and submitted viewer)', () => {
        expect(resolveMatrixHeaderMode(base({ role: 'viewer' }))).toBe('M3');
        expect(
            resolveMatrixHeaderMode(base({ assessmentStatus: 'submitted', role: 'viewer' }))
        ).toBe('M3');
        expect(matrixHeaderShowsSubmit('M3')).toBe(false);
    });

    it('M4 — historical locked cycle even if the assessment is still active', () => {
        expect(resolveMatrixHeaderMode(base({ cycleStatus: 'locked' }))).toBe('M4');
        expect(matrixHeaderShowsSubmit('M4')).toBe(false);
    });

    it('M5 — submitted therapist, cycle in progress: no Submit, no Approve', () => {
        expect(
            resolveMatrixHeaderMode(base({ assessmentStatus: 'submitted', role: 'therapist' }))
        ).toBe('M5');
        expect(matrixHeaderShowsSubmit('M5')).toBe(false);
        expect(matrixHeaderShowsApproveInMore('M5')).toBe(false);
    });

    it('M6 — submitted senior/admin review: Approve in More, no Submit', () => {
        expect(
            resolveMatrixHeaderMode(
                base({ assessmentStatus: 'submitted', role: 'senior_therapist' })
            )
        ).toBe('M6');
        expect(
            resolveMatrixHeaderMode(base({ assessmentStatus: 'submitted', role: 'admin' }))
        ).toBe('M6');
        expect(matrixHeaderShowsSubmit('M6')).toBe(false);
        expect(matrixHeaderShowsApproveInMore('M6')).toBe(true);
    });

    it('M7 — approved locked: no Submit; New Cycle is a separate More gate', () => {
        expect(resolveMatrixHeaderMode(base({ assessmentStatus: 'approved' }))).toBe('M7');
        expect(
            resolveMatrixHeaderMode(base({ assessmentStatus: 'approved', role: 'admin' }))
        ).toBe('M7');
        expect(matrixHeaderShowsSubmit('M7')).toBe(false);
    });

    it('M8 aliases M1 after New Cycle returns the assessment to in_progress', () => {
        expect(
            resolveMatrixHeaderMode(
                base({
                    assessmentStatus: 'in_progress',
                    cycleStatus: 'in_progress',
                    role: 'admin',
                })
            )
        ).toBe('M1');
    });

    it('approved wins over a locked cycle so M7 is not displaced by M4', () => {
        expect(
            resolveMatrixHeaderMode(
                base({ assessmentStatus: 'approved', cycleStatus: 'locked', role: 'admin' })
            )
        ).toBe('M7');
    });
});

describe('New Cycle UI gate agrees with startNewCycle', () => {
    it('shows New Cycle only when approved and admin or senior_therapist', () => {
        expect(shouldShowNewCycleAction('approved', 'admin')).toBe(true);
        expect(shouldShowNewCycleAction('approved', 'senior_therapist')).toBe(true);
        expect(shouldShowNewCycleAction('approved', 'therapist')).toBe(false);
        expect(shouldShowNewCycleAction('approved', 'viewer')).toBe(false);
        expect(shouldShowNewCycleAction('in_progress', 'admin')).toBe(false);
        expect(shouldShowNewCycleAction('submitted', 'admin')).toBe(false);
        expect(shouldShowNewCycleAction('draft', 'senior_therapist')).toBe(false);
    });

    it('matches the service-layer approved check rather than inventing a second gate', () => {
        const service = readFileSync(resolve(root, '../services/assessments.ts'), 'utf8');
        expect(service).toMatch(/async startNewCycle\(/);
        expect(service).toMatch(/assessmentData\?\.status !== 'approved'/);
    });
});
