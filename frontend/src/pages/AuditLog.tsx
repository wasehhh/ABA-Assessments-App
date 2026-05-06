
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditService } from '../services/audit';
import { userService } from '../services/users';
import { RefreshCw } from 'lucide-react';

function actionBadgeClass(action: string): string {
    const a = (action || '').toString().toUpperCase();
    switch (a) {
        case 'VIEW':
            return 'bg-slate-100 text-slate-800';
        case 'CREATE':
            return 'bg-green-100 text-green-800';
        case 'UPDATE':
            return 'bg-blue-100 text-blue-800';
        case 'DELETE':
            return 'bg-red-100 text-red-800';
        case 'APPROVE':
            return 'bg-purple-100 text-purple-800';
        case 'CYCLE_START':
            return 'bg-amber-100 text-amber-900';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function mergeLogPayload(log: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (log.details && typeof log.details === 'object') {
        Object.assign(out, log.details as object);
    }
    if (log.new_data && typeof log.new_data === 'object') {
        out.new_data = log.new_data;
    }
    if (log.old_data && typeof log.old_data === 'object') {
        out.old_data = log.old_data;
    }
    return out;
}

export function AuditLog() {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';
    const [logs, setLogs] = useState<any[]>([]);
    const [users, setUsers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAdmin && profile?.org_id) {
            loadData();
        }
    }, [profile?.org_id, isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            const logData = await auditService.getLogs(profile?.org_id || '', 100);
            setLogs(logData || []);

            const userData = await userService.getByOrg(profile?.org_id || '');
            const userMap: Record<string, string> = {};
            userData.forEach(u => {
                userMap[u.id] = u.full_name || u.email;
            });
            setUsers(userMap);
        } catch (err) {
            console.error('Failed to load audit logs', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return <div className="p-8 text-center text-gray-500">Access Denied</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
                    <p className="text-gray-600 mt-1">System events and access reviews</p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition"
                >
                    <RefreshCw className="w-5 h-5 text-gray-500" />
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading events...</td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No events found.</td>
                            </tr>
                        ) : (
                            logs.map((log) => {
                                const payload = mergeLogPayload(log);
                                const payloadStr = JSON.stringify(payload, null, 2);
                                return (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                            {users[log.user_id] || log.user_id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${actionBadgeClass(log.action)}`}
                                            >
                                                {(log.action || '').toString().toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 uppercase text-xs font-bold">
                                            {log.entity_type}
                                            {log.entity_id ? (
                                                <span className="block font-mono font-normal text-[10px] text-gray-400 normal-case mt-0.5 truncate max-w-[140px]" title={log.entity_id}>
                                                    {log.entity_id}
                                                </span>
                                            ) : null}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 truncate max-w-xs font-mono text-xs" title={payloadStr}>
                                            {payloadStr}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
