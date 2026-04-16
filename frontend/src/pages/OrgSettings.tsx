
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { orgService } from '../services/orgs';
import { auditService } from '../services/audit';
import { Building2, Save } from 'lucide-react';

export function OrgSettings() {
    const { user, profile } = useAuth();
    const isAdmin = profile?.role === 'admin';
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (isAdmin && profile?.org_id) {
            loadOrg();
        }
    }, [profile?.org_id, isAdmin]);

    const loadOrg = async () => {
        try {
            const org = await orgService.getById(profile!.org_id);
            setName(org.name);
        } catch (err) {
            console.error('Failed to load org', err);
            setMessage({ type: 'error', text: 'Failed to load organization details.' });
        } finally {
            setLoading(false);
        }
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
                entity_type: 'user', // Technically org, but we can reuse types or assume org context
                entity_id: profile!.org_id,
                details: { change: 'Updated Organization Name', new_name: name }
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

    if (loading) return <div className="text-center py-12">Loading...</div>;

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
