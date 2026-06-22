import { useState } from 'react';
import { Beaker } from 'lucide-react';
import { LearnerMapView } from '../../components/learnerMap';
import { buildMockDisplayContext } from '../../components/learnerMap/learnerMapDisplayContext';
import { deriveAssessmentCoverageSummary } from '../../components/learnerMap/domainCellDisplay';
import {
    getLearnerMapMockScenario,
    LEARNER_MAP_MOCK_SCENARIOS,
    LearnerMapMockScenarioId,
} from './learnerMapMockData';

function averageTargetsPerDomain(totalTargets: number, totalDomains: number): string {
    if (totalDomains === 0) {
        return '—';
    }
    return (totalTargets / totalDomains).toFixed(1);
}

export function LearnerMapPreview() {
    const [scenarioId, setScenarioId] = useState<LearnerMapMockScenarioId>('small');

    if (!import.meta.env.DEV) {
        return null;
    }

    const scenario = getLearnerMapMockScenario(scenarioId);
    const { totals, domains } = scenario.profile;
    const coverageSummary = deriveAssessmentCoverageSummary(domains);
    const targetsPerDomain = averageTargetsPerDomain(totals.totalTargets, totals.totalDomains);

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="sticky top-0 z-30 border-b-2 border-amber-500 bg-amber-100/95 backdrop-blur-sm shadow-sm">
                <div className="mx-auto max-w-6xl px-4 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-3">
                            <div className="mt-0.5 rounded-md bg-amber-900 p-2 text-amber-50">
                                <Beaker className="h-4 w-4" aria-hidden />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-950">
                                    Development Preview — Not Production
                                </p>
                                <h1 className="mt-1 text-base font-semibold text-amber-950">
                                    Learner Map · Visual QA Harness
                                </h1>
                                <p className="mt-1 text-sm text-amber-900/90">
                                    Mock data only · no client records · dev route only
                                </p>
                            </div>
                        </div>

                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-label="Mock assessment scenarios"
                        >
                            {LEARNER_MAP_MOCK_SCENARIOS.map((entry) => {
                                const isActive = entry.id === scenarioId;
                                return (
                                    <button
                                        key={entry.id}
                                        type="button"
                                        onClick={() => setScenarioId(entry.id)}
                                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                            isActive
                                                ? 'bg-amber-950 text-amber-50 shadow-sm'
                                                : 'bg-white text-amber-950 ring-1 ring-amber-300 hover:bg-amber-50'
                                        }`}
                                    >
                                        {entry.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-amber-300/80 bg-white/80 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-amber-950">
                            <span className="font-semibold">{scenario.label} scenario</span>
                            <span className="text-amber-700" aria-hidden>
                                ·
                            </span>
                            <span className="text-amber-900/90">{scenario.description}</span>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
                            <div className="rounded-md bg-amber-50 px-3 py-2">
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                                    Domains
                                </dt>
                                <dd className="mt-0.5 tabular-nums font-semibold text-amber-950">
                                    {totals.totalDomains}
                                </dd>
                            </div>
                            <div className="rounded-md bg-amber-50 px-3 py-2">
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                                    Targets
                                </dt>
                                <dd className="mt-0.5 tabular-nums font-semibold text-amber-950">
                                    {totals.totalTargets}
                                    <span className="ml-1 text-xs font-normal text-amber-800">
                                        (~{targetsPerDomain}/domain)
                                    </span>
                                </dd>
                            </div>
                            <div className="rounded-md bg-amber-50 px-3 py-2">
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                                    Cycles
                                </dt>
                                <dd className="mt-0.5 tabular-nums font-semibold text-amber-950">
                                    {totals.totalCycles}
                                </dd>
                            </div>
                            <div className="rounded-md bg-amber-50 px-3 py-2">
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                                    Targets Assessed
                                </dt>
                                <dd className="mt-0.5 tabular-nums font-semibold text-amber-950">
                                    {coverageSummary.targetsAssessed}
                                </dd>
                            </div>
                            <div className="rounded-md bg-amber-50 px-3 py-2">
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                                    Assessment Coverage
                                </dt>
                                <dd className="mt-0.5 tabular-nums font-semibold text-amber-950">
                                    {coverageSummary.coveragePercent}%
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>

            <LearnerMapView
                profile={scenario.profile}
                displayContext={buildMockDisplayContext(scenario.profile, scenario.label)}
                cycleDateLabels={scenario.cycleDateLabels}
            />
        </div>
    );
}
