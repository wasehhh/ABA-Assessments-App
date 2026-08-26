import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContentPackData, Domain, Target } from '../types';
import {
    SCORE_BUTTON_GAP_NUMERIC_PX,
    SCORE_BUTTON_SIZE_PX,
    DESKTOP_SCORE_COLUMN_PREFERRED_PX,
    MIN_TABLET_IDENTITY_WIDTH_PX,
    TABLET_SCORE_TRACK_WIDTH_FLOOR_PX,
    computeTabletScoreTrackWidth,
    resolveTabletScoreTrackLayout,
    scoreGroupContentWidth,
    shouldUseTabletScoreWrapLayout,
    tabletRowIdentityBudgetPx,
} from './matrixTabletScoreTrack';

function makeNumericTarget(id: string, scale: number[]): Target {
    return {
        target_id: id,
        title: `Target ${id}`,
        success_criteria: 'Criteria',
        materials: '',
        scoring: {
            type: 'numeric',
            scale,
            scale_labels: Object.fromEntries(scale.map((v) => [v, `Label ${v}`])),
            no_opportunity_allowed: false,
        },
    };
}

function makePack(domain: Domain): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Pack',
        description: '',
        version: '1.0',
        domains: [domain],
    };
}

function makeDomain(targets: Target[]): Domain {
    return {
        domain_id: 'A',
        title: 'Domain A',
        targets,
    };
}

describe('matrixTabletScoreTrack geometry', () => {
    it('derives content width from button size and gap (3, 5, 6, 7 values)', () => {
        expect(scoreGroupContentWidth(3, SCORE_BUTTON_GAP_NUMERIC_PX)).toBe(144);
        expect(scoreGroupContentWidth(5, SCORE_BUTTON_GAP_NUMERIC_PX)).toBe(244);
        expect(scoreGroupContentWidth(6, SCORE_BUTTON_GAP_NUMERIC_PX)).toBe(294);
        expect(scoreGroupContentWidth(7, SCORE_BUTTON_GAP_NUMERIC_PX)).toBe(344);
    });

    it('floors the tablet track at the desktop preferred width so five values have slack', () => {
        const fiveValueContent = scoreGroupContentWidth(5, SCORE_BUTTON_GAP_NUMERIC_PX);
        expect(fiveValueContent).toBe(244);
        const trackWidth = computeTabletScoreTrackWidth(fiveValueContent);
        expect(trackWidth).toBe(TABLET_SCORE_TRACK_WIDTH_FLOOR_PX);
        expect(trackWidth).toBe(DESKTOP_SCORE_COLUMN_PREFERRED_PX);
        expect(trackWidth).toBeGreaterThan(fiveValueContent);
    });

    it('fails the zero-slack condition when track width equals five-value content width', () => {
        const fiveValueContent = scoreGroupContentWidth(5, SCORE_BUTTON_GAP_NUMERIC_PX);
        expect(computeTabletScoreTrackWidth(fiveValueContent)).not.toBe(fiveValueContent);
    });

    it('widens the track for six- and seven-value scales without dropping below desktop floor', () => {
        const sixTrack = computeTabletScoreTrackWidth(
            scoreGroupContentWidth(6, SCORE_BUTTON_GAP_NUMERIC_PX)
        );
        const sevenTrack = computeTabletScoreTrackWidth(
            scoreGroupContentWidth(7, SCORE_BUTTON_GAP_NUMERIC_PX)
        );
        expect(sixTrack).toBe(294);
        expect(sevenTrack).toBe(344);
        expect(sixTrack).toBeGreaterThanOrEqual(DESKTOP_SCORE_COLUMN_PREFERRED_PX);
        expect(sevenTrack).toBeGreaterThanOrEqual(DESKTOP_SCORE_COLUMN_PREFERRED_PX);
    });

    it('keeps ordinary three- and five-value domains on a single-row layout at 768', () => {
        for (const scaleLength of [3, 5]) {
            const scale = Array.from({ length: scaleLength }, (_, i) => i);
            const domain = makeDomain([makeNumericTarget('A1', scale)]);
            const layout = resolveTabletScoreTrackLayout(domain, makePack(domain));
            expect(layout.useWrapLayout).toBe(false);
            expect(layout.trackWidthPx).toBeGreaterThanOrEqual(DESKTOP_SCORE_COLUMN_PREFERRED_PX);
            expect(layout.identityBudgetPx).toBeGreaterThanOrEqual(MIN_TABLET_IDENTITY_WIDTH_PX);
        }
    });

    it('keeps six- and seven-value scales on a widened single row at 768 (identity still usable)', () => {
        for (const scaleLength of [6, 7]) {
            const scale = Array.from({ length: scaleLength }, (_, i) => i);
            const domain = makeDomain([makeNumericTarget(`A${scaleLength}`, scale)]);
            const layout = resolveTabletScoreTrackLayout(domain, makePack(domain));
            expect(layout.useWrapLayout).toBe(false);
            expect(layout.trackWidthPx).toBe(
                computeTabletScoreTrackWidth(
                    scoreGroupContentWidth(scaleLength, SCORE_BUTTON_GAP_NUMERIC_PX)
                )
            );
            expect(layout.identityBudgetPx).toBeGreaterThanOrEqual(MIN_TABLET_IDENTITY_WIDTH_PX);
        }
    });

    it('switches to wrap layout when widening the track would starve identity', () => {
        const scale = Array.from({ length: 9 }, (_, i) => i);
        const domain = makeDomain([makeNumericTarget('A9', scale)]);
        const layout = resolveTabletScoreTrackLayout(domain, makePack(domain));
        expect(layout.useWrapLayout).toBe(true);
        expect(shouldUseTabletScoreWrapLayout(layout.trackWidthPx)).toBe(true);
    });
});

