import { supabase } from '../lib/supabase';
import { auditService } from './audit';
import { ContentPack, ContentPackData } from '../types';
import { parseContentPackCsv } from './contentPackCsv';

export const packService = {
  async upload(
    orgId: string,
    title: string,
    description: string,
    packData: ContentPackData,
    uploaderId: string
  ) {
    const { data, error } = await supabase
      .from('content_packs')
      .insert([{
        org_id: orgId,
        title,
        description,
        pack_data: packData,
        uploaded_by: uploaderId,
        version: packData.version,
      }])
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      org_id: orgId,
      user_id: uploaderId,
      action: 'CREATE',
      entity_type: 'content_pack',
      entity_id: data.id,
      details: { title, version: packData.version },
      new_data: { title, version: packData.version },
    });

    return data as ContentPack;
  },

  async getByOrg(orgId: string, parsedStatus: string = 'active') {
    console.log(`[PackService] getByOrg called with orgId: "${orgId}", status: "${parsedStatus}"`);
    let query = supabase
      .from('content_packs')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (parsedStatus !== 'all') {
      query = query.eq('status', parsedStatus);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ContentPack[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('content_packs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as ContentPack | null;
  },

  async update(id: string, updates: Partial<ContentPack>) {
    const { data, error } = await supabase
      .from('content_packs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as ContentPack;
  },

  async archive(id: string) {
    return this.update(id, { status: 'archived' } as any);
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('content_packs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  parseCSV(csv: string, title: string, description: string): ContentPackData {
    return parseContentPackCsv(csv, title, description);
  },
};
