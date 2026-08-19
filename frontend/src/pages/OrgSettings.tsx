
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { orgService } from '../services/orgs';
import { auditService } from '../services/audit';
import { Building2, Save } from 'lucide-react';
import {
    DataLoadErrorPanel,
    DataLoadSpinner,
} from '../components/DataLoadSurface';
import {
    executeProtectedLoad,
    type DataLoadState,
} from '../utils/dataLoadHonesty';

export function OrgSettings() {
    const { user, profile } = useAuth();
    const isAdmin = profile?.role === 'admin';
    const [loadState, setLoadState] = useState<DataLoadState>('loading');
    const [loadError, setLoadError] = useState<string | null>(null);
    const loadRequestRef = useRef(0);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (isAdmin && profile?.org_id) {
            loadOrg();
        }
    }, [profile?.org_id, isAdmin]);

    const loadOrg = async () => {
        const requestId = ++loadRequestRef.current;
        setLoadState('loading');
        setLoadError(null);
        setMessage(null);

        const result = await executeProtectedLoad({
            requestId,
            getCurrentRequestId: () => loadRequestRef.current,
            load: () => orgService.getById(profile!.org_id),
        });

        if (result.kind === 'stale') {
            return;
        }

        if (result.kind === 'error') {
            setLoadError(
                'We could not load organization settings. Your clinic details are still saved — try again.'
            );
            setLoadState('error');
            return;
        }

        setName(result.data.name);
        setLoadState('loaded');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        setMessage(null);

        try {
            await orgService.update(profile!.org_id, { name });

            // Audit the change
            await auditService.log({
                org_id: profile!.org_id,
                user_id: user!.id,
                action: 'UPDATE',
                entity_type: 'organization',
                entity_id: profile!.org_id,
                details: { change: 'Updated Organization Name', new_name: name },
            });

            setMessage({ type: 'success', text: 'Organization settings saved successfully.' });
        } catch (err: any) {
            console.error('Update failed', err);
            setMessage({ type: 'error', text: err.message || 'Failed to update settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (!isAdmin) {
        return <div className="p-8 text-center text-gray-500">Access Denied</div>;
    }

    if (loadState === 'loading') {
        return <DataLoadSpinner label="Loading organization settings…" />;
    }

    if (loadState === 'error') {
        return (
            <DataLoadErrorPanel
                title="Organization settings could not be loaded"
                message={loadError ?? ''}
                onRetry={() => void loadOrg()}
                retryLabel="Retry loading settings"
            />
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
                <p className="text-gray-600 mt-1">Manage your clinic's global configuration</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Clinic / Organization Name
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building2 className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
                                placeholder="My Clinic"
                                required
                            />
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                            This name will appear on all reports and employee invitations.
                        </p>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition"
                        >
                            <Save className="w-5 h-5" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
