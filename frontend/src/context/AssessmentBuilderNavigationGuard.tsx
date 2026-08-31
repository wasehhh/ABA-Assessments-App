import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';

const DISCARD_MESSAGE =
    'You have unsaved changes in the Pack Builder. Discard them and leave this session?';

export interface AssessmentBuilderNavigationGuard {
    isBlocking: boolean;
    message: string;
    setBlocking: (blocking: boolean) => void;
    requestNavigation: (targetHash: string) => void;
    requestLocalAction: (action: () => void) => void;
    confirmDiscard: () => void;
    cancelNavigation: () => void;
}

const AssessmentBuilderNavigationGuardContext =
    createContext<AssessmentBuilderNavigationGuard | null>(null);

export function AssessmentBuilderNavigationGuardProvider({ children }: { children: ReactNode }) {
    const [isBlocking, setIsBlocking] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const pendingHashRef = useRef<string | null>(null);
    const pendingActionRef = useRef<(() => void) | null>(null);

    const requestNavigation = useCallback(
        (targetHash: string) => {
            if (!isBlocking) {
                window.location.hash = targetHash;
                return;
            }
            pendingHashRef.current = targetHash;
            pendingActionRef.current = null;
            setConfirmOpen(true);
        },
        [isBlocking]
    );

    const requestLocalAction = useCallback(
        (action: () => void) => {
            if (!isBlocking) {
                action();
                return;
            }
            pendingActionRef.current = action;
            pendingHashRef.current = null;
            setConfirmOpen(true);
        },
        [isBlocking]
    );

    const confirmDiscard = useCallback(() => {
        setConfirmOpen(false);
        setIsBlocking(false);
        const pendingHash = pendingHashRef.current;
        const pendingAction = pendingActionRef.current;
        pendingHashRef.current = null;
        pendingActionRef.current = null;
        if (pendingAction) {
            pendingAction();
            return;
        }
        if (pendingHash) {
            window.location.hash = pendingHash;
        }
    }, []);

    const cancelNavigation = useCallback(() => {
        setConfirmOpen(false);
        pendingHashRef.current = null;
        pendingActionRef.current = null;
    }, []);

    const value = useMemo<AssessmentBuilderNavigationGuard>(
        () => ({
            isBlocking,
            message: DISCARD_MESSAGE,
            setBlocking: setIsBlocking,
            requestNavigation,
            requestLocalAction,
            confirmDiscard,
            cancelNavigation,
        }),
        [isBlocking, requestNavigation, requestLocalAction, confirmDiscard, cancelNavigation]
    );

    return (
        <AssessmentBuilderNavigationGuardContext.Provider value={value}>
            {children}
            <ConfirmDialog
                isOpen={confirmOpen}
                title="Discard unsaved changes?"
                message={DISCARD_MESSAGE}
                confirmText="Discard changes"
                cancelText="Keep editing"
                isDestructive={true}
                onConfirm={confirmDiscard}
                onCancel={cancelNavigation}
            />
        </AssessmentBuilderNavigationGuardContext.Provider>
    );
}

export function useAssessmentBuilderNavigationGuard(): AssessmentBuilderNavigationGuard {
    const context = useContext(AssessmentBuilderNavigationGuardContext);
    if (!context) {
        throw new Error(
            'useAssessmentBuilderNavigationGuard must be used within AssessmentBuilderNavigationGuardProvider'
        );
    }
    return context;
}

/** Safe for Layout — no-op when provider is absent (e.g. tests). */
export function useOptionalAssessmentBuilderNavigationGuard(): AssessmentBuilderNavigationGuard | null {
    return useContext(AssessmentBuilderNavigationGuardContext);
}

export function navigateWithOptionalGuard(
    guard: AssessmentBuilderNavigationGuard | null,
    targetHash: string
): void {
    if (guard) {
        guard.requestNavigation(targetHash);
        return;
    }
    window.location.hash = targetHash;
}
