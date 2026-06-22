import { LearnerMapCycleSummary, LearnerMapProfile } from '../../services/learnerMapProfile';
import {
    LEARNER_MAP_CLINICAL_DISCLAIMER,
    LearnerMapDisplayContext,
} from './learnerMapDisplayContext';

interface Props {
    profile: LearnerMapProfile;
    cycleRangeLabel: string;
    generatedAtLabel: string;
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

export function LearnerMapArtifactHeader({
    profile,
    cycleRangeLabel,
    generatedAtLabel,
    displayContext,
}: Props) {
    const { metadata, cycles, totals } = profile;
    const learnerName = displayContext?.learnerName ?? '—';
    const assessmentName =
        displayContext?.assessmentName ?? `Assessment ${metadata.assessmentId}`;
    const organizationName = displayContext?.organizationName?.trim() || '—';
    const cycleRangeDetail = formatCycleRange(cycles);
    const packTitle = metadata.packTitle?.trim() || '—';
    const packVersion = metadata.packVersion?.trim() || '—';

    return (
        <header className="space-y-5" data-learner-map-export-artifact-header>
            <div
                className="rounded-lg border border-gray-300 bg-white px-5 py-5 shadow-sm"
                data-learner-map-export-artifact-title
            >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            Evalis · Clinical Artifact
                        </p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                            Learner Map
                        </h1>
                        <p className="mt-1 text-base font-medium text-gray-800">
                            Longitudinal Competency Record
                        </p>
                    </div>
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 lg:min-w-[16rem]">
                        <dl className="space-y-2" data-learner-map-export-artifact-identity>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Learner
                                </dt>
                                <dd className="mt-0.5 font-medium leading-snug">{learnerName}</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Organization
                                </dt>
                                <dd className="mt-0.5 font-medium leading-snug">{organizationName}</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Assessment
                                </dt>
                                <dd className="mt-0.5 font-medium leading-snug">{assessmentName}</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Assessment Pack
                                </dt>
                                <dd className="mt-0.5 leading-snug">
                                    {packTitle}{' '}
                                    <span className="text-gray-600">(v{packVersion})</span>
                                </dd>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Cycle Range
                                    </dt>
                                    <dd className="mt-0.5 tabular-nums font-medium">{cycleRangeLabel}</dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Total Cycles
                                    </dt>
                                    <dd className="mt-0.5 tabular-nums font-medium">
                                        {totals.totalCycles}
                                    </dd>
                                </div>
                            </div>
                        </dl>
                    </div>
                </div>

                {displayContext?.isMockData ? (
                    <p
                        className="no-print mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                        data-learner-map-export-mock-banner
                    >
                        Mock metadata — values shown for development preview only.
                    </p>
                ) : null}
            </div>

            <section
                className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm"
                data-learner-map-export-record-metadata
            >
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900">
                    Record metadata
                </h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Learner
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900">{learnerName}</dd>
                    </div>
                    <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Assessment
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900">{assessmentName}</dd>
                    </div>
                    <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Assessment Pack
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900">
                            {packTitle}{' '}
                            <span className="font-normal text-gray-600">v{packVersion}</span>
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Organization
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900">{organizationName}</dd>
                    </div>
                    <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Cycle Range
                        </dt>
                        <dd className="mt-1 text-sm font-medium tabular-nums text-gray-900">
                            {cycleRangeDetail}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Generated Date
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900">{generatedAtLabel}</dd>
                    </div>
                </dl>
            </section>

            <section
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                aria-label="Clinical framing"
                data-learner-map-export-clinical-framing
            >
                <p className="text-xs leading-relaxed text-gray-700">{LEARNER_MAP_CLINICAL_DISCLAIMER}</p>
            </section>
        </header>
    );
}
