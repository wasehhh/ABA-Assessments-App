import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
    DataLoadEmptyState,
    DataLoadErrorPanel,
    DataLoadGate,
    DataLoadSecondaryError,
} from './DataLoadSurface';

describe('DataLoadGate structural honesty', () => {
    const empty = createElement(
        DataLoadEmptyState,
        null,
        createElement('p', null, 'No clients found.')
    );
    const content = createElement('ul', { 'data-client-row': true }, createElement('li', null, 'Ada'));

    it('renders error state and not empty or content markup on failure', () => {
        const markup = renderToStaticMarkup(
            createElement(DataLoadGate, {
                state: 'error',
                errorTitle: 'Clients could not be loaded',
                errorMessage: 'We could not load your client list.',
                onRetry: vi.fn(),
                empty,
                children: content,
            })
        );

        expect(markup).toContain('data-load-error');
        expect(markup).not.toContain('data-load-empty');
        expect(markup).not.toContain('data-client-row');
    });

    it('renders empty state and not error markup when loaded with no rows', () => {
        const markup = renderToStaticMarkup(
            createElement(DataLoadGate, {
                state: 'loaded',
                errorTitle: 'Clients could not be loaded',
                errorMessage: null,
                onRetry: vi.fn(),
                empty,
                children: null,
            })
        );

        expect(markup).toContain('data-load-empty');
        expect(markup).not.toContain('data-load-error');
        expect(markup).not.toContain('data-client-row');
    });

    it('renders content and not error or empty markup when loaded with rows', () => {
        const markup = renderToStaticMarkup(
            createElement(DataLoadGate, {
                state: 'loaded',
                errorTitle: 'Clients could not be loaded',
                errorMessage: null,
                onRetry: vi.fn(),
                empty: null,
                children: content,
            })
        );

        expect(markup).toContain('data-load-content');
        expect(markup).toContain('data-client-row');
        expect(markup).not.toContain('data-load-error');
        expect(markup).not.toContain('data-load-empty');
    });

    it('terminates loading and exposes retry on failure', () => {
        const markup = renderToStaticMarkup(
            createElement(DataLoadGate, {
                state: 'loading',
                errorTitle: 'Ignored while loading',
                errorMessage: null,
                onRetry: vi.fn(),
                empty,
                children: content,
            })
        );

        expect(markup).toContain('data-load-loading');
        expect(markup).not.toContain('data-load-error');
        expect(markup).not.toContain('data-load-empty');
    });
});

describe('DataLoadGate absence vs hidden', () => {
    it('fails hidden-but-present content because markup still contains markers', () => {
        const hiddenContent = createElement(
            'div',
            { className: 'hidden', 'data-client-row': true },
            'hidden row'
        );
        const markup = renderToStaticMarkup(
            createElement(DataLoadGate, {
                state: 'error',
                errorTitle: 'Failed',
                errorMessage: 'Load failed',
                onRetry: vi.fn(),
                empty: null,
                children: hiddenContent,
            })
        );

        expect(markup).not.toContain('data-client-row');
    });
});

describe('DataLoadErrorPanel retry', () => {
    it('wires retry to refetch handler', () => {
        const onRetry = vi.fn();
        const markup = renderToStaticMarkup(
            createElement(DataLoadErrorPanel, {
                title: 'Could not load',
                message: 'Try again.',
                onRetry,
                retryLabel: 'Retry now',
            })
        );

        expect(markup).toContain('data-load-retry');
        expect(markup).toContain('Retry now');
    });
});

describe('DataLoadSecondaryError', () => {
    it('renders secondary failure without replacing primary content markers', () => {
        const markup = renderToStaticMarkup(
            createElement(
                'div',
                null,
                createElement('header', { 'data-primary-content': true }, 'Client header'),
                createElement(DataLoadSecondaryError, {
                    message: 'Assessments could not load.',
                    onRetry: vi.fn(),
                })
            )
        );

        expect(markup).toContain('data-load-secondary-error');
        expect(markup).toContain('data-primary-content');
    });
});
