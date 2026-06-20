import { useState } from 'react';
import { LearnerMapView } from '../../components/learnerMap';
import {
    getLearnerMapMockScenario,
    LEARNER_MAP_MOCK_SCENARIOS,
    LearnerMapMockScenarioId,
} from './learnerMapMockData';

export function LearnerMapPreview() {
    const [scenarioId, setScenarioId] = useState<LearnerMapMockScenarioId>('small');

    if (!import.meta.env.DEV) {
        return null;
    }

    const scenario = getLearnerMapMockScenario(scenarioId);
    const { totals } = scenario.profile;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="sticky top-0 z-20 border-b-2 border-amber-400 bg-amber-50 px-4 py-3 shadow-sm">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-900">
                            Development Preview — Not Production
                        </p>
                        <p className="mt-1 text-sm text-amber-950">
                            Learner Map visual QA harness · mock data only
                        </p>
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
                                            ? 'bg-amber-900 text-amber-50'
                                            : 'bg-white text-amber-950 ring-1 ring-amber-300 hover:bg-amber-100'
                                    }`}
                                >
                                    {entry.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mx-auto mt-3 max-w-6xl text-sm text-amber-950">
                    <span className="font-medium">{scenario.description}</span>
                    <span className="mx-2 text-amber-700">·</span>
                    <span>
                        {totals.totalDomains} domains · {totals.totalTargets} targets ·{' '}
                        {totals.totalCycles} cycles · {totals.scoredCells}/{totals.totalCells}{' '}
                        scored cells
                    </span>
                </div>
            </div>

            <LearnerMapView profile={scenario.profile} />
        </div>
    );
}
