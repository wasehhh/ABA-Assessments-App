import { LearnerMapProfile } from '../../services/learnerMapProfile';
import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';
import { LearnerMapDomainSection } from './LearnerMapDomainSection';

interface Props {
    profile: LearnerMapProfile;
}

export function LearnerMapView({ profile }: Props) {
    const { metadata, cycles, domains, totals } = profile;
    const generatedAt = new Date(metadata.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    return (
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 text-gray-900">
            <header className="border-b-2 border-gray-900 pb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Longitudinal competency record
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight">Learner Map</h1>
                <p className="mt-2 text-sm text-gray-700">
                    {metadata.packTitle} (v{metadata.packVersion})
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                    <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Domains</dt>
                        <dd className="tabular-nums font-medium">{totals.totalDomains}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Targets</dt>
                        <dd className="tabular-nums font-medium">{totals.totalTargets}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cycles</dt>
                        <dd className="tabular-nums font-medium">{totals.totalCycles}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Scored cells</dt>
                        <dd className="tabular-nums font-medium">
                            {totals.scoredCells} / {totals.totalCells}
                        </dd>
                    </div>
                </dl>
                <p className="mt-3 text-xs text-gray-500">Generated {generatedAt}</p>
            </header>

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

            {cycles.length === 0 ? (
                <p className="text-sm text-gray-600">No cycles available for this learner map.</p>
            ) : null}

            {domains.length === 0 ? (
                <p className="text-sm text-gray-600">No domains available in this assessment.</p>
            ) : null}

            {cycles.length > 0 && domains.length > 0 ? (
                <div className="space-y-10">
                    {domains.map((domain) => (
                        <LearnerMapDomainSection
                            key={domain.domainId}
                            domain={domain}
                            cycles={cycles}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
