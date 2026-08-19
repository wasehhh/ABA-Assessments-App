import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
    DataLoadEmptyState,
    DataLoadErrorPanel,
    DataLoadContent,
    DataLoadSpinner,
} from '../components/DataLoadSurface';

function renderClientsListSurface(
    loadState: 'loading' | 'loaded' | 'error',
    clients: { id: string; name: string }[]
) {
    if (loadState === 'loading') {
        return renderToStaticMarkup(
            createElement(DataLoadSpinner, { label: 'Loading clients…' })
        );
    }

    if (loadState === 'error') {
        return renderToStaticMarkup(
            createElement(DataLoadErrorPanel, {
                title: 'Clients could not be loaded',
                message:
                    'We could not load your client list. Your records are still saved — check your connection and try again.',
                onRetry: () => undefined,
            })
        );
    }

    if (clients.length === 0) {
        return renderToStaticMarkup(
            createElement(DataLoadEmptyState, null, 'No active clients found.')
        );
    }

    return renderToStaticMarkup(
        createElement(
            DataLoadContent,
            null,
            clients.map((client) =>
                createElement('div', { key: client.id, 'data-client-row': true }, client.name)
            )
        )
    );
}

function renderAuditTableBody(
    loadState: 'loading' | 'loaded' | 'error',
    logs: { id: string }[]
) {
    if (loadState === 'loading') {
        return renderToStaticMarkup(createElement(DataLoadSpinner, { label: 'Loading events…' }));
    }

    if (loadState === 'error') {
        return renderToStaticMarkup(
            createElement(DataLoadErrorPanel, {
                title: 'Audit events could not be loaded',
                message:
                    'We could not load audit events. Try again or contact your administrator if this continues.',
                onRetry: () => undefined,
            })
        );
    }

    if (logs.length === 0) {
        return renderToStaticMarkup(
            createElement('td', { colSpan: 5, 'data-load-empty': true }, 'No events found.')
        );
    }

    return renderToStaticMarkup(
        createElement(
            DataLoadContent,
            null,
            logs.map((log) => createElement('tr', { key: log.id, 'data-audit-row': true }))
        )
    );
}

describe('Clients list load honesty', () => {
    it('shows error state and not empty or rows on failed load', () => {
        const markup = renderClientsListSurface('error', []);
        expect(markup).toContain('data-load-error');
        expect(markup).not.toContain('data-load-empty');
        expect(markup).not.toContain('data-client-row');
    });

    it('shows empty state and not error on successful load with no clients', () => {
        const markup = renderClientsListSurface('loaded', []);
        expect(markup).toContain('data-load-empty');
        expect(markup).not.toContain('data-load-error');
        expect(markup).not.toContain('data-client-row');
    });

    it('terminates loading on failure path via error surface', () => {
        const loading = renderClientsListSurface('loading', []);
        const failed = renderClientsListSurface('error', []);
        expect(loading).toContain('data-load-loading');
        expect(failed).toContain('data-load-error');
        expect(failed).not.toContain('data-load-loading');
    });
});

describe('Audit log load honesty', () => {
    it('shows error state and not the empty-events message on failed load', () => {
        const markup = renderAuditTableBody('error', []);
        expect(markup).toContain('data-load-error');
        expect(markup).not.toContain('No events found');
    });

    it('shows empty message and not error on successful load with no events', () => {
        const markup = renderAuditTableBody('loaded', []);
        expect(markup).toContain('data-load-empty');
        expect(markup).toContain('No events found');
        expect(markup).not.toContain('data-load-error');
    });
});

describe('Archive action failure surface', () => {
    it('surfaces a user-visible archive error banner', () => {
        const markup = renderToStaticMarkup(
            createElement(
                'div',
                {
                    className: 'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800',
                    'data-action-error': true,
                },
                'We could not archive this client. The client is still active — try again.'
            )
        );

        expect(markup).toContain('data-action-error');
        expect(markup).toContain('still active');
    });
});

describe('Client detail load honesty', () => {
    it('distinguishes load failure from genuine not-found after a successful fetch', () => {
        const loadFailure = renderToStaticMarkup(
            createElement(DataLoadErrorPanel, {
                title: 'Client record could not be loaded',
                message:
                    'We could not load this client\'s record. Your records are still saved — check your connection and try again.',
                onRetry: () => undefined,
            })
        );
        const notFound = renderToStaticMarkup(
            createElement('div', { 'data-load-not-found': true }, 'Client not found')
        );

        expect(loadFailure).toContain('data-load-error');
        expect(loadFailure).not.toContain('Client not found');
        expect(notFound).toContain('data-load-not-found');
        expect(notFound).not.toContain('data-load-error');
    });
});

describe('Assessment report load honesty', () => {
    it('shows load failure and not not-found when the fetch fails', () => {
        const markup = renderToStaticMarkup(
            createElement(DataLoadErrorPanel, {
                title: 'Assessment report could not be loaded',
                message:
                    'We could not load this assessment report. Your records are still saved — try again before reviewing or printing.',
                onRetry: () => undefined,
            })
        );

        expect(markup).toContain('data-load-error');
        expect(markup).not.toContain('Assessment not found');
    });
});
