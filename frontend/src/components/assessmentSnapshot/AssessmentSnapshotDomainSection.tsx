import { LearnerMapCycleSummary, LearnerMapDomain } from '../../services/learnerMapProfile';
import { AssessmentSnapshotGrid } from './AssessmentSnapshotGrid';

interface Props {
    domain: LearnerMapDomain;
    cycles: LearnerMapCycleSummary[];
    cycleDateLabels?: Record<string, string>;
}

/**
 * Primary group section (domain in V1). Structured to allow nested secondary groups later.
 */
export function AssessmentSnapshotDomainSection({ domain, cycles, cycleDateLabels }: Props) {
    return (
        <section
            className="space-y-2"
            data-assessment-snapshot-domain
            data-domain-id={domain.domainId}
        >
            <h2 className="border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-wide text-gray-900">
                {domain.title}
            </h2>
            <AssessmentSnapshotGrid
                domain={domain}
                cycles={cycles}
                cycleDateLabels={cycleDateLabels}
            />
        </section>
    );
}
