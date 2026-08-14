import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ContentPackData, Target } from '../../types';
import { TargetScoreControls } from './TargetScoreControls';

function makeNumericTarget(scaleLabels: Record<number, string>): Target {
    return {
        target_id: 'B12',
        title: 'Block designs from picture',
        success_criteria: 'Criteria',
        materials: '',
        scoring: {
            type: 'numeric',
            scale: [0, 1, 2, 3, 4],
            scale_labels: scaleLabels,
            no_opportunity_allowed: false,
        },
    };
}

function makePack(target: Target): ContentPackData {
    return {
        pack_id: 'pack-1',
        org_id: 'org-1',
        title: 'Pack',
        description: '',
        version: '1.0',
        domains: [{ domain_id: 'B', title: 'Domain B', targets: [target] }],
    };
}

describe('TargetScoreControls numeric buttons', () => {
    it('shows numerals on the button face and announces value — label when a criterion exists', () => {
        const target = makeNumericTarget({
            0: 'Does not complete the design',
            1: 'Completes with full model',
            2: 'Completes with picture',
            3: '4+ parts',
            4: 'Independent',
        });
        const markup = renderToStaticMarkup(
            createElement(TargetScoreControls, {
                target,
                pack: makePack(target),
                current: 3,
                scoresEditable: true,
                onScoreUpdate: vi.fn(),
            })
        );

        expect(markup).toMatch(/>0</);
        expect(markup).toMatch(/>1</);
        expect(markup).toMatch(/>2</);
        expect(markup).toMatch(/>3</);
        expect(markup).toMatch(/>4</);
        expect(markup).not.toContain('4+ parts<');
        expect(markup).toContain('aria-label="3 — 4+ parts"');
        expect(markup).toContain('title="3 — 4+ parts"');
        expect(markup).toContain('aria-label="0 — Does not complete the design"');
    });

    it('omits aria-label when there is no criterion label (visible numeral is the name)', () => {
        const target = makeNumericTarget({});
        const markup = renderToStaticMarkup(
            createElement(TargetScoreControls, {
                target,
                pack: makePack(target),
                current: null,
                scoresEditable: true,
                onScoreUpdate: vi.fn(),
            })
        );

        expect(markup).not.toContain('aria-label=');
        expect(markup).toContain('title="0"');
        expect(markup).toMatch(/>0</);
    });
});
