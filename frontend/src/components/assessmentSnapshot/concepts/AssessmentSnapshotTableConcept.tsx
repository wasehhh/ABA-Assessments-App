import { AssessmentSnapshotDomainSection } from '../AssessmentSnapshotDomainSection';
import { SnapshotConceptProps } from './snapshotConceptShared';

export function AssessmentSnapshotTableConcept({ profile, cycleDateLabels }: SnapshotConceptProps) {
    return (
        <div className="space-y-8" data-assessment-snapshot-concept="table">
            {profile.domains.map((domain) => (
                <AssessmentSnapshotDomainSection
                    key={domain.domainId}
                    domain={domain}
                    cycles={profile.cycles}
                    cycleDateLabels={cycleDateLabels}
                />
            ))}
        </div>
    );
}
