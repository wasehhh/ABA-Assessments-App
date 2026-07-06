export interface SnapshotConceptMeta {
    id: string;
    label: string;
    /** One-line philosophy */
    description: string;
    organizingPrinciple: string;
    clinicalReadingPattern: string;
    generation: 'reference' | 'exploration';
}

export const SNAPSHOT_V1_ID = 'target-threads' as const;
export type SnapshotV1Id = typeof SNAPSHOT_V1_ID;

export const SNAPSHOT_CANDIDATE_IDS = ['candidate-a', 'candidate-b', 'candidate-c'] as const;
export type SnapshotCandidateId = (typeof SNAPSHOT_CANDIDATE_IDS)[number];

export const SNAPSHOT_CONCEPTS = [
    {
        id: 'table',
        label: 'Table Baseline',
        description: 'Control — targets as rows, cycles as columns (PR11.1 spreadsheet grid).',
        organizingPrinciple: 'Tabular matrix — targets on one axis, cycles on the other.',
        clinicalReadingPattern: 'Read down a target row to see cycle scores; scan columns for cycle-wide patterns.',
        generation: 'reference',
    },
    {
        id: 'barcode',
        label: 'Skill Barcode',
        description: 'One horizontal strip per target; each cycle is a colored segment for dense history scanning.',
        organizingPrinciple: 'Target identity is a horizontal barcode strip; time flows left to right.',
        clinicalReadingPattern: 'Scan strips vertically to compare targets; read strip left-to-right for one target’s history.',
        generation: 'reference',
    },
    {
        id: 'towers',
        label: 'Domain Skill Towers',
        description: 'Each domain is a compact vertical tower; targets stack with inline cycle segments.',
        organizingPrinciple: 'Domain as a vertical tower block; targets stack inside the tower.',
        clinicalReadingPattern: 'Compare tower silhouettes across domains; drill into a tower for target-level strips.',
        generation: 'reference',
    },
    {
        id: 'ribbons',
        label: 'Cycle Ribbons',
        description: 'One ribbon per cycle showing the full assessment state in target order, grouped by domain.',
        organizingPrinciple: 'Cycle is the primary ribbon; the full assessment state is frozen per administration.',
        clinicalReadingPattern: 'Compare ribbons top-to-bottom to see how the whole assessment changed between cycles.',
        generation: 'reference',
    },
    {
        id: 'terrain',
        label: 'Assessment Terrain',
        description: 'Domain regions with target cells; each cell encodes cycle history as compact stacked bands.',
        organizingPrinciple: 'Domain as terrain region; targets are cells on a map-like field.',
        clinicalReadingPattern: 'Survey domain regions for overall color shape; inspect cells for per-target elevation bands.',
        generation: 'reference',
    },
    {
        id: 'threads',
        label: 'Domain Threads',
        description: 'Each domain is one continuous vertical thread; targets are knots carrying cycle history.',
        organizingPrinciple: 'Domain = thread; targets = knots along the thread; the thread is the memorable object.',
        clinicalReadingPattern: 'Follow one thread top-to-bottom through its skill sequence; compare thread density across domains.',
        generation: 'exploration',
    },
    {
        id: 'timeline',
        label: 'Skill Timeline',
        description: 'Time is dominant — each target is a chronological timeline of cycle events.',
        organizingPrinciple: 'Chronology is the geometry; each target is a micro-timeline of administrations.',
        clinicalReadingPattern: 'Read left-to-right along a target timeline for developmental sequence; compare timelines vertically within a domain.',
        generation: 'exploration',
    },
    {
        id: 'canvases',
        label: 'Domain Canvases',
        description: 'Each domain is a packed canvas — targets arranged spatially, not in rows or columns.',
        organizingPrinciple: 'Domain = bounded canvas; targets are packed shapes inside with internal cycle encoding.',
        clinicalReadingPattern: 'Recognize domains by canvas silhouette; locate targets within the pack; inspect each shape for cycle history.',
        generation: 'exploration',
    },
    {
        id: 'glyphs',
        label: 'Target Glyphs',
        description: 'One compact glyph per target; all cycles and scores encoded inside a single symbol.',
        organizingPrinciple: 'Target = glyph; the page is a field of symbols grouped by domain.',
        clinicalReadingPattern: 'Scan the glyph field for color texture; hover or focus a glyph for exact scores; compare glyph patterns within a domain cluster.',
        generation: 'exploration',
    },
    {
        id: 'signature',
        label: 'Signature Exploration',
        description: 'Evalis Meridian — one continuous assessment pulse field with domains as zones along a shared axis.',
        organizingPrinciple: 'A single meridian axis carries the assessment; domains are zones; targets pulse across the axis.',
        clinicalReadingPattern: 'Read the meridian left-to-right through domain zones; each pulse is one target’s cycle stack crossing the axis.',
        generation: 'exploration',
    },
] as const satisfies readonly SnapshotConceptMeta[];

export type AssessmentSnapshotConceptId =
    | SnapshotV1Id
    | (typeof SNAPSHOT_CONCEPTS)[number]['id']
    | SnapshotCandidateId;

export type SnapshotArchiveConceptId = (typeof SNAPSHOT_CONCEPTS)[number]['id'];

export function isSnapshotV1(id: AssessmentSnapshotConceptId): id is SnapshotV1Id {
    return id === SNAPSHOT_V1_ID;
}

export function isSnapshotCandidate(id: AssessmentSnapshotConceptId): id is SnapshotCandidateId {
    return (SNAPSHOT_CANDIDATE_IDS as readonly string[]).includes(id);
}

export function getSnapshotConcept(id: (typeof SNAPSHOT_CONCEPTS)[number]['id']): SnapshotConceptMeta {
    return SNAPSHOT_CONCEPTS.find((entry) => entry.id === id) ?? SNAPSHOT_CONCEPTS[0];
}

export const SNAPSHOT_REFERENCE_CONCEPTS = SNAPSHOT_CONCEPTS.filter(
    (entry) => entry.generation === 'reference'
);

export const SNAPSHOT_EXPLORATION_CONCEPTS = SNAPSHOT_CONCEPTS.filter(
    (entry) => entry.generation === 'exploration'
);

/** PR11.2 reference + PR11.3 exploration concepts kept for archive review. */
export const SNAPSHOT_ARCHIVE_CONCEPTS = SNAPSHOT_CONCEPTS;
