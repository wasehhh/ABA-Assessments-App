import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MatrixContextRow } from '../components/assessment/MatrixContextRow';
import { MatrixHeaderMoreMenu } from '../components/assessment/MatrixHeaderMoreMenu';
import { MATRIX_ACTION_MARKERS } from './assessmentMatrixOverviewContract';
import {
    matrixHeaderShowsApprove,
    matrixHeaderShowsSubmit,
    resolveMatrixHeaderMode,
    shouldShowNewCycleAction,
    type MatrixHeaderModeInput,
} from './assessmentMatrixHeaderModes';
import {
    AssessmentMatrixApproveControl,
    AssessmentMatrixSubmitControl,
    MATRIX_HEADER_FILLED_ACCENT_CLASS,
} from './AssessmentMatrixHonestySurface';
import { evaluateSubmitGate } from './assessmentMatrixSaveHonesty';

const root = dirname(fileURLToPath(import.meta.url));
const matrixSource = readFileSync(resolve(root, './AssessmentMatrix.tsx'), 'utf8');
const moreMenuSource = readFileSync(
    resolve(root, '../components/assessment/MatrixHeaderMoreMenu.tsx'),
    'utf8'
);

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

function noop() {}

function renderM6PrimaryStrip() {
    return renderToStaticMarkup(
        createElement(
            'header',
            { 'data-matrix-header-primary-strip': true },
            createElement(AssessmentMatrixSubmitControl, {
                showSubmitAssessmentButton: false,
                submitControlDisabled: false,
                submitDisabledReason: null,
                onSubmit: noop,
            }),
            createElement(AssessmentMatrixApproveControl, {
                showApproveAssessmentButton: matrixHeaderShowsApprove('M6'),
                onApprove: noop,
            }),
            createElement(MatrixHeaderMoreMenu, {
                showNewCycle: shouldShowNewCycleAction('submitted', 'admin'),
                onNewCycle: noop,
                showSnapshot: true,
                onSnapshot: noop,
                showWriteReport: false,
                onWriteReport: noop,
                showCommunicationReport: false,
                onCommunicationReport: noop,
                onExportMatrix: noop,
                onExportAnalytics: noop,
                onLearnerMap: noop,
            })
        )
    );
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
        expect(matrixHeaderShowsApprove('M5')).toBe(false);
    });

    it('M6 — submitted senior/admin review: Approve in the header primary strip, no Submit', () => {
        expect(
            resolveMatrixHeaderMode(
                base({ assessmentStatus: 'submitted', role: 'senior_therapist' })
            )
        ).toBe('M6');
        expect(
            resolveMatrixHeaderMode(base({ assessmentStatus: 'submitted', role: 'admin' }))
        ).toBe('M6');
        expect(matrixHeaderShowsSubmit('M6')).toBe(false);
        expect(matrixHeaderShowsApprove('M6')).toBe(true);
    });

    it('M7 — approved locked: no Submit; New Cycle is a separate More gate', () => {
        expect(resolveMatrixHeaderMode(base({ assessmentStatus: 'approved' }))).toBe('M7');
        expect(
            resolveMatrixHeaderMode(base({ assessmentStatus: 'approved', role: 'admin' }))
        ).toBe('M7');
        expect(matrixHeaderShowsSubmit('M7')).toBe(false);
        expect(matrixHeaderShowsApprove('M7')).toBe(false);
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

describe('M6 Approve is the filled accent in the header primary strip', () => {
    it('renders exactly one filled accent commit control, it is Approve, and it is in the strip', () => {
        const markup = renderM6PrimaryStrip();
        const filledCount = markup.split(MATRIX_HEADER_FILLED_ACCENT_CLASS).length - 1;

        expect(filledCount).toBe(1);
        expect(markup).toContain('data-matrix-header-primary-strip');
        expect(markup).toContain('data-matrix-approve-assessment');
        expect(markup).not.toContain('data-matrix-submit-assessment');
        expect(markup).toContain('aria-label="Approve assessment"');

        const approveIndex = markup.indexOf('data-matrix-approve-assessment');
        const filledIndex = markup.indexOf(MATRIX_HEADER_FILLED_ACCENT_CLASS);
        expect(approveIndex).toBeGreaterThanOrEqual(0);
        expect(filledIndex).toBeGreaterThanOrEqual(0);
        expect(Math.abs(approveIndex - filledIndex)).toBeLessThan(200);

        const headerBlock = matrixSource.match(
            /data-matrix-header-primary-strip[\s\S]*?<\/header>/
        );
        expect(headerBlock).not.toBeNull();
        expect(headerBlock![0]).toContain('AssessmentMatrixApproveControl');
        expect(headerBlock![0]).toContain(
            'showApproveAssessmentButton={showApproveInStrip}'
        );
        expect(headerBlock![0]).toContain('onApprove={handleApprove}');
        expect(matrixSource).not.toMatch(/showApprove=/);
        expect(matrixSource).not.toContain('matrixHeaderShowsApproveInMore');
    });

    it("M6's More contains Documents, Export and Learner Map and no Workflow group or group header", () => {
        expect(moreMenuSource).not.toContain('Workflow');
        expect(moreMenuSource).not.toContain('title="Workflow"');
        expect(moreMenuSource).toContain('title="Documents"');
        expect(moreMenuSource).toContain('Export');
        expect(moreMenuSource).toContain('MATRIX_ACTION_MARKERS.learnerMapLabel');
        expect(MATRIX_ACTION_MARKERS.learnerMapLabel).toBe('Learner Map');
        expect(moreMenuSource).not.toContain('data-matrix-approve-assessment');
        expect(moreMenuSource).not.toContain('onApprove');

        expect(shouldShowNewCycleAction('submitted', 'admin')).toBe(false);
        expect(matrixSource).toContain('showNewCycle={showNewCycleInMore}');
        expect(matrixSource).toContain('showSnapshot={showAssessmentSnapshotEntry}');
        expect(matrixSource).toContain('onExportMatrix');
        expect(matrixSource).toContain('onLearnerMap');
    });
});

describe('M7 More grouping is unchanged', () => {
    it("M7's More still contains New Cycle first under Lifecycle", () => {
        expect(shouldShowNewCycleAction('approved', 'admin')).toBe(true);
        expect(shouldShowNewCycleAction('approved', 'senior_therapist')).toBe(true);

        const lifecycle = moreMenuSource.match(
            /<MenuSection title="Lifecycle">([\s\S]*?)<\/MenuSection>/
        );
        expect(lifecycle).not.toBeNull();
        expect(lifecycle![1]).toContain('label="New Cycle"');
        expect(lifecycle![1]).toContain('data-matrix-new-cycle');
        expect(lifecycle![1].indexOf('label="New Cycle"')).toBe(
            lifecycle![1].indexOf('label="')
        );

        const lifecycleIndex = moreMenuSource.indexOf('title="Lifecycle"');
        const documentsIndex = moreMenuSource.indexOf('title="Documents"');
        expect(lifecycleIndex).toBeGreaterThanOrEqual(0);
        expect(documentsIndex).toBeGreaterThan(lifecycleIndex);
        expect(matrixSource).toContain('showNewCycle={showNewCycleInMore}');
    });
});

describe('M2 disable reason is visible in the context row', () => {
    it('renders the gate reason as visible text and uses that same string for the Submit accessible name', () => {
        const sourceString = evaluateSubmitGate({
            pendingSaveCount: 1,
            failedSaveTargetIds: [],
            isSubmitting: false,
            cannotSubmitAssessment: false,
            isViewer: false,
            cycleScoresLoadState: 'loaded',
        }).reason;
        expect(sourceString).toBe(
            'Scores are still saving. Wait for saves to finish before submitting.'
        );

        const rowMarkup = renderToStaticMarkup(
            createElement(MatrixContextRow, {
                cycles: [],
                viewingCycleId: null,
                compareCycleId: null,
                onCompareCycleChange: vi.fn(),
                comparisonError: null,
                submitDisabledReason: sourceString,
            })
        );
        const submitMarkup = renderToStaticMarkup(
            createElement(AssessmentMatrixSubmitControl, {
                showSubmitAssessmentButton: true,
                submitControlDisabled: true,
                submitDisabledReason: sourceString,
                onSubmit: vi.fn(),
            })
        );

        expect(rowMarkup).toContain('data-matrix-context-row');
        const visible = rowMarkup.match(
            /data-matrix-submit-disable-reason[^>]*>([^<]*)</
        );
        expect(visible).not.toBeNull();
        expect(visible![1]).toBe(sourceString);
        expect(rowMarkup).not.toContain('Saving…');

        expect(submitMarkup).toContain(`aria-label="Submit assessment — ${sourceString}"`);
        expect(submitMarkup).toContain(`title="${sourceString}"`);

        const reasonPasses = matrixSource.match(
            /submitDisabledReason=\{submitDisabledReason\}/g
        );
        expect(reasonPasses).not.toBeNull();
        expect(reasonPasses!.length).toBe(2);
    });
});

describe('header save-error strip indicator', () => {
    it('renders exactly "Save failed" in the sticky strip error state', () => {
        const errorIndicator = matrixSource.match(
            /saveStatus === 'error' && \(\s*<span className="font-medium text-red-600">([^<]*)<\/span>/
        );
        expect(errorIndicator).not.toBeNull();
        expect(errorIndicator![1]).toBe('Save failed');
        expect(matrixSource).not.toContain('Save failed — check alert');
        expect(matrixSource).not.toContain('check alert');

        expect(matrixSource).toContain(
            "Saving{pendingSaveCount > 1 ? ` (${pendingSaveCount})` : ''}..."
        );
        expect(matrixSource).toContain(
            '<CheckCircle className="h-3 w-3" /> Saved</span>'
        );
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
