import { LearnerMapTotals } from '../../services/learnerMapProfile';

interface Props {
    totals: LearnerMapTotals;
}

export function LearnerMapAssessmentRollup({ totals }: Props) {
    return (
        <section className="rounded-lg border border-gray-300 bg-white px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
                Assessment rollup
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-5">
                <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Domains</dt>
                    <dd className="mt-0.5 tabular-nums text-lg font-semibold text-gray-900">
                        {totals.totalDomains}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Targets</dt>
                    <dd className="mt-0.5 tabular-nums text-lg font-semibold text-gray-900">
                        {totals.totalTargets}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cycles</dt>
                    <dd className="mt-0.5 tabular-nums text-lg font-semibold text-gray-900">
                        {totals.totalCycles}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Scored cells</dt>
                    <dd className="mt-0.5 tabular-nums text-lg font-semibold text-gray-900">
                        {totals.scoredCells}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total cells</dt>
                    <dd className="mt-0.5 tabular-nums text-lg font-semibold text-gray-900">
                        {totals.totalCells}
                    </dd>
                </div>
            </dl>
        </section>
    );
}
