import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/users';
import { UserProfile } from '../types';
import { Plus, Shield, Trash2 } from 'lucide-react';

import { ConfirmDialog } from '../components/ConfirmDialog';
import {
    DataLoadEmptyState,
    DataLoadErrorPanel,
    DataLoadContent,
    DataLoadSpinner,
} from '../components/DataLoadSurface';
import {
    executeProtectedLoad,
    type DataLoadState,
} from '../utils/dataLoadHonesty';

export function Users() {
    const { user, profile } = useAuth();
    const isAdmin = profile?.role === 'admin';

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [invites, setInvites] = useState<{ email: string; role: string; created_at: string }[]>([]);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('therapist');
    const [loadState, setLoadState] = useState<DataLoadState>('loading');
    const [loadError, setLoadError] = useState<string | null>(null);
    const loadRequestRef = useRef(0);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [revokeEmail, setRevokeEmail] = useState<string | null>(null);

    useEffect(() => {
        void loadUsers();
    }, [profile?.org_id]);

    const loadUsers = async () => {
        if (!profile?.org_id) return;

        const requestId = ++loadRequestRef.current;
        setLoadState('loading');
        setLoadError(null);

        const result = await executeProtectedLoad({
            requestId,
            getCurrentRequestId: () => loadRequestRef.current,
            load: async () => {
                const data = await userService.getByOrg(profile.org_id);
                const invitesData = await userService.getInvitesByOrg(profile.org_id);
                return { users: data, invites: invitesData };
            },
        });

        if (result.kind === 'stale') {
            return;
        }

        if (result.kind === 'error') {
            setUsers([]);
            setInvites([]);
            setLoadError(
                'We could not load team members. Try again in a moment.'
            );
            setLoadState('error');
            return;
        }

        setUsers(result.data.users);
        setInvites(result.data.invites);
        setLoadState('loaded');
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.org_id || !user?.id) return;

        setSending(true);
        setError(null);
        setSuccessMsg(null);

        try {
            await userService.inviteUser(inviteEmail, inviteRole, profile.org_id, user.id);
            setSuccessMsg(
                `Invite created for ${inviteEmail}. Copy the invite link or use Email to send it manually.`
            );
            setInviteEmail('');
            setInviteRole('therapist');
            setShowInviteForm(false);
            void loadUsers();
        } catch (err: any) {
            console.error('Invite error:', err);
            setError(err.message || 'Could not create invite');
        } finally {
            setSending(false);
        }
    };

    const handleRevoke = async () => {
        if (!revokeEmail) return;
        try {
            await userService.deleteInvite(revokeEmail);
            void loadUsers();
            setSuccessMsg(`Invitation revoked for ${revokeEmail}`);
        } catch (e: any) {
            console.error(e);
            setError('Failed to revoke invitation');
        } finally {
            setRevokeEmail(null);
        }
    };

    if (!isAdmin) {
        return (
            <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">Access Restricted</h3>
                <p className="text-gray-500 mt-1">Only administrators can manage users.</p>
            </div>
        );
    }

    if (loadState === 'loading') {
        return <DataLoadSpinner label="Loading team members…" />;
    }

    if (loadState === 'error') {
        return (
            <DataLoadErrorPanel
                title="Team members could not be loaded"
                message={loadError ?? ''}
                onRetry={() => void loadUsers()}
                retryLabel="Retry loading team members"
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
                    <p className="text-gray-600 mt-1">Manage users and roles</p>
                </div>
                <button
                    onClick={() => setShowInviteForm(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition"
                >
                    <Plus className="w-5 h-5" />
                    Invite User
                </button>
            </div>

            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
                    <span>{successMsg}</span>
                    <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-700">✕</button>
                </div>
            )}

            {showInviteForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Invite New User</h2>
                            <button onClick={() => setShowInviteForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    required
                                    placeholder="colleague@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="therapist">Therapist</option>
                                    <option value="senior_therapist">Senior Therapist</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="pt-2 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteForm(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
                                >
                                    {sending ? 'Creating...' : 'Create Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {users.length === 0 ? (
                <DataLoadEmptyState>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-12 text-center text-gray-500">No team members found.</div>
                    </div>
                </DataLoadEmptyState>
            ) : (
                <DataLoadContent>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((u) => {
                                    const isMe = u.id === user?.id;
                                    return (
                                        <tr key={u.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold mr-3">
                                                        {u.full_name?.charAt(0) || u.email?.charAt(0)}
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-900">{u.full_name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select
                                                    value={u.role}
                                                    disabled={isMe}
                                                    onChange={async (e) => {
                                                        try {
                                                            await userService.updateUser(u.id, { role: e.target.value as any });
                                                            setSuccessMsg(`Updated role for ${u.full_name || u.email}`);
                                                            void loadUsers();
                                                        } catch (err) {
                                                            console.error(err);
                                                            setError('Failed to update role');
                                                        }
                                                    }}
                                                    className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:bg-gray-100"
                                                >
                                                    <option value="admin">Admin</option>
                                                    <option value="senior_therapist">Senior Therapist</option>
                                                    <option value="therapist">Therapist</option>
                                                    <option value="viewer">Viewer</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                    {u.status === 'inactive' ? 'Inactive' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {!isMe && (
                                                    <button
                                                        onClick={async () => {
                                                            const newStatus = u.status === 'inactive' ? 'active' : 'inactive';
                                                            if (!confirm(`Are you sure you want to ${newStatus === 'inactive' ? 'deactivate' : 'activate'} this user?`)) return;

                                                            try {
                                                                await userService.updateUser(u.id, { status: newStatus });
                                                                setSuccessMsg(`User ${newStatus === 'inactive' ? 'deactivated' : 'activated'}`);
                                                                void loadUsers();
                                                            } catch (err) {
                                                                console.error(err);
                                                                setError('Failed to update status');
                                                            }
                                                        }}
                                                        className={`${u.status === 'inactive' ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'}`}
                                                    >
                                                        {u.status === 'inactive' ? 'Activate' : 'Deactivate'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </DataLoadContent>
            )}

            {invites.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Invitations</h2>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 relative"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {invites.map((invite) => (
                                    <tr key={invite.email}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invite.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                {invite.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(invite.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            Pending
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => {
                                                        const link = `${window.location.origin}/#/login?email=${encodeURIComponent(invite.email)}`;
                                                        navigator.clipboard.writeText(link);
                                                        setSuccessMsg('Invite link copied to clipboard!');
                                                    }}
                                                    className="text-emerald-600 hover:text-emerald-900"
                                                    title="Copy Invite Link"
                                                >
                                                    <span className="flex items-center gap-1">
                                                        Copy Link
                                                    </span>
                                                </button>
                                                <a
                                                    href={`mailto:${invite.email}?subject=Invitation to Join&body=You have been invited to join our team. Please click here to accept: ${window.location.origin}/#/login?email=${encodeURIComponent(invite.email)}`}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Send Email"
                                                >
                                                    Email
                                                </a>
                                                <button
                                                    onClick={() => setRevokeEmail(invite.email)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Revoke
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!revokeEmail}
                title="Revoke Invitation"
                message={`Are you sure you want to revoke the invitation for ${revokeEmail}?`}
                confirmText="Revoke Invitation"
                isDestructive={true}
                onConfirm={handleRevoke}
                onCancel={() => setRevokeEmail(null)}
            />
        </div>
    );
}
