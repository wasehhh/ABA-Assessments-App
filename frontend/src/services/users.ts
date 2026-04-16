import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export const userService = {
    async getByOrg(orgId: string) {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('org_id', orgId)
            .order('full_name', { ascending: true });

        if (error) throw error;
        return data as UserProfile[];
    },

    async getInvitesByOrg(orgId: string) {
        const { data, error } = await supabase
            .from('user_invites')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async updateUser(userId: string, updates: Partial<UserProfile>) {
        const { error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', userId);

        if (error) throw error;
    },

    async getById(userId: string) {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data as UserProfile;
    },

    async checkInvite(email: string) {
        const { data, error } = await supabase.rpc('check_user_invite', { lookup_email: email });
        if (error) throw error;
        return data as { email: string; org_id: string; role: string; invited_by: string } | null;
    },

    async inviteUser(email: string, role: string, orgId: string, invitedBy: string) {
        const { error } = await supabase
            .from('user_invites')
            .insert([{ email, role, org_id: orgId, invited_by: invitedBy }]);

        if (error) throw error;
    },

    async deleteInvite(email: string) {
        const { error } = await supabase
            .from('user_invites')
            .delete()
            .eq('email', email);
        if (error) throw error;
    }
};
