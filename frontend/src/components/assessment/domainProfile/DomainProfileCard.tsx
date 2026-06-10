import { DomainProfile } from '../../../services/domainProfile';
import { DomainProfileMetrics } from './DomainProfileMetrics';
import { DomainStateDistribution } from './DomainStateDistribution';

interface Props {
    profile: DomainProfile;
}

export function DomainProfileCard({ profile }: Props) {
    return (
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <header className="mb-5 border-b border-gray-100 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">{profile.title}</h3>
                <p className="mt-1 text-xs text-gray-500">{profile.domainId}</p>
            </header>

            <div className="space-y-6">
                <DomainProfileMetrics
                    coverage={profile.coverage}
                    pointsCaptured={profile.pointsCaptured}
                    cycleDelta={profile.cycleDelta}
                />
                <DomainStateDistribution distribution={profile.stateDistribution} />
            </div>
        </article>
    );
}
