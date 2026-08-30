/**
 * Matrix header modes M1–M8 — pure resolver from status, cycle, role, and load.
 * Binding: docs/architecture/assessment_matrix_header_hierarchy_contract.md §3–§4.
 *
 * M8 (post–new-cycle scoring) is observationally identical to M1: after
 * startNewCycle the assessment returns to in_progress with a new in_progress
 * cycle, so this resolver returns M1.
 */

export type MatrixHeaderMode = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7';

export type MatrixScoresLoadState = 'loading' | 'loaded' | 'error';

export interface MatrixHeaderModeInput {
    assessmentStatus: string | null | undefined;
    cycleStatus: string | null | undefined;
    role: string | null | undefined;
    scoresLoadState: MatrixScoresLoadState;
    pendingSaveCount?: number;
    failedSaveTargetIds?: readonly string[];
}

function isAdminOrSenior(role: string | null | undefined): boolean {
    return role === 'admin' || role === 'senior_therapist';
}

function scoringSessionIsBlocked(input: MatrixHeaderModeInput): boolean {
    if (input.scoresLoadState !== 'loaded') {
        return true;
    }
    if ((input.pendingSaveCount ?? 0) > 0) {
        return true;
    }
    return (input.failedSaveTargetIds?.length ?? 0) > 0;
}

export function resolveMatrixHeaderMode(input: MatrixHeaderModeInput): MatrixHeaderMode {
    const status = input.assessmentStatus ?? '';
    const cycleLocked = input.cycleStatus != null && input.cycleStatus !== 'in_progress';
    const role = input.role ?? '';

    if (status === 'approved') {
        return 'M7';
    }

    if (cycleLocked) {
        return 'M4';
    }

    if (status === 'submitted') {
        if (isAdminOrSenior(role)) {
            return 'M6';
        }
        if (role === 'therapist') {
            return 'M5';
        }
        return 'M3';
    }

    if (role === 'viewer') {
        return 'M3';
    }

    if (status === 'draft' || status === 'in_progress') {
        return scoringSessionIsBlocked(input) ? 'M2' : 'M1';
    }

    return 'M3';
}

/** Submit is the header filled primary in M1 (enabled) and M2 (visible, disabled). */
export function matrixHeaderShowsSubmit(mode: MatrixHeaderMode): boolean {
    return mode === 'M1' || mode === 'M2';
}

/** Approve is the header filled primary in M6 only — strip, never More. */
export function matrixHeaderShowsApprove(mode: MatrixHeaderMode): boolean {
    return mode === 'M6';
}

/**
 * New Cycle UI gate — must match startNewCycle (service requires approved).
 * Role: admin | senior_therapist. Placement: More only.
 */
export function shouldShowNewCycleAction(
    assessmentStatus: string | null | undefined,
    role: string | null | undefined
): boolean {
    return assessmentStatus === 'approved' && isAdminOrSenior(role);
}
