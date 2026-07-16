import { useState } from 'react';
import { Beaker } from 'lucide-react';
import { AssessmentSnapshotView } from '../../components/assessmentSnapshot';
import { SNAPSHOT_CANDIDATES } from '../../components/assessmentSnapshot/candidates';
import {
    AssessmentSnapshotConceptId,
    isSnapshotCandidate,
    isSnapshotV1,
    SNAPSHOT_ARCHIVE_CONCEPTS,
    SNAPSHOT_EXPLORATION_CONCEPTS,
    SNAPSHOT_REFERENCE_CONCEPTS,
    SNAPSHOT_V1_ID,
} from '../../components/assessmentSnapshot/concepts';
import { buildMockDisplayContext } from '../../components/learnerMap/learnerMapDisplayContext';
import { buildAssessmentSnapshotProfile } from '../../services/assessmentSnapshotProfile';
import {
    ASSESSMENT_SNAPSHOT_STRESS_SCENARIOS,
    AssessmentSnapshotStressScenarioId,
    getAssessmentSnapshotStressScenario,
} from './assessmentSnapshotMockData';

function SelectButton({
    id,
    label,
    isActive,
    onSelect,
    variant,
}: {
    id: AssessmentSnapshotConceptId;
    label: string;
    isActive: boolean;
    onSelect: (id: AssessmentSnapshotConceptId) => void;
    variant: 'v1' | 'candidate' | 'reference' | 'exploration';
}) {
    const activeClass =
        variant === 'v1'
            ? 'bg-slate-900 text-white shadow-sm'
            : variant === 'candidate'
              ? 'bg-emerald-800 text-white shadow-sm'
              : variant === 'reference'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-violet-800 text-white shadow-sm';
    const idleClass =
        variant === 'v1'
            ? 'bg-white text-slate-900 ring-1 ring-slate-400 hover:bg-slate-50'
            : variant === 'candidate'
              ? 'bg-white text-emerald-900 ring-1 ring-emerald-400 hover:bg-emerald-50'
              : variant === 'reference'
                ? 'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50'
                : 'bg-white text-violet-900 ring-1 ring-violet-300 hover:bg-violet-50';

    return (
        <button
            type="button"
            onClick={() => onSelect(id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:text-sm ${
                isActive ? activeClass : idleClass
            }`}
        >
            {label}
        </button>
    );
}

export function AssessmentSnapshotPreview() {
    const [scenarioId, setScenarioId] = useState<AssessmentSnapshotStressScenarioId>('alpha-small');
    const [conceptId, setConceptId] = useState<AssessmentSnapshotConceptId>(SNAPSHOT_V1_ID);
    const [showArchive, setShowArchive] = useState(false);

    if (!import.meta.env.DEV) {
        return null;
    }

    const scenario = getAssessmentSnapshotStressScenario(scenarioId);
    const snapshotProfile = buildAssessmentSnapshotProfile(scenario.profile);
    const displayContext = buildMockDisplayContext(scenario.profile, scenario.label);

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="sticky top-0 z-30 no-print border-b-2 border-amber-500 bg-amber-100/95 backdrop-blur-sm shadow-sm">
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
                                    Assessment Snapshot · Target Threads V1
                                </h1>
                                <p className="mt-1 text-sm text-amber-900/90">
                                    Print and scale hardening · stress fixtures for pagination QA
                                </p>
                            </div>
                        </div>

                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-label="Mock assessment scenarios"
                        >
                            {ASSESSMENT_SNAPSHOT_STRESS_SCENARIOS.map((entry) => {
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

                    <div className="mt-4 space-y-3">
                        <div>
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-800">
                                Active implementation (PR13.5)
                            </p>
                            <div
                                className="flex flex-wrap gap-2"
                                role="group"
                                aria-label="Assessment snapshot V1"
                            >
                                <SelectButton
                                    id={SNAPSHOT_V1_ID}
                                    label="Target Threads V1"
                                    isActive={conceptId === SNAPSHOT_V1_ID}
                                    onSelect={setConceptId}
                                    variant="v1"
                                />
                            </div>
                        </div>

                        <div className="rounded-md border border-dashed border-slate-300 bg-white/60 p-3">
                            <button
                                type="button"
                                onClick={() => setShowArchive((open) => !open)}
                                className="text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                                aria-expanded={showArchive}
                            >
                                {showArchive ? 'Hide' : 'Show'} archive / exploration
                            </button>
                            {showArchive ? (
                                <div className="mt-3 space-y-3">
                                    <div>
                                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                                            Manifesto candidates (PR11.4)
                                        </p>
                                        <div
                                            className="flex flex-wrap gap-2"
                                            role="group"
                                            aria-label="Assessment snapshot candidates"
                                        >
                                            {SNAPSHOT_CANDIDATES.map((entry) => (
                                                <SelectButton
                                                    key={entry.id}
                                                    id={entry.id}
                                                    label={entry.label}
                                                    isActive={conceptId === entry.id}
                                                    onSelect={setConceptId}
                                                    variant="candidate"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                            Reference concepts (PR11.2)
                                        </p>
                                        <div
                                            className="flex flex-wrap gap-2"
                                            role="group"
                                            aria-label="Reference snapshot concepts"
                                        >
                                            {SNAPSHOT_REFERENCE_CONCEPTS.map((entry) => (
                                                <SelectButton
                                                    key={entry.id}
                                                    id={entry.id}
                                                    label={entry.label}
                                                    isActive={conceptId === entry.id}
                                                    onSelect={setConceptId}
                                                    variant="reference"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                                            Signature exploration (PR11.3)
                                        </p>
                                        <div
                                            className="flex flex-wrap gap-2"
                                            role="group"
                                            aria-label="Exploratory snapshot concepts"
                                        >
                                            {SNAPSHOT_EXPLORATION_CONCEPTS.map((entry) => (
                                                <SelectButton
                                                    key={entry.id}
                                                    id={entry.id}
                                                    label={entry.label}
                                                    isActive={conceptId === entry.id}
                                                    onSelect={setConceptId}
                                                    variant="exploration"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        {SNAPSHOT_ARCHIVE_CONCEPTS.length + SNAPSHOT_CANDIDATES.length}{' '}
                                        archived implementations — historical reference only.
                                    </p>
                                </div>
                            ) : null}
                        </div>

                        <p className="text-sm text-amber-950">
                            <span className="font-semibold">{scenario.label}</span>
                            <span className="mx-2 text-amber-700" aria-hidden>
                                ·
                            </span>
                            {scenario.description}
                            {isSnapshotV1(conceptId) ? (
                                <>
                                    <span className="mx-2 text-amber-700" aria-hidden>
                                        ·
                                    </span>
                                    <span className="text-slate-900">Target Threads V1</span>
                                </>
                            ) : isSnapshotCandidate(conceptId) ? (
                                <>
                                    <span className="mx-2 text-amber-700" aria-hidden>
                                        ·
                                    </span>
                                    <span className="text-emerald-900">Archived candidate</span>
                                </>
                            ) : null}
                        </p>
                    </div>
                </div>
            </div>

            <AssessmentSnapshotView
                profile={snapshotProfile}
                displayContext={displayContext}
                cycleDateLabels={scenario.cycleDateLabels}
                concept={conceptId}
            />
        </div>
    );
}
