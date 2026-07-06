import { AssessmentSnapshotProfile } from '../../services/assessmentSnapshotProfile';
import { LearnerMapDisplayContext } from '../learnerMap/learnerMapDisplayContext';

interface Props {
    profile: AssessmentSnapshotProfile;
    generatedAtLabel: string;
    displayContext?: LearnerMapDisplayContext;
    variant?: 'default' | 'compact';
}

export function AssessmentSnapshotHeader({
    profile,
    generatedAtLabel,
    displayContext,
    variant = 'default',
}: Props) {
    const learnerName = displayContext?.learnerName ?? '—';
    const assessmentName =
        displayContext?.assessmentName ?? `Assessment ${profile.metadata.assessmentId}`;
    const packLabel = `${profile.metadata.packTitle} (v${profile.metadata.packVersion})`;

    if (variant === 'compact') {
        return (
            <header
                className="space-y-1.5 border-b border-gray-300 pb-2 print:border-gray-400 print:pb-1.5"
                data-assessment-snapshot-header
            >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500 print:text-[8px] print:text-black">
                            Assessment Snapshot
                        </p>
                        <h1
                            className="truncate text-sm font-semibold leading-tight text-gray-900 print:text-xs print:text-black"
                            title={assessmentName}
                        >
                            {assessmentName}
                        </h1>
                    </div>
                    <p className="shrink-0 text-[9px] tabular-nums text-gray-500 print:text-[8px] print:text-black">
                        Generated {generatedAtLabel}
                    </p>
                </div>
                <dl className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-800 print:text-[9px] print:text-black">
                    <div className="inline-flex min-w-0 gap-1">
                        <dt className="shrink-0 font-semibold text-gray-500">Learner</dt>
                        <dd className="truncate" title={learnerName}>
                            {learnerName}
                        </dd>
                    </div>
                    <div className="inline-flex min-w-0 gap-1">
                        <dt className="shrink-0 font-semibold text-gray-500">Pack</dt>
                        <dd className="truncate" title={packLabel}>
                            {packLabel}
                        </dd>
                    </div>
                    <div className="inline-flex gap-1 tabular-nums">
                        <dt className="font-semibold text-gray-500">Cycles</dt>
                        <dd>{profile.cycles.length}</dd>
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
