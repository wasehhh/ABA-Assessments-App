import { LearnerMapCycleSummary, LearnerMapProfile } from '../../services/learnerMapProfile';
import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';
import { LearnerMapAssessmentRollup } from './LearnerMapAssessmentRollup';
import { LearnerMapDomainSection } from './LearnerMapDomainSection';
import { LearnerMapDomainSummary } from './LearnerMapDomainSummary';

interface Props {
    profile: LearnerMapProfile;
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

export function LearnerMapView({ profile }: Props) {
    const { metadata, cycles, domains, totals } = profile;
    const generatedAt = new Date(metadata.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const cycleRangeLabel = formatCycleRange(cycles);

    return (
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 text-gray-900">
            <header className="border-b-2 border-gray-900 pb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Longitudinal competency record
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight">Learner Map</h1>
                <p className="mt-2 text-sm text-gray-700">
                    {metadata.packTitle} (v{metadata.packVersion})
                </p>
                <p className="mt-2 text-sm font-medium text-gray-800">{cycleRangeLabel}</p>
                <p className="mt-3 text-xs text-gray-500">Generated {generatedAt}</p>
            </header>

            <LearnerMapAssessmentRollup totals={totals} />

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Score bands</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                    {STATE_BUCKET_DISPLAY.map((bucket) => (
                        <div key={bucket.key} className="flex items-center gap-1.5 text-xs text-gray-800">
                            <span
                                className={`h-2.5 w-2.5 shrink-0 rounded-sm border ${bucket.legendClass}`}
                                aria-hidden
                            />
                            {bucket.label}
                        </div>
                    ))}
                </div>
                <p className="mt-3 text-xs text-gray-600">
                    Movement markers: ↑ higher · ↓ lower · = unchanged · + newly scored
                </p>
            </div>

            <section className="space-y-4 border-t border-gray-200 pt-8">
                <div>
                    <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">
                        Domain summary
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Scan domains before reviewing target-level detail.
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
                        <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">
                            Target × cycle detail
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Longitudinal scores and movement by target across {cycleRangeLabel.toLowerCase()}.
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
