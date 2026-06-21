import { LearnerMapCycleSummary, LearnerMapDomain } from '../../../services/learnerMapProfile';
import { LearnerMapAppendixDomainSection } from './LearnerMapAppendixDomainSection';

interface Props {
    domains: LearnerMapDomain[];
    cycles: LearnerMapCycleSummary[];
}

export function LearnerMapAppendixSection({ domains, cycles }: Props) {
    return (
        <div className="space-y-6">
            {domains.map((domain, domainIndex) => (
                <LearnerMapAppendixDomainSection
                    key={domain.domainId}
                    domain={domain}
                    cycles={cycles}
                    domainIndex={domainIndex}
                />
            ))}
        </div>
    );
}
