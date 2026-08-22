import {
    ContentPackData,
    Domain,
    ScoringType,
    SecondaryGroupCatalogEntry,
    Target,
} from '../types';
import {
    materializePackForSave,
    parseNumericScaleCsv,
    parseScaleLabelsCsv,
} from '../utils/assessmentPackAuthoring';
import { prepareContentPackForUpload } from '../utils/assessmentPackCanonical';

const CSV_REQUIRED_HEADERS = [
    'domain_id',
    'domain_title',
    'target_id',
    'title',
    'success_criteria',
] as const;

/** RFC4180-style single-line parser (commas allowed inside `"..."`; `""` → `"`). */
export function parseCsvLine(line: string): string[] {
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

function parseScoringType(value: string): ScoringType {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'yesno' || normalized === 'yes_no') {
        return 'yesno';
    }
    if (normalized === 'checkbox') {
        return 'checkbox';
    }
    if (normalized === 'text') {
        return 'text';
    }
    return 'numeric';
}

type DomainAcc = {
    domain_id: string;
    title: string;
    description?: string;
    targets: Target[];
    secondaryGroupCatalog: Map<string, SecondaryGroupCatalogEntry>;
    secondaryGroupOrder: string[];
};

function upsertSecondaryGroup(
    acc: DomainAcc,
    groupId: string,
    groupTitle: string
): void {
    if (!groupId) {
        return;
    }

    const existing = acc.secondaryGroupCatalog.get(groupId);
    if (!existing) {
        acc.secondaryGroupCatalog.set(groupId, {
            secondary_group_id: groupId,
            title: groupTitle || groupId,
        });
        acc.secondaryGroupOrder.push(groupId);
        return;
    }

    if (groupTitle) {
        acc.secondaryGroupCatalog.set(groupId, {
            ...existing,
            title: groupTitle,
        });
    }
}

export function parseContentPackCsv(
    csvText: string,
    title: string,
    description: string
): ContentPackData {
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
        (typeof CSV_REQUIRED_HEADERS)[number] | string,
        number
    >;

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
            throw new Error(
                `CSV row ${r + 1}: domain_id, target_id, title, and success_criteria are required when the row contains data.`
            );
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
                throw new Error(
                    `domain_title required for domain_id "${domainId}" on its first data row`
                );
            }
            acc = {
                domain_id: domainId,
                title: domainTitle,
                description: domainDescription || undefined,
                targets: [],
                secondaryGroupCatalog: new Map(),
                secondaryGroupOrder: [],
            };
            domainMap.set(domainId, acc);
            domainOrder.push(domainId);
        } else if (domainTitle) {
            acc.title = domainTitle;
        }
        if (domainDescription) {
            acc.description = domainDescription;
        }

        const secondaryGroupId = get('secondary_group_id');
        const secondaryGroupTitle = get('secondary_group_title');
        if (secondaryGroupId) {
            upsertSecondaryGroup(acc, secondaryGroupId, secondaryGroupTitle);
        }

        const scoringTypeRaw = get('scoring_type');
        const scaleRaw = get('scale');
        const scaleLabelsRaw = get('scale_labels');
        const hasScoringColumns =
            Boolean(scoringTypeRaw) || Boolean(scaleRaw) || Boolean(scaleLabelsRaw);

        const scoringType = hasScoringColumns ? parseScoringType(scoringTypeRaw) : 'numeric';
        const scale = hasScoringColumns
            ? parseNumericScaleCsv(scaleRaw)
            : [0, 1, 2, 3, 4];
        const scaleLabels = hasScoringColumns ? parseScaleLabelsCsv(scaleLabelsRaw) : {};

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
                type: scoringType,
                scale: scoringType === 'numeric' ? scale : undefined,
                scale_labels: scaleLabels,
                no_opportunity_allowed: true,
            },
        };
        if (desc) target.description = desc;
        if (examps) target.examples = examps;
        if (instruct) target.instructions = instruct;
        if (notes) target.notes = notes;
        if (secondaryGroupId) target.secondary_group_id = secondaryGroupId;

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
        if (d.secondaryGroupOrder.length > 0) {
            domain.secondary_groups = d.secondaryGroupOrder.map(
                (groupId) => d.secondaryGroupCatalog.get(groupId)!
            );
        }
        return domain;
    });

    const hasSecondaryGrouping = domainsOut.some(
        (domain) =>
            (domain.secondary_groups?.length ?? 0) > 0 ||
            domain.targets.some((target) => Boolean(target.secondary_group_id))
    );

    const pack: ContentPackData = {
        pack_id: `pack_${Date.now()}`,
        org_id: '',
        title,
        description,
        version: '1.0',
        domains: domainsOut,
        ...(hasSecondaryGrouping
            ? {
                  structure_labels: {
                      primary_group: 'Domain',
                      secondary_group: 'Secondary Group',
                      target: 'Target',
                  },
              }
            : {}),
    };

    // Dense materialize remains for Alpha-safe row assembly; upload form is canonical (OQ-B3-6/9).
    return prepareContentPackForUpload(materializePackForSave(pack)).pack;
}
