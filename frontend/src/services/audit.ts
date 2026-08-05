
import { supabase } from '../lib/supabase';

/** Canonical actions written to audit_logs.action (UPPERCASE only). */
export type AuditActionCanonical =
    | 'VIEW'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'APPROVE'
    | 'CYCLE_START'
    | 'EXPORT';

/** Entity types used in app + legacy rows that may appear in DB. */
export type AuditEntityType =
    | 'client'
    | 'assessment'
    | 'assessment_cycle'
    | 'assessment_score'
    | 'content_pack'
    | 'organization'
    | 'user'
    | 'report';

const CANONICAL_ACTIONS = new Set<string>([
    'VIEW',
    'CREATE',
    'UPDATE',
    'DELETE',
    'APPROVE',
    'CYCLE_START',
    'EXPORT',
]);

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
    return UUID_RE.test(value.trim());
}

/** Map legacy / alternate action strings to the allowed canonical set. */
export function normalizeAuditAction(
    raw: string
): { action: AuditActionCanonical; legacyNote?: string } {
    const upper = (raw || '').trim().toUpperCase();
    if (CANONICAL_ACTIONS.has(upper)) {
        return { action: upper as AuditActionCanonical };
    }
    const legacyToCanonical: Record<string, AuditActionCanonical> = {
        LOGIN: 'VIEW',
        LOGOUT: 'VIEW',
        SUBMIT: 'UPDATE',
    };
    const mapped = legacyToCanonical[upper];
    if (mapped) {
        return { action: mapped, legacyNote: upper };
    }
    return { action: 'VIEW', legacyNote: upper || 'UNKNOWN' };
}

function normalizeEntityId(
    entityId: string | null | undefined
): { entity_id: string | null; movedRef?: string } {
    if (entityId == null || entityId === '') {
        return { entity_id: null };
    }
    const trimmed = entityId.trim();
    if (isUuid(trimmed)) {
        return { entity_id: trimmed };
    }
    return { entity_id: null, movedRef: trimmed };
}

export interface AuditLogEntry {
    org_id: string;
    user_id: string;
    action: AuditActionCanonical | string;
    entity_type: AuditEntityType | string;
    entity_id?: string | null;
    details?: Record<string, unknown> | null;
    new_data?: Record<string, unknown> | null;
    old_data?: Record<string, unknown> | null;
}

export const auditService = {
    async log(entry: AuditLogEntry) {
        try {
            const { action: canonicalAction, legacyNote } = normalizeAuditAction(
                String(entry.action)
            );
            const { entity_id, movedRef } = normalizeEntityId(entry.entity_id ?? null);

            const details: Record<string, unknown> = {
                ...(entry.details && typeof entry.details === 'object' ? entry.details : {}),
            };
            if (movedRef !== undefined) {
                details.non_uuid_entity_ref = movedRef;
            }
            if (legacyNote) {
                details.mapped_from_action = legacyNote;
            }

            const row = {
                org_id: entry.org_id,
                user_id: entry.user_id,
                action: canonicalAction,
                entity_type: entry.entity_type,
                entity_id,
                details: Object.keys(details).length ? details : null,
                new_data: entry.new_data ?? null,
                old_data: entry.old_data ?? null,
                created_at: new Date().toISOString(),
            };

            const { error } = await supabase.from('audit_logs').insert([row]);

            if (error) {
                console.error('Audit log failed:', error, {
                    action: row.action,
                    entity_type: row.entity_type,
                    entity_id: row.entity_id,
                });
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
    },
};
