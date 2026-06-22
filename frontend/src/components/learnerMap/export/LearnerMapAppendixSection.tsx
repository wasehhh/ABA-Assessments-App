import { LearnerMapCycleSummary, LearnerMapDomain } from '../../../services/learnerMapProfile';
import { LearnerMapAppendixDomainSection } from './LearnerMapAppendixDomainSection';

interface Props {
    domains: LearnerMapDomain[];
    cycles: LearnerMapCycleSummary[];
    domainIndexById?: Record<string, number>;
    cycleDateLabels?: Record<string, string>;
}

export function LearnerMapAppendixSection({
    domains,
    cycles,
    domainIndexById,
    cycleDateLabels,
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
                />
            ))}
        </div>
    );
}
