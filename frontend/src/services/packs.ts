import { supabase } from '../lib/supabase';
import { auditService } from './audit';
import { ContentPack, ContentPackData, Domain, Target } from '../types';

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

const CSV_REQUIRED_HEADERS = [
  'domain_id',
  'domain_title',
  'target_id',
  'title',
  'success_criteria',
] as const;

/** RFC4180-style single-line parser (commas allowed inside `"..."`; `""` → `"`). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
          continue;
        }
        inQuotes = false;
        continue;
      }
      cur += c;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ',') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out.map((cell) => cell.trim());
}

function splitCsvPhysicalLines(blob: string): string[] {
  const lines = blob.split(/\r\n|\r|\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function parseContentPackCsv(csvText: string, title: string, description: string): ContentPackData {
  const normalizedText = csvText.replace(/^\uFEFF/, '');
  const physicalLines = splitCsvPhysicalLines(normalizedText);

  const records: string[][] = [];
  for (const raw of physicalLines) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    records.push(parseCsvLine(line));
  }

  if (records.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row.');
  }

  const rawHeader = records[0];
  const header = rawHeader.map((h) => h.replace(/^\uFEFF/, '').trim().toLowerCase());

  for (const req of CSV_REQUIRED_HEADERS) {
    if (!header.includes(req)) {
      throw new Error(`Missing required CSV column: ${req}`);
    }
  }

  const ix = Object.fromEntries(header.map((name, idx) => [name, idx])) as Record<
    typeof CSV_REQUIRED_HEADERS[number] | string,
    number
  >;

  type DomainAcc = {
    domain_id: string;
    title: string;
    description?: string;
    targets: Target[];
  };

  const domainOrder: string[] = [];
  const domainMap = new Map<string, DomainAcc>();
  const targetIdsSeen = new Set<string>();

  for (let r = 1; r < records.length; r++) {
    const cols = records[r];
    const rowCols = [...cols];
    while (rowCols.length < header.length) rowCols.push('');

    const get = (name: string): string => {
      const i = ix[name];
      if (i === undefined) return '';
      return (rowCols[i] ?? '').trim();
    };

    if (rowCols.every((c, i) => !(rowCols[i] ?? '').trim())) continue;

    const domainId = get('domain_id');
    const targetId = get('target_id');
    const targetTitle = get('title');
    const successCriteria = get('success_criteria');

    if (!domainId || !targetId || !targetTitle || !successCriteria) {
      throw new Error(`CSV row ${r + 1}: domain_id, target_id, title, and success_criteria are required when the row contains data.`);
    }

    if (targetIdsSeen.has(targetId)) {
      throw new Error(`Duplicate target_id found: ${targetId}`);
    }
    targetIdsSeen.add(targetId);

    let acc = domainMap.get(domainId);
    const domainTitle = get('domain_title');
    const domainDescription = get('domain_description');

    if (!acc) {
      if (!domainTitle) {
        throw new Error(`domain_title required for domain_id "${domainId}" on its first data row`);
      }
      acc = {
        domain_id: domainId,
        title: domainTitle,
        description: domainDescription || undefined,
        targets: [],
      };
      domainMap.set(domainId, acc);
      domainOrder.push(domainId);
    } else if (domainTitle) {
      acc.title = domainTitle;
    }
    if (domainDescription) {
      acc.description = domainDescription;
    }

    const desc = get('description');
    const mats = get('materials');
    const instruct = get('instructions');
    const examps = get('examples');
    const notes = get('notes');

    const target: Target = {
      target_id: targetId,
      title: targetTitle,
      success_criteria: successCriteria,
      materials: mats,
      scoring: {
        type: 'numeric',
        scale: [0, 1, 2, 3, 4],
        scale_labels: {} as Record<number, string>,
        no_opportunity_allowed: true,
      },
    };
    if (desc) target.description = desc;
    if (examps) target.examples = examps;
    if (instruct) target.instructions = instruct;
    if (notes) target.notes = notes;

    acc.targets.push(target);
  }

  if (domainOrder.length === 0 || targetIdsSeen.size === 0) {
    throw new Error('CSV contains no usable data rows.');
  }

  const domainsOut: Domain[] = domainOrder.map((id) => {
    const d = domainMap.get(id)!;
    const domain: Domain = {
      domain_id: d.domain_id,
      title: d.title,
      targets: d.targets,
    };
    if (d.description) domain.description = d.description;
    return domain;
  });

  return {
    pack_id: `pack_${Date.now()}`,
    org_id: '',
    title,
    description,
    version: '1.0',
    domains: domainsOut,
  };
}
