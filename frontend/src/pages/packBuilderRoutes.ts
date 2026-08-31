/**
 * Pack list vs Pack Builder hash locations — D1a.
 * Binding: docs/architecture/assessment_builder_phase_d_structure_contract.md §3.1
 */

export type PacksLocation =
    | { kind: 'list' }
    | { kind: 'builder-new' }
    | { kind: 'builder-edit'; packId: string }
    | { kind: 'unrelated' };

export function resolvePacksLocation(hash: string): PacksLocation {
    const base = hash.split('?')[0];
    const editMatch = base.match(/^#\/packs\/build\/([^/]+)$/);
    if (editMatch) {
        return { kind: 'builder-edit', packId: editMatch[1] };
    }
    if (base === '#/packs/build') {
        return { kind: 'builder-new' };
    }
    if (base === '#/packs') {
        return { kind: 'list' };
    }
    return { kind: 'unrelated' };
}

export const PACKS_LIST_HASH = '#/packs';
export const PACK_BUILDER_NEW_HASH = '#/packs/build';

export function packBuilderEditHash(packId: string): string {
    return `#/packs/build/${packId}`;
}