describe('matrixTabletScoreTrack rendered controls', () => {
    it('renders every score button for six- and seven-value scales without wrap layout', async () => {
        const { DomainScoreboard } = await import('../components/assessment/DomainScoreboard');

        for (const scaleLength of [6, 7]) {
            const scale = Array.from({ length: scaleLength }, (_, i) => i);
            const domain = makeDomain([makeNumericTarget(`L${scaleLength}`, scale)]);
            const pack = makePack(domain);
            const markup = renderToStaticMarkup(
                createElement(DomainScoreboard, {
                    domain,
                    pack,
                    structureLabels: { primary_group: 'Domain', target: 'Target' },
                    scores: [],
                    previousScores: [],
                    onScoreUpdate: () => undefined,
                    onViewDetail: () => undefined,
                    onBack: () => undefined,
                    onNavigateDomain: () => undefined,
                    isFirstDomain: true,
                    isLastDomain: true,
                    onSubmit: () => undefined,
                })
            );

            expect(markup).not.toContain('data-matrix-tablet-score-wrap');
            expect(markup).toContain('flex-nowrap');
            for (let i = 0; i < scaleLength; i += 1) {
                expect(markup).toContain(`>${i}<`);
            }
        }
    });

    it('renders all buttons in wrap layout when identity would be starved (nine values)', async () => {
        const { DomainScoreboard } = await import('../components/assessment/DomainScoreboard');
        const scaleLength = 9;
        const scale = Array.from({ length: scaleLength }, (_, i) => i);
        const domain = makeDomain([makeNumericTarget('L9', scale)]);
        const pack = makePack(domain);
        const markup = renderToStaticMarkup(
            createElement(DomainScoreboard, {
                domain,
                pack,
                structureLabels: { primary_group: 'Domain', target: 'Target' },
                scores: [],
                previousScores: [],
                onScoreUpdate: () => undefined,
                onViewDetail: () => undefined,
                onBack: () => undefined,
                onNavigateDomain: () => undefined,
                isFirstDomain: true,
                isLastDomain: true,
                onSubmit: () => undefined,
            })
        );

        expect(markup).toContain('data-matrix-tablet-score-wrap');
        expect(markup).toContain('flex-wrap');
        for (let i = 0; i < scaleLength; i += 1) {
            expect(markup).toContain(`>${i}<`);
        }
    });

    it('keeps three- and five-value scales on one nowrap row in tablet markup', async () => {
        const { DomainScoreboard } = await import('../components/assessment/DomainScoreboard');

        for (const scaleLength of [3, 5]) {
            const scale = Array.from({ length: scaleLength }, (_, i) => i);
            const domain = makeDomain([makeNumericTarget(`S${scaleLength}`, scale)]);
            const pack = makePack(domain);
            const markup = renderToStaticMarkup(
                createElement(DomainScoreboard, {
                    domain,
                    pack,
                    structureLabels: { primary_group: 'Domain', target: 'Target' },
                    scores: [],
                    previousScores: [],
                    onScoreUpdate: () => undefined,
                    onViewDetail: () => undefined,
                    onBack: () => undefined,
                    onNavigateDomain: () => undefined,
                    isFirstDomain: true,
                    isLastDomain: true,
                    onSubmit: () => undefined,
                })
            );

            expect(markup).not.toContain('data-matrix-tablet-score-wrap');
            expect(markup).toContain('flex-nowrap');
            expect(markup).toContain(
                `data-matrix-tablet-track-width="${computeTabletScoreTrackWidth(scoreGroupContentWidth(scaleLength, SCORE_BUTTON_GAP_NUMERIC_PX))}"`
            );
        }
    });
});

describe('matrixTabletScoreTrack regression guards', () => {
    it('never computes a track narrower than the desktop column constant', () => {
        for (let n = 1; n <= 10; n += 1) {
            const content = scoreGroupContentWidth(n, SCORE_BUTTON_GAP_NUMERIC_PX);
            expect(computeTabletScoreTrackWidth(content)).toBeGreaterThanOrEqual(
                DESKTOP_SCORE_COLUMN_PREFERRED_PX
            );
        }
    });

    it('documents button geometry used in arithmetic', () => {
        expect(SCORE_BUTTON_SIZE_PX).toBe(44);
        expect(SCORE_BUTTON_GAP_NUMERIC_PX).toBe(6);
    });
});
