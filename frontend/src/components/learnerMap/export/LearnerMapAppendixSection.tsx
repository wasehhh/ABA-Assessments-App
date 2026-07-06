import { LearnerMapCycleSummary, LearnerMapDomain } from '../../../services/learnerMapProfile';
import { StructureLabels } from '../../../types';
import { LearnerMapAppendixDomainSection } from './LearnerMapAppendixDomainSection';

interface Props {
    domains: LearnerMapDomain[];
    cycles: LearnerMapCycleSummary[];
    domainIndexById?: Record<string, number>;
    cycleDateLabels?: Record<string, string>;
    structureLabels?: StructureLabels;
}

export function LearnerMapAppendixSection({
    domains,
    cycles,
    domainIndexById,
    cycleDateLabels,
    structureLabels,
}: Props) {
    return (
        <div className="space-y-6">
            {domains.map((domain, domainIndex) => (
                <LearnerMapAppendixDomainSection
                    key={domain.domainId}
                    domain={domain}
                    cycles={cycles}
                    domainIndex={domainIndexById?.[domain.domainId] ?? domainIndex}
                    cycleDateLabels={cycleDateLabels}
                    structureLabels={structureLabels}
                />
            ))}
        </div>
    );
}
