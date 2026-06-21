import { useState } from 'react';
import { Beaker } from 'lucide-react';
import { LearnerMapExportView } from '../../components/learnerMap/export/LearnerMapExportView';
import {
    LEARNER_MAP_EXPORT_MODES,
    LearnerMapExportMode,
} from '../../components/learnerMap/export/learnerMapExportMode';
import { buildMockDisplayContext } from '../../components/learnerMap/learnerMapDisplayContext';
import {
    getLearnerMapMockScenario,
    LEARNER_MAP_MOCK_SCENARIOS,
    LearnerMapMockScenarioId,
} from './learnerMapMockData';

export function LearnerMapExportPreview() {
    const [scenarioId, setScenarioId] = useState<LearnerMapMockScenarioId>('small');
    const [exportMode, setExportMode] = useState<LearnerMapExportMode>('standard');

    if (!import.meta.env.DEV) {
        return null;
    }

    const scenario = getLearnerMapMockScenario(scenarioId);
    const modeMeta = LEARNER_MAP_EXPORT_MODES.find((entry) => entry.id === exportMode)!;

    return (
        <div className="learner-map-export-preview-page min-h-screen bg-slate-200">
            <div className="no-print sticky top-0 z-30 border-b-2 border-amber-500 bg-amber-100/95 backdrop-blur-sm shadow-sm">
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
                                    Learner Map Export View · Visual QA
                                </h1>
                                <p className="mt-1 text-sm text-amber-900/90">
                                    Export composition only · no print · no PDF · dev route only
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:items-end">
                            <div
                                className="flex flex-wrap gap-2"
                                role="group"
                                aria-label="Export modes"
                            >
                                {LEARNER_MAP_EXPORT_MODES.map((entry) => {
                                    const isActive = entry.id === exportMode;
                                    return (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            onClick={() => setExportMode(entry.id)}
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
                                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                                isActive
                                                    ? 'bg-white text-amber-950 ring-2 ring-amber-400'
                                                    : 'bg-amber-50/80 text-amber-900 ring-1 ring-amber-200 hover:bg-white'
                                            }`}
                                        >
                                            {entry.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <p className="mt-3 text-sm text-amber-950">
                        <span className="font-semibold">{modeMeta.label} mode</span>
                        <span className="mx-2 text-amber-700" aria-hidden>
                            ·
                        </span>
                        <span className="text-amber-900/90">{modeMeta.description}</span>
                    </p>
                </div>
            </div>

            <LearnerMapExportView
                profile={scenario.profile}
                mode={exportMode}
                displayContext={buildMockDisplayContext(scenario.profile, scenario.label)}
            />
        </div>
    );
}
