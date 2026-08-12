import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { LearnerMapDisplayContext } from '../../learnerMap/learnerMapDisplayContext';
import { AssessmentSnapshotCycleReference } from '../v1/AssessmentSnapshotCycleReference';
import { AssessmentSnapshotThreadsLegend } from '../v1/AssessmentSnapshotThreadsLegend';
import {
    resolveSnapshotPrintIdentity,
    SNAPSHOT_PRINT_ARTIFACT_LABEL,
} from './printClinicalChrome';

interface Props {
    profile: AssessmentSnapshotProfile;
    generatedAtLabel: string;
    displayContext?: LearnerMapDisplayContext;
    cycleDateLabels?: Record<string, string>;
    showScores?: boolean;
}

/**
 * First-page document header — full clinical metadata, Cycle Reference, and legend.
 * Organization is shown only when production context provides it.
 */
export function PrintDocumentHeader({
    profile,
    generatedAtLabel,
    displayContext,
    cycleDateLabels,
    showScores = true,
}: Props) {
    const identity = resolveSnapshotPrintIdentity(profile, displayContext);

    return (
        <div
            className="assessment-snapshot-print-document-header space-y-2"
            data-assessment-snapshot-print-document-header
        >
            <header
                className="space-y-1.5 border-b border-gray-400 pb-1.5"
                data-assessment-snapshot-header
                data-assessment-snapshot-print-header="document"
            >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <div className="min-w-0">
                        <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black">
                            {SNAPSHOT_PRINT_ARTIFACT_LABEL}
                        </p>
                        <h1
                            className="mt-0.5 text-[15px] font-semibold leading-snug tracking-tight text-black"
                            title={identity.assessmentName}
                        >
                            {identity.assessmentName}
                        </h1>
                    </div>
                    <p className="shrink-0 text-[8px] tabular-nums text-gray-700">
                        Generated {generatedAtLabel}
                    </p>
                </div>

                <dl
                    className="flex flex-wrap gap-x-3.5 gap-y-0.5 text-[9px] text-black"
                    data-assessment-snapshot-print-metadata
                >
                    <div className="inline-flex min-w-0 gap-1">
                        <dt className="shrink-0 font-medium text-gray-600">Learner</dt>
                        <dd className="truncate font-medium" title={identity.learnerName}>
                            {identity.learnerName}
                        </dd>
                    </div>
                    {identity.organizationName ? (
                        <div className="inline-flex min-w-0 gap-1">
                            <dt className="shrink-0 font-medium text-gray-600">Organization</dt>
                            <dd
                                className="truncate font-medium"
                                title={identity.organizationName}
                            >
                                {identity.organizationName}
                            </dd>
                        </div>
                    ) : null}
                    <div className="inline-flex min-w-0 gap-1">
                        <dt className="shrink-0 font-medium text-gray-600">Pack</dt>
                        <dd className="truncate font-medium" title={identity.packLabel}>
                            {identity.packLabel}
                        </dd>
                    </div>
                    <div className="inline-flex gap-1 tabular-nums">
                        <dt className="font-medium text-gray-600">Cycles</dt>
                        <dd className="font-medium">{identity.cycleCount}</dd>
                    </div>
                </dl>

                {displayContext?.isMockData ? (
                    <p className="no-print rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-900">
                        Mock data — development preview only.
                    </p>
                ) : null}
            </header>

            <AssessmentSnapshotCycleReference
                cycles={profile.cycles}
                cycleDateLabels={cycleDateLabels}
            />
            <AssessmentSnapshotThreadsLegend showScores={showScores} />
        </div>
    );
}
