import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAssessmentBuilderNavigationGuard } from '../context/AssessmentBuilderNavigationGuard';
import { packService } from '../services/packs';
import { ContentPack } from '../types';
import { AssessmentBuilder } from '../components/AssessmentBuilder';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
    DataLoadErrorPanel,
    DataLoadSpinner,
} from '../components/DataLoadSurface';
import {
    executeProtectedLoad,
    type DataLoadState,
} from '../utils/dataLoadHonesty';
import { PACKS_LIST_HASH } from './packBuilderRoutes';

export const PACK_BUILDER_FORM_ID = 'pack-builder-form';

interface PackBuilderProps {
    packId?: string;
}

function goToPacksList() {
    window.location.hash = PACKS_LIST_HASH;
}

export function PackBuilder({ packId }: PackBuilderProps) {
    const { user, profile } = useAuth();
    const isAdmin = ['admin', 'senior_therapist'].includes(profile?.role || '');
    const navigationGuard = useAssessmentBuilderNavigationGuard();

    const [editingPack, setEditingPack] = useState<ContentPack | null>(null);
    const [builderDirty, setBuilderDirty] = useState(false);
    const [builderRemountKey, setBuilderRemountKey] = useState(0);
    const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
    const [error, setError] = useState('');
    const [loadState, setLoadState] = useState<DataLoadState>(packId ? 'loading' : 'loaded');
    const [loadError, setLoadError] = useState<string | null>(null);
    const sessionOpenedAtRevisionRef = useRef<string | null>(null);
    const loadRequestRef = useRef(0);

    const handleBuilderSessionChange = useCallback((state: { isDirty: boolean }) => {
        setBuilderDirty(state.isDirty);
    }, []);

    useEffect(() => {
        navigationGuard.setBlocking(builderDirty);
        return () => navigationGuard.setBlocking(false);
    }, [builderDirty, navigationGuard]);

    useEffect(() => {
        if (profile && !isAdmin) {
            goToPacksList();
        }
    }, [profile, isAdmin]);

    const loadEditingPack = useCallback(async () => {
        if (!packId) {
            setEditingPack(null);
            sessionOpenedAtRevisionRef.current = null;
            setLoadState('loaded');
            setLoadError(null);
            return;
        }

        const requestId = ++loadRequestRef.current;
        setLoadState('loading');
        setLoadError(null);

        const result = await executeProtectedLoad({
            requestId,
            getCurrentRequestId: () => loadRequestRef.current,
            load: () => packService.getById(packId),
        });

        if (result.kind === 'stale') {
            return;
        }

        if (result.kind === 'error') {
            setEditingPack(null);
            setLoadError(
                'We could not load this content pack. Your pack is still saved — try again.'
            );
            setLoadState('error');
            return;
        }

        if (!result.data) {
            setEditingPack(null);
            setError('This pack is no longer available.');
            setLoadState('loaded');
            return;
        }

        setEditingPack(result.data);
        sessionOpenedAtRevisionRef.current = result.data.updated_at;
        setError('');
        setLoadState('loaded');
    }, [packId]);

    useEffect(() => {
        void loadEditingPack();
    }, [loadEditingPack]);

    useEffect(() => {
        if (editingPack) {
            sessionOpenedAtRevisionRef.current = editingPack.updated_at;
        } else if (!packId) {
            sessionOpenedAtRevisionRef.current = null;
        }
    }, [editingPack?.id, editingPack?.updated_at, builderRemountKey, packId]);

    const reloadEditingPackFromServer = async () => {
        if (!editingPack) {
            setConflictDialogOpen(false);
            return;
        }

        try {
            const fresh = await packService.getById(editingPack.id);
            if (!fresh) {
                setError('This pack is no longer available.');
                setBuilderDirty(false);
                setConflictDialogOpen(false);
                goToPacksList();
                return;
            }

            setEditingPack(fresh);
            sessionOpenedAtRevisionRef.current = fresh.updated_at;
            setBuilderRemountKey((key) => key + 1);
            setBuilderDirty(false);
            setConflictDialogOpen(false);
        } catch (err: any) {
            setError(err.message ?? 'Could not reload this pack.');
            setConflictDialogOpen(false);
        }
    };

    const leaveBuilder = () => {
        setBuilderDirty(false);
        navigationGuard.setBlocking(false);
        goToPacksList();
    };

    const handleBuilderSaveNew = async (packData: ContentPack['pack_data'] & { title: string; description: string }) => {
        if (!profile?.org_id || !user?.id) return;

        try {
            await packService.upload(
                profile.org_id,
                packData.title,
                packData.description,
                packData,
                user.id
            );
            setBuilderDirty(false);
            navigationGuard.setBlocking(false);
            goToPacksList();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (profile && !isAdmin) {
        return null;
    }

    if (loadState === 'loading') {
        return <DataLoadSpinner label="Loading pack…" />;
    }

    if (loadState === 'error') {
        return (
            <DataLoadErrorPanel
                title="Content pack could not be loaded"
                message={loadError ?? ''}
                onRetry={() => void loadEditingPack()}
                retryLabel="Retry loading pack"
            />
        );
    }

    if (packId && !editingPack) {
        return (
            <div className="space-y-4" data-pack-builder-page>
                <h1 className="text-3xl font-bold text-gray-900">Pack Builder</h1>
                <p className="text-red-700">{error || 'This pack is no longer available.'}</p>
            </div>
        );
    }

    const sessionSubtitle = editingPack
        ? `Editing: ${editingPack.title}`
        : 'New pack';

    return (
        <div className="space-y-6" data-pack-builder-page>
            {error ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                </div>
            ) : null}

            <AssessmentBuilder
                key={`${editingPack?.id ?? 'new'}-${builderRemountKey}`}
                formId={PACK_BUILDER_FORM_ID}
                sessionSubtitle={sessionSubtitle}
                packId={editingPack?.id}
                sessionOpenedAtRevision={sessionOpenedAtRevisionRef.current ?? undefined}
                initialData={
                    editingPack
                        ? {
                              ...editingPack.pack_data,
                              title: editingPack.title,
                              description: editingPack.description ?? '',
                          }
                        : undefined
                }
                onSessionChange={handleBuilderSessionChange}
                onSave={async (data) => {
                    if (editingPack) {
                        const expectedRevision = sessionOpenedAtRevisionRef.current;
                        if (!expectedRevision) {
                            setError(
                                'Cannot save — pack revision is missing. Reload the page and try again.'
                            );
                            return;
                        }

                        const result = await packService.updateIfRevisionMatches(
                            editingPack.id,
                            {
                                title: data.title,
                                description: data.description,
                                pack_data: { ...data, version: editingPack.version },
                            },
                            expectedRevision
                        );

                        if (!result.ok) {
                            setConflictDialogOpen(true);
                            return;
                        }

                        setBuilderDirty(false);
                        setEditingPack(null);
                        navigationGuard.setBlocking(false);
                        goToPacksList();
                    } else {
                        await handleBuilderSaveNew(data);
                    }
                }}
                onCancel={leaveBuilder}
            />

            <ConfirmDialog
                isOpen={conflictDialogOpen}
                title="Pack changed elsewhere"
                message="This pack was changed by someone else."
                confirmText="Reload"
                variant="alert"
                onConfirm={() => void reloadEditingPackFromServer()}
            />
        </div>
    );
}
