import { AssessmentSnapshotProfile } from '../../services/assessmentSnapshotProfile';
import { LearnerMapDisplayContext } from '../learnerMap/learnerMapDisplayContext';
import { formatCycleScopeLineValue } from './v1/snapshotCycleScope';

interface Props {
    profile: AssessmentSnapshotProfile;
    generatedAtLabel: string;
    displayContext?: LearnerMapDisplayContext;
    variant?: 'default' | 'compact';
    /** Unfiltered assessment cycle count for the Cycles metadata field (§5.1). */
    assessmentCycleCount?: number;
}

export function AssessmentSnapshotHeader({
    profile,
    generatedAtLabel,
    displayContext,
    variant = 'default',
    assessmentCycleCount,
}: Props) {
    const learnerName = displayContext?.learnerName ?? '—';
    const assessmentName =
        displayContext?.assessmentName ?? `Assessment ${profile.metadata.assessmentId}`;
    const packLabel = `${profile.metadata.packTitle} (v${profile.metadata.packVersion})`;
    const totalCycles = assessmentCycleCount ?? profile.cycles.length;
    const cyclesValue = formatCycleScopeLineValue(profile.cycles, totalCycles);

    if (variant === 'compact') {
        return (
            <header
                className="space-y-2 border-b border-gray-200 pb-3 print:space-y-1 print:border-gray-400 print:pb-1.5"
                data-assessment-snapshot-header
            >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                        <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-gray-400 print:text-[8px] print:text-black">
                            Assessment Snapshot
                        </p>
                        <h2
                            className="mt-0.5 text-lg font-semibold leading-snug tracking-tight text-gray-900 print:text-base print:text-black"
                            title={assessmentName}
                        >
                            {assessmentName}
                        </h2>
                    </div>
                    <p className="shrink-0 text-[9px] tabular-nums text-gray-400 print:text-[8px] print:text-black">
                        Generated {generatedAtLabel}
                    </p>
                </div>
                <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-gray-600 print:text-[9px] print:text-black">
                    <div className="inline-flex min-w-0 gap-1.5">
                        <dt className="shrink-0 text-gray-400">Learner</dt>
                        <dd className="truncate text-gray-800" title={learnerName}>
                            {learnerName}
                        </dd>
                    </div>
                    <div className="inline-flex min-w-0 gap-1.5">
                        <dt className="shrink-0 text-gray-400">Pack</dt>
                        <dd className="truncate text-gray-800" title={packLabel}>
                            {packLabel}
                        </dd>
                    </div>
                    <div className="inline-flex gap-1.5 tabular-nums">
                        <dt className="text-gray-400">Cycles</dt>
                        <dd className="text-gray-800" data-assessment-snapshot-cycle-scope>
                            {cyclesValue}
                        </dd>
                    </div>
                </dl>
                {displayContext?.isMockData ? (
                    <p className="no-print rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-900">
                        Mock data — development preview only.
                    </p>
                ) : null}
            </header>
        );
    }

    return (
        <header
            className="space-y-3 border-b border-gray-300 pb-4"
            data-assessment-snapshot-header
        >
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                    Assessment Snapshot
                </p>
                <h1 className="mt-1 text-xl font-bold text-gray-900">Raw score grid</h1>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Learner
                    </dt>
                    <dd className="font-medium text-gray-900">{learnerName}</dd>
                </div>
                <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Assessment
                    </dt>
                    <dd className="font-medium text-gray-900">{assessmentName}</dd>
                </div>
                <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Pack
                    </dt>
                    <dd className="font-medium text-gray-900">{packLabel}</dd>
                </div>
                <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Generated
                    </dt>
                    <dd className="font-medium tabular-nums text-gray-900">{generatedAtLabel}</dd>
                </div>
            </dl>
            {displayContext?.isMockData ? (
                <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                    Mock data — development preview only.
                </p>
            ) : null}
        </header>
    );
}
