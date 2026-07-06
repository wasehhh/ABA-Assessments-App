import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { CycleAxis, DomainZone } from '../record';

export interface SnapshotCandidateProps {
    profile: AssessmentSnapshotProfile;
    cycleDateLabels?: Record<string, string>;
}

/**
 * Candidate A — Strip First
 * History Strips dominate; domains are quiet structural sections.
 */
export function AssessmentSnapshotCandidateA({
    profile,
    cycleDateLabels,
}: SnapshotCandidateProps) {
    return (
        <div className="space-y-1" data-assessment-snapshot-candidate="a">
            <CycleAxis
                cycles={profile.cycles}
                cycleDateLabels={cycleDateLabels}
                labelWidth="w-40"
                className="mb-2 border-b border-gray-200 pb-2"
            />
            <div className="space-y-3">
                {profile.domains.map((domain) => (
                    <DomainZone
                        key={domain.domainId}
                        domain={domain}
                        cycles={profile.cycles}
                        cycleDateLabels={cycleDateLabels}
                        variant="quiet"
                        stripDensity="default"
                    />
                ))}
            </div>
        </div>
    );
}
