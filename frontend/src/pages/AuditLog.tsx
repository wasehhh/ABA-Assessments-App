
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditService } from '../services/audit';
import { userService } from '../services/users';
import { RefreshCw } from 'lucide-react';

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

            // Fetch users to map IDs to names
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
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                        {users[log.user_id] || log.user_id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                                                log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                                                    log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 uppercase text-xs font-bold">
                                        {log.entity_type}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 truncate max-w-xs" title={JSON.stringify(log.details, null, 2)}>
                                        {JSON.stringify(log.details)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
