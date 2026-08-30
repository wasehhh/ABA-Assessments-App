import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DomainScoreboard } from '../components/assessment/DomainScoreboard';
import { ContentPackData, Domain, StructureLabels } from '../types';
import { resolveSubmitControlState } from './assessmentMatrixSaveHonesty';
import { AssessmentMatrixHonestySurface } from './AssessmentMatrixHonestySurface';

const structureLabels: StructureLabels = {
    primary_group: 'Section',
    secondary_group: 'Subsection',
    target: 'Target',
};

const pack: ContentPackData = {
    pack_id: 'p1',
    org_id: 'o1',
    title: 'Pack',
    description: '',
    version: '1',
    domains: [
        {
            domain_id: 'A',
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

const domain: Domain = pack.domains[0];

function renderHonestySurface(
    cycleScoresLoadState: 'loading' | 'loaded' | 'error',
    options?: {
        activeDomainId?: string | null;
        scores?: { target_id: string; score: number | null }[];
    }
) {
    const activeDomainId =
        options?.activeDomainId === undefined ? 'A' : options.activeDomainId;
    const scores = options?.scores ?? [];

    const submitGateInput = {
        pendingSaveCount: 0,
        failedSaveTargetIds: [] as string[],
        isSubmitting: false,
        cannotSubmitAssessment: false,
        isViewer: false,
        cycleScoresLoadState,
        showSubmitAssessmentButton: true,
    };
    const submitControl = resolveSubmitControlState(submitGateInput);

    return renderToStaticMarkup(
        createElement(AssessmentMatrixHonestySurface, {
            ...submitGateInput,
            submitControlDisabled: submitControl.disabled,
            submitDisabledReason: submitControl.reason,
            onSubmit: vi.fn(),
            cycleScoresLoadError:
                cycleScoresLoadState === 'error'
                    ? 'Scores for this cycle could not be loaded.'
                    : null,
            onRetryLoad: vi.fn(),
            activeDomainId,
            overview: createElement('div', { 'data-test-overview': true }, 'Overview'),
            scoreboard: createElement(DomainScoreboard, {
                domain,
                pack,
                structureLabels,
                scores,
                previousScores: [],
                onScoreUpdate: vi.fn(),
                onViewDetail: vi.fn(),
                onBack: vi.fn(),
                onNavigateDomain: vi.fn(),
                isFirstDomain: true,
                isLastDomain: true,
                scoresEditable: cycleScoresLoadState === 'loaded',
            }),
        })
    );
}

describe('AssessmentMatrixHonestySurface load-failure honesty', () => {
    it('renders no scoring UI in markup when primary cycle scores failed to load', () => {
        const markup = renderHonestySurface('error');

        expect(markup).not.toContain('data-matrix-target-score-controls');
        expect(markup).not.toContain('data-matrix-domain-scoreboard');
        expect(markup).toContain('data-assessment-matrix-scores-load-error');
        expect(markup).toContain('disabled=""');
        expect(markup).toContain('data-matrix-submit-assessment');
        expect(markup).not.toContain('data-matrix-footer-submit');
    });

    it('renders the normal scoreboard grid when scores loaded successfully with zero rows', () => {
        const markup = renderHonestySurface('loaded', { scores: [] });

        expect(markup).toContain('data-matrix-domain-scoreboard');
        expect(markup).toContain('data-matrix-target-score-controls');
        expect(markup).not.toContain('data-assessment-matrix-scores-load-error');
    });

    it('places Submit only in the header and never couples it to the scoreboard footer', () => {
        const markup = renderHonestySurface('loaded', { scores: [] });
        const submitIndex = markup.indexOf('data-matrix-submit-assessment');
        const scoreboardIndex = markup.indexOf('data-matrix-domain-scoreboard');

        expect(submitIndex).toBeGreaterThanOrEqual(0);
        expect(scoreboardIndex).toBeGreaterThan(submitIndex);
        expect(markup).toContain('All sections');
        expect(markup).toContain('Next Section');
        expect(markup).not.toContain('bg-gray-900');
        expect(markup.slice(scoreboardIndex)).not.toContain('data-matrix-submit-assessment');
        expect(markup.slice(scoreboardIndex)).not.toContain('Submit Assessment');
    });
});

describe('AssessmentMatrixHonestySurface markup absence vs visibility', () => {
    it('uses renderToStaticMarkup so hidden-but-present scoring UI would fail the error-state test', () => {
        const hiddenGridMarkup = renderToStaticMarkup(
            createElement(
                'div',
                null,
                createElement(
                    'div',
                    {
                        className: 'hidden',
                        'data-matrix-domain-scoreboard': true,
                    },
                    createElement(
                        'div',
                        { 'data-matrix-target-score-controls': true },
                        'hidden controls'
                    )
                ),
                createElement(
                    'div',
                    { 'data-assessment-matrix-scores-load-error': true },
                    'error panel'
                )
            )
        );

        expect(hiddenGridMarkup).toContain('data-matrix-target-score-controls');
        expect(hiddenGridMarkup).toContain('data-matrix-domain-scoreboard');
    });
});
