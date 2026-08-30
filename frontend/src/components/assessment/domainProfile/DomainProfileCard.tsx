import { DomainProfile } from '../../../services/domainProfile';
import { pluralizeStructureLabel } from '../../../utils/assessmentPackStructure';
import { DomainStateDistribution } from './DomainStateDistribution';
import { DomainSequenceStrip } from './DomainSequenceStrip';

interface Props {
    profile: DomainProfile;
    targetLabel?: string;
}

function coveragePercent(scored: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((scored / total) * 100);
}

export function DomainProfileCard({ profile, targetLabel = 'target' }: Props) {
    const { scored, total } = profile.coverage;
    const percent = coveragePercent(scored, total);
    const targetLabelPlural = pluralizeStructureLabel(targetLabel).toLowerCase();

    return (
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <header className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{profile.title}</h3>
                <p className="mt-1 text-sm text-gray-600 tabular-nums">
                    {scored} of {total} {targetLabelPlural} scored ({percent}%)
                </p>
            </header>

            <div className="space-y-4">
                <DomainStateDistribution distribution={profile.stateDistribution} />
                <DomainSequenceStrip sequence={profile.sequence} scoredCount={scored} />
            </div>
        </article>
    );
}
