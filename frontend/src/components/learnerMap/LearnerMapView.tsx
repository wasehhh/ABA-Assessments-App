import { LearnerMapCycleSummary, LearnerMapProfile } from '../../services/learnerMapProfile';
import { LearnerMapArtifactHeader } from './LearnerMapArtifactHeader';
import { LearnerMapAssessmentRollup } from './LearnerMapAssessmentRollup';
import { LearnerMapDomainSection } from './LearnerMapDomainSection';
import { LearnerMapDomainSummary } from './LearnerMapDomainSummary';
import { LearnerMapDisplayContext } from './learnerMapDisplayContext';
import { LearnerMapMovementKey } from './LearnerMapMovementKey';
import { LearnerMapScoreBandsCard } from './LearnerMapScoreBandsCard';

interface Props {
    profile: LearnerMapProfile;
    displayContext?: LearnerMapDisplayContext;
}

function formatCycleRange(cycles: LearnerMapCycleSummary[]): string {
    if (cycles.length === 0) {
        return 'No cycles represented';
    }

    const cycleNumbers = cycles.map((cycle) => cycle.cycleNumber);
    const min = Math.min(...cycleNumbers);
    const max = Math.max(...cycleNumbers);

    if (min === max) {
        return `Cycle ${min}`;
    }

    return `Cycles ${min}–${max}`;
}

export function LearnerMapView({ profile, displayContext }: Props) {
    const { metadata, cycles, domains, totals } = profile;
    const generatedAt = new Date(metadata.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const cycleRangeLabel = formatCycleRange(cycles);

    return (
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 text-gray-900">
            <LearnerMapArtifactHeader
                profile={profile}
                cycleRangeLabel={cycleRangeLabel}
                generatedAtLabel={generatedAt}
                displayContext={displayContext}
            />

            <LearnerMapAssessmentRollup totals={totals} />

            <div className="grid gap-4 md:grid-cols-2">
                <LearnerMapScoreBandsCard />
                <LearnerMapMovementKey />
            </div>

            <section className="space-y-4 rounded-lg border border-gray-300 bg-white px-4 py-5 shadow-sm">
                <div className="border-b border-gray-200 pb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                        Primary supervision layer
                    </p>
                    <h2 className="mt-1 text-lg font-bold tracking-tight text-gray-900">
                        Domain competency summary
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm text-gray-600">
                        Scan domain coverage, score distribution, and movement before opening cycle-level
                        detail below.
                    </p>
                </div>
                <LearnerMapDomainSummary domains={domains} />
            </section>

            {cycles.length === 0 ? (
                <p className="text-sm text-gray-600">No cycles available for this learner map.</p>
            ) : null}

            {cycles.length > 0 && domains.length > 0 ? (
                <section className="space-y-8 border-t border-gray-300 pt-8">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                            Supporting detail
                        </p>
                        <h2 className="mt-1 text-base font-bold uppercase tracking-wide text-gray-900">
                            Cycle × target detail
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Cycles as rows, targets as columns — scroll horizontally for large domains
                            across {cycleRangeLabel.toLowerCase()}.
                        </p>
                    </div>
                    <div className="space-y-10">
                        {domains.map((domain) => (
                            <LearnerMapDomainSection
                                key={domain.domainId}
                                domain={domain}
                                cycles={cycles}
                            />
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
