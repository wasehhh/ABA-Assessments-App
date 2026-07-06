import { ContentPackData, Domain, StructureLabels, Target } from '../types';
import {
    domainHasSecondaryGroupDisplay,
    getStructureLabels,
    groupTargetsForDisplay,
} from './assessmentPackStructure';
import { flattenMatrixDisplayTargets } from './matrixDisplayHelpers';

export interface ReadSurfaceTargetSection<T> {
    title: string;
    secondaryGroupId?: string;
    targets: T[];
}

export function getPackStructureLabels(pack: ContentPackData): StructureLabels {
    return getStructureLabels(pack);
}

/** Stable display order for targets within a domain (group-aware when authored). */
export function getPackDomainTargetOrder(domain: Domain): Target[] {
    return flattenMatrixDisplayTargets(domain);
}

export function buildReadSurfaceTargetSections<T extends { targetId: string }>(
    domain: Domain,
    targetsById: Map<string, T>
): ReadSurfaceTargetSection<T>[] | undefined {
    if (!domainHasSecondaryGroupDisplay(domain)) {
        return undefined;
    }

    return groupTargetsForDisplay(domain)
        .map((section) => ({
            title: section.title,
            secondaryGroupId: section.secondary_group_id,
            targets: section.targets
                .map((target) => targetsById.get(target.target_id))
                .filter((target): target is T => target !== undefined),
        }))
        .filter((section) => section.targets.length > 0);
}

export function hasReadSurfaceSecondarySections<T>(
    sections: ReadSurfaceTargetSection<T>[] | undefined
): boolean {
    return Boolean(sections?.length);
}

/** Column-span cells for secondary group header row in cycle × target grids. */
export function buildSecondaryGroupHeaderCells<T extends { targetId: string }>(
    sections: ReadSurfaceTargetSection<T>[],
    visibleTargets: T[]
): { title: string; colSpan: number }[] {
    const sectionTitleByTargetId = new Map<string, string>();
    sections.forEach((section) => {
        section.targets.forEach((target) => {
            sectionTitleByTargetId.set(target.targetId, section.title);
        });
    });

    const cells: { title: string; colSpan: number }[] = [];
    let index = 0;

    while (index < visibleTargets.length) {
        const title = sectionTitleByTargetId.get(visibleTargets[index].targetId) ?? '';
        let span = 1;

        while (
            index + span < visibleTargets.length &&
            sectionTitleByTargetId.get(visibleTargets[index + span].targetId) === title
        ) {
            span += 1;
        }

        cells.push({ title, colSpan: span });
        index += span;
    }

    return cells;
}
