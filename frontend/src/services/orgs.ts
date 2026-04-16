
import { supabase } from '../lib/supabase';

export interface Organization {
    id: string;
    name: string;
    created_at: string;
    settings?: any;
}

export const orgService = {
    async getById(id: string) {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Organization;
    },

    async update(id: string, updates: Partial<Organization>) {
        const { data, error } = await supabase
            .from('organizations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Organization;
    }
};
