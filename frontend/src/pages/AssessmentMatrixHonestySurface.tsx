import { Save } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CycleScoresLoadState } from './assessmentMatrixSaveHonesty';

interface SubmitControlProps {
    showSubmitAssessmentButton: boolean;
    submitControlDisabled: boolean;
    submitDisabledReason: string | null;
    onSubmit: () => void;
}

export function AssessmentMatrixSubmitControl({
    showSubmitAssessmentButton,
    submitControlDisabled,
    submitDisabledReason,
    onSubmit,
}: SubmitControlProps) {
    if (!showSubmitAssessmentButton) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={onSubmit}
            disabled={submitControlDisabled}
            title={submitDisabledReason ?? undefined}
            aria-label={
                submitDisabledReason
                    ? `Submit assessment — ${submitDisabledReason}`
                    : 'Submit assessment'
            }
            data-matrix-submit-assessment
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                submitControlDisabled
                    ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
        >
            <Save className="w-4 h-4" aria-hidden />
            Submit
        </button>
    );
}

interface ScoresMainPanelProps {
    cycleScoresLoadState: CycleScoresLoadState;
    cycleScoresLoadError: string | null;
    onRetryLoad: () => void;
    activeDomainId: string | null;
    overview: ReactNode;
    scoreboard: ReactNode;
}

export function AssessmentMatrixScoresMainPanel({
    cycleScoresLoadState,
    cycleScoresLoadError,
    onRetryLoad,
    activeDomainId,
    overview,
    scoreboard,
}: ScoresMainPanelProps) {
    if (cycleScoresLoadState === 'loading') {
        return (
            <div
                className="flex flex-col items-center justify-center py-24 text-gray-600"
                data-matrix-scores-loading
            >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4" />
                <p className="text-sm font-medium">Loading cycle scores…</p>
            </div>
        );
    }

    if (cycleScoresLoadState === 'error') {
        return (
            <div
                className="rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-lg mx-auto"
                data-assessment-matrix-scores-load-error
            >
                <h2 className="text-lg font-semibold text-red-900 mb-2">
                    Scores could not be loaded
                </h2>
                <p className="text-sm text-red-800 mb-6 leading-relaxed">
                    {cycleScoresLoadError ??
                        'Recorded scores for this cycle are unavailable. Score entry is blocked so a blank grid is not mistaken for an unscored assessment.'}
                </p>
                <button
                    type="button"
                    onClick={onRetryLoad}
                    className="inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                >
                    Retry loading scores
                </button>
            </div>
        );
    }

    if (!activeDomainId) {
        return <>{overview}</>;
    }

    return <>{scoreboard}</>;
}

/** Combined surface for component-level honesty tests. */
export function AssessmentMatrixHonestySurface(
    props: SubmitControlProps &
        ScoresMainPanelProps & {
            mainClassName?: string;
        }
) {
    const { mainClassName = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8', ...rest } = props;
    return (
        <>
            <AssessmentMatrixSubmitControl
                showSubmitAssessmentButton={rest.showSubmitAssessmentButton}
                submitControlDisabled={rest.submitControlDisabled}
                submitDisabledReason={rest.submitDisabledReason}
                onSubmit={rest.onSubmit}
            />
            <main className={mainClassName}>
                <AssessmentMatrixScoresMainPanel
                    cycleScoresLoadState={rest.cycleScoresLoadState}
                    cycleScoresLoadError={rest.cycleScoresLoadError}
                    onRetryLoad={rest.onRetryLoad}
                    activeDomainId={rest.activeDomainId}
                    overview={rest.overview}
                    scoreboard={rest.scoreboard}
                />
            </main>
        </>
    );
}
