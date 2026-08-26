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

function makeYesNoTarget(): Target {
    return {
        target_id: 'A1',
        title: 'Yes no target',
        success_criteria: 'Criteria',
        materials: '',
        scoring: {
            type: 'yes_no',
            scale: [0, 1],
            scale_labels: {},
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

/** Tailwind hit-target classes that enforce ≥44 CSS px on both axes (contract §2.2). */
function assertFortyFourHitTargetClasses(classAttr: string) {
    const hasMinH11 = /\bmin-h-11\b/.test(classAttr);
    const hasH11 = /\bh-11\b/.test(classAttr);
    const hasMinW11 = /\bmin-w-11\b/.test(classAttr);
    expect(hasMinH11 || hasH11).toBe(true);
    expect(hasMinW11).toBe(true);
    expect(classAttr).not.toMatch(/\bh-9\b/);
    expect(classAttr).not.toMatch(/\bmin-w-9\b/);
    expect(classAttr).not.toMatch(/\bmin-h-9\b/);
}

function buttonClassAttrs(markup: string): string[] {
    const attrs: string[] = [];
    const re = /<button\b([^>]*)>/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(markup)) !== null) {
        const classMatch = match[1].match(/class="([^"]*)"/);
        if (classMatch) attrs.push(classMatch[1]);
    }
    return attrs;
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

    it('keeps numeric score buttons at least 44×44 CSS px (both axes)', () => {
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
        const classes = buttonClassAttrs(markup);
        expect(classes.length).toBeGreaterThanOrEqual(5);
        for (const classAttr of classes) {
            assertFortyFourHitTargetClasses(classAttr);
        }
    });

    it('keeps Yes/No score buttons at least 44×44 CSS px (both axes)', () => {
        const target = makeYesNoTarget();
        const markup = renderToStaticMarkup(
            createElement(TargetScoreControls, {
                target,
                pack: makePack(target),
                current: null,
                scoresEditable: true,
                onScoreUpdate: vi.fn(),
            })
        );
        expect(markup).toMatch(/>Yes</);
        expect(markup).toMatch(/>No</);
        const classes = buttonClassAttrs(markup);
        expect(classes).toHaveLength(2);
        for (const classAttr of classes) {
            assertFortyFourHitTargetClasses(classAttr);
        }
    });

    it('uses nowrap by default and flex-wrap only when allowWrap is set', () => {
        const target = makeNumericTarget({});
        const nowrapMarkup = renderToStaticMarkup(
            createElement(TargetScoreControls, {
                target,
                pack: makePack(target),
                current: null,
                scoresEditable: true,
                onScoreUpdate: vi.fn(),
            })
        );
        expect(nowrapMarkup).toContain('flex-nowrap');

        const wrapMarkup = renderToStaticMarkup(
            createElement(TargetScoreControls, {
                target,
                pack: makePack(target),
                current: null,
                scoresEditable: true,
                onScoreUpdate: vi.fn(),
                allowWrap: true,
            })
        );
        expect(wrapMarkup).toContain('flex-wrap');
        expect(wrapMarkup).not.toContain('flex-nowrap');
    });
});
