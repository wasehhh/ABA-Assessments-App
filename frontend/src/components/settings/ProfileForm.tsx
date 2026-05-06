import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { orgService } from '../../services/orgs';
import { User, Building, Shield, Mail } from 'lucide-react';

export function ProfileForm() {
    const { user, profile, refreshProfile } = useAuth();
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [orgName, setOrgName] = useState<string | null>(null);

    useEffect(() => {
        if (profile?.full_name) {
            setFullName(profile.full_name);
        }
    }, [profile]);

    useEffect(() => {
        if (!profile?.org_id) {
            setOrgName('');
            return;
        }
        let cancelled = false;
        setOrgName(null);
        orgService
            .getById(profile.org_id)
            .then((org) => {
                if (!cancelled) setOrgName(org.name || '—');
            })
            .catch((err) => {
                console.error('Failed to load organization:', err);
                if (!cancelled) setOrgName('—');
            });
        return () => {
            cancelled = true;
        };
    }, [profile?.org_id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error, data } = await supabase
                .from('user_profiles')
                .update({ full_name: fullName })
                .eq('id', user?.id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error('Update failed. Permission denied or profile not found.');
            }

            setMessage({ type: 'success', text: 'Profile updated successfully' });
            if (refreshProfile) await refreshProfile();
            // Update global context so header changes immediately
            // Note: We might need to implement refreshProfile in AuthContext if it doesn't exist, 
            // or we just reload the page/wait for SWR if we used it. 
            // For now, we'll assume valid auth flow or a reload might be needed for header to update 
            // if AuthContext isn't reactive to DB changes automatically (usually it isn't).

        } catch (err) {
            console.error('Error updating profile:', err);
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    if (!profile) return null;

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Personal Information</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Basic information about your account.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-6 max-w-xl">

                    {/* Email (Read Only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                <Mail className="h-4 w-4" />
                            </span>
                            <input
                                type="text"
                                disabled
                                value={user?.email || ''}
                                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 bg-gray-100 text-gray-500 sm:text-sm cursor-not-allowed focus:ring-0 focus:border-gray-300"
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">Email cannot be changed.</p>
                    </div>

                    {/* Full Name (Editable) */}
                    <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                            Full Name
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                name="full_name"
                                id="full_name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                        {/* Organization (Read Only) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Organization</label>
                            <div className="mt-1 flex items-center">
                                <Building className="h-4 w-4 text-gray-400 mr-2 shrink-0" aria-hidden />
                                <span className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                    {orgName === null ? (
                                        <span className="text-gray-500">Loading…</span>
                                    ) : orgName ? (
                                        orgName
                                    ) : (
                                        <span className="text-gray-500">—</span>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Role (Read Only) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Role</label>
                            <div className="mt-1 flex items-center">
                                <Shield className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900 bg-emerald-100 text-emerald-800 px-2 py-1 rounded capitalize">
                                    {profile.role?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                            <div className="flex">
                                <div className="ml-3">
                                    <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                                        {message.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
