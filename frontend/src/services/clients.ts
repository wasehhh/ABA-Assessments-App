import { supabase } from '../lib/supabase';
import { Client } from '../types';

export const clientService = {
  async create(orgId: string, firstName: string, lastName: string, dateOfBirth?: string, createdBy?: string) {
    const { data, error } = await supabase
      .from('clients')
      .insert([{
        org_id: orgId,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth || null,
        created_by: createdBy || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return data as Client;
  },

  async getByOrg(orgId: string, parsedStatus: string = 'active') {
    let query = supabase
      .from('clients')
      .select('*')
      .eq('org_id', orgId)
      .order('first_name', { ascending: true });

    if (parsedStatus !== 'all') {
      query = query.eq('status', parsedStatus);
    } // else return all

    const { data, error } = await query;
    if (error) throw error;
    return data as Client[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Client | null;
  },

  async update(id: string, updates: Partial<Client>) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Client;
  },

  async archive(id: string) {
    return this.update(id, { status: 'archived' } as any);
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
