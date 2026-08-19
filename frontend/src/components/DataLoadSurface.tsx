import type { ReactNode } from 'react';
import type { DataLoadState } from '../utils/dataLoadHonesty';

interface SpinnerProps {
    label?: string;
    className?: string;
}

export function DataLoadSpinner({
    label = 'Loading…',
    className = 'text-center py-12',
}: SpinnerProps) {
    return (
        <div className={className} data-load-loading>
            <div className="inline-flex flex-col items-center text-gray-600">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4" />
                <p className="text-sm font-medium">{label}</p>
            </div>
        </div>
    );
}

interface ErrorPanelProps {
    title: string;
    message: string;
    onRetry: () => void;
    retryLabel?: string;
    className?: string;
}

export function DataLoadErrorPanel({
    title,
    message,
    onRetry,
    retryLabel = 'Try again',
    className = 'rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-lg mx-auto',
}: ErrorPanelProps) {
    return (
        <div className={className} data-load-error>
            <h2 className="text-lg font-semibold text-red-900 mb-2">{title}</h2>
            <p className="text-sm text-red-800 mb-6 leading-relaxed">{message}</p>
            <button
                type="button"
                onClick={onRetry}
                data-load-retry
                className="inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
                {retryLabel}
            </button>
        </div>
    );
}

export function DataLoadSecondaryError({
    message,
    onRetry,
    retryLabel = 'Retry',
}: {
    message: string;
    onRetry: () => void;
    retryLabel?: string;
}) {
    return (
        <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex flex-wrap items-center justify-between gap-3"
            data-load-secondary-error
        >
            <span>{message}</span>
            <button
                type="button"
                onClick={onRetry}
                data-load-retry
                className="font-semibold text-amber-900 underline hover:text-amber-950"
            >
                {retryLabel}
            </button>
        </div>
    );
}

export function DataLoadEmptyState({ children }: { children: ReactNode }) {
    return <div data-load-empty>{children}</div>;
}

export function DataLoadContent({ children }: { children: ReactNode }) {
    return <div data-load-content>{children}</div>;
}

interface GateProps {
    state: DataLoadState;
    errorTitle: string;
    errorMessage: string | null;
    onRetry: () => void;
    loadingLabel?: string;
    empty?: ReactNode | null;
    children: ReactNode;
    loadingClassName?: string;
    errorClassName?: string;
    retryLabel?: string;
}

/** Switches between loading, error, and loaded content — loaded empty is optional sibling. */
export function DataLoadGate({
    state,
    errorTitle,
    errorMessage,
    onRetry,
    loadingLabel,
    empty = null,
    children,
    loadingClassName,
    errorClassName,
    retryLabel,
}: GateProps) {
    if (state === 'loading') {
        return <DataLoadSpinner label={loadingLabel} className={loadingClassName} />;
    }

    if (state === 'error') {
        return (
            <DataLoadErrorPanel
                title={errorTitle}
                message={
                    errorMessage ??
                    'Something went wrong while loading. Your data is still saved — try again.'
                }
                onRetry={onRetry}
                retryLabel={retryLabel}
                className={errorClassName}
            />
        );
    }

    return (
        <>
            {empty}
            <DataLoadContent>{children}</DataLoadContent>
        </>
    );
}
