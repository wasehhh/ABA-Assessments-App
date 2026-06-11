import { DomainProfile } from '../../../services/domainProfile';
import { DomainProfileMetrics } from './DomainProfileMetrics';
import { DomainStateDistribution } from './DomainStateDistribution';
import { DomainSequenceStrip } from './DomainSequenceStrip';

interface Props {
    profile: DomainProfile;
}

export function DomainProfileCard({ profile }: Props) {
    return (
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <header className="mb-4 border-b border-gray-100 pb-3">
                <h3 className="text-lg font-semibold text-gray-900">{profile.title}</h3>
            </header>

            <div className="space-y-4">
                <DomainProfileMetrics
                    coverage={profile.coverage}
                    pointsCaptured={profile.pointsCaptured}
                    cycleDelta={profile.cycleDelta}
                />
                <DomainStateDistribution distribution={profile.stateDistribution} />
                <DomainSequenceStrip sequence={profile.sequence} />
            </div>
        </article>
    );
}
