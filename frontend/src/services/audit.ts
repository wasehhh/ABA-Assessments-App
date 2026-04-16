
import { supabase } from '../lib/supabase';

export interface AuditLogEntry {
    org_id: string;
    user_id: string;
    action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
    entity_type: 'client' | 'assessment' | 'user' | 'report';
    entity_id?: string;
    details?: any;
}

export const auditService = {
    async log(entry: AuditLogEntry) {
        try {
            console.log(`[Audit] ${entry.action} ${entry.entity_type} ${entry.entity_id || ''}`);
            console.log('[Audit] Entry:', entry);
            if (entry.entity_id === 'list' || entry.org_id === 'list' || entry.user_id === 'list') {
                console.error('[Audit] DETECTED LIST! Trace:');
                console.trace();
            }

            const { error } = await supabase
                .from('audit_logs')
                .insert([{
                    org_id: entry.org_id,
                    user_id: entry.user_id,
                    action: entry.action,
                    entity_type: entry.entity_type,
                    entity_id: entry.entity_id,
                    details: entry.details,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.error('Audit log failed:', error);
                // We log locally if DB fails, as per fail-safe compliance requirements
                // In a real app, this might queue for retry
            }
        } catch (err) {
            console.error('Audit service error:', err);
        }
    },

    async getLogs(orgId: string, limit = 50) {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};
