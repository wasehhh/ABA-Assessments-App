import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { DomainZone } from '../record';
import { SnapshotCandidateProps } from './AssessmentSnapshotCandidateA';

/**
 * Candidate B — Zone First
 * Domain Zones are strong visual chapters; strips live inside each zone.
 */
export function AssessmentSnapshotCandidateB({
    profile,
    cycleDateLabels,
}: SnapshotCandidateProps) {
    return (
        <div className="space-y-5" data-assessment-snapshot-candidate="b">
            {profile.domains.map((domain) => (
                <DomainZone
                    key={domain.domainId}
                    domain={domain}
                    cycles={profile.cycles}
                    cycleDateLabels={cycleDateLabels}
                    variant="chapter"
                    stripDensity="default"
                    showPerZoneCycleAxis
                />
            ))}
        </div>
    );
}
