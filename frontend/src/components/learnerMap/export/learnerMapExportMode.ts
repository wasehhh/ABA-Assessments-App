import { LearnerMapDomain } from '../../../services/learnerMapProfile';

export type LearnerMapExportMode = 'standard' | 'selected-domains' | 'full';

export const LEARNER_MAP_EXPORT_MODES: {
    id: LearnerMapExportMode;
    label: string;
    description: string;
}[] = [
    {
        id: 'standard',
        label: 'Standard',
        description: 'Header, rollup, legends, and domain competency summary only.',
    },
    {
        id: 'selected-domains',
        label: 'Selected Domains',
        description: 'Standard content plus appendix detail for selected domains only.',
    },
    {
        id: 'full',
        label: 'Full',
        description: 'Standard content plus appendix with cycle × target detail for all domains.',
    },
];

export function resolveAppendixDomains(
    domains: LearnerMapDomain[],
    mode: LearnerMapExportMode,
    selectedDomainIds?: string[]
): LearnerMapDomain[] {
    if (mode === 'full') {
        return domains;
    }

    if (mode !== 'selected-domains' || !selectedDomainIds?.length) {
        return [];
    }

    const selectedIds = new Set(selectedDomainIds);
    return domains.filter((domain) => selectedIds.has(domain.domainId));
}

export function buildDomainIndexById(domains: LearnerMapDomain[]): Record<string, number> {
    return Object.fromEntries(domains.map((domain, index) => [domain.domainId, index]));
}
