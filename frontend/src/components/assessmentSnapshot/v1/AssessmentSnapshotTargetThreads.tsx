import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { DomainColumn } from './DomainColumn';
import { resolveThreadsLayout } from './threadsLayout';

export interface AssessmentSnapshotTargetThreadsProps {
    profile: AssessmentSnapshotProfile;
    cycleDateLabels?: Record<string, string>;
}

export function AssessmentSnapshotTargetThreads({
    profile,
    cycleDateLabels,
}: AssessmentSnapshotTargetThreadsProps) {
    const layout = resolveThreadsLayout(profile);

    return (
        <div
            data-assessment-snapshot
            data-assessment-snapshot-v1="target-threads"
            data-assessment-snapshot-layout-tier={layout.tier}
        >
            <div
                className={`assessment-snapshot-domain-grid flex flex-wrap items-start ${layout.domainGapClass}`}
                data-assessment-snapshot-domain-grid
            >
                {profile.domains.map((domain, domainIndex) => (
                    <DomainColumn
                        key={domain.domainId}
                        domain={domain}
                        domainIndex={domainIndex}
                        cycles={profile.cycles}
                        cycleDateLabels={cycleDateLabels}
                        layout={layout}
                        structureLabels={profile.structureLabels}
                    />
                ))}
            </div>
        </div>
    );
}
