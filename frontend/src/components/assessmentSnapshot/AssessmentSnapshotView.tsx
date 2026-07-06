import { AssessmentSnapshotProfile } from '../../services/assessmentSnapshotProfile';
import { LearnerMapDisplayContext } from '../learnerMap/learnerMapDisplayContext';
import {
    AssessmentSnapshotCandidateView,
    getSnapshotCandidate,
} from './candidates';
import {
    AssessmentSnapshotConceptId,
    AssessmentSnapshotConceptView,
    getSnapshotConcept,
    isSnapshotCandidate,
    isSnapshotV1,
    SNAPSHOT_V1_ID,
} from './concepts';
import { AssessmentSnapshotHeader } from './AssessmentSnapshotHeader';
import { AssessmentSnapshotLegend } from './AssessmentSnapshotLegend';
import {
    AssessmentSnapshotTargetThreads,
    AssessmentSnapshotThreadsFooter,
    AssessmentSnapshotThreadsLegend,
} from './v1';

interface Props {
    profile: AssessmentSnapshotProfile;
    displayContext?: LearnerMapDisplayContext;
    cycleDateLabels?: Record<string, string>;
    concept?: AssessmentSnapshotConceptId;
}

export function AssessmentSnapshotView({
    profile,
    displayContext,
    cycleDateLabels,
    concept = SNAPSHOT_V1_ID,
}: Props) {
    const generatedAt = new Date(profile.metadata.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const isV1 = isSnapshotV1(concept);
    const isCandidate = isSnapshotCandidate(concept);

    return (
        <article
            className={`mx-auto max-w-none space-y-3 bg-white px-4 py-5 text-gray-900 sm:px-6 print:space-y-2 print:px-4 print:py-3 ${
                isV1 ? 'assessment-snapshot-print' : ''
            }`}
            data-assessment-snapshot
            data-assessment-snapshot-document
            data-assessment-snapshot-concept={concept}
            data-assessment-snapshot-variant={isV1 ? 'target-threads-v1' : concept}
        >
            <AssessmentSnapshotHeader
                profile={profile}
                generatedAtLabel={generatedAt}
                displayContext={displayContext}
                variant={isV1 ? 'compact' : 'default'}
            />
            {!isV1 ? (
                <div
                    className="space-y-2 border-l-2 border-gray-300 pl-3 text-sm text-gray-600"
                    data-assessment-snapshot-concept-description
                >
                    {isCandidate ? (
                        <>
                            {(() => {
                                const candidateMeta = getSnapshotCandidate(concept);
                                return (
                                    <>
                                        <p>
                                            <span className="font-semibold text-gray-800">
                                                {candidateMeta.label}
                                            </span>
                                            <span className="mx-2 text-gray-400" aria-hidden>
                                                ·
                                            </span>
                                            {candidateMeta.description}
                                        </p>
                                        <dl className="grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
                                            <div>
                                                <dt className="font-semibold uppercase tracking-wide text-gray-500">
                                                    Organizing principle
                                                </dt>
                                                <dd>{candidateMeta.organizingPrinciple}</dd>
                                            </div>
                                            <div>
                                                <dt className="font-semibold uppercase tracking-wide text-gray-500">
                                                    Emphasis
                                                </dt>
                                                <dd>{candidateMeta.emphasis}</dd>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <dt className="font-semibold uppercase tracking-wide text-gray-500">
                                                    Differs from other candidates
                                                </dt>
                                                <dd>{candidateMeta.differsFrom}</dd>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <dt className="font-semibold uppercase tracking-wide text-gray-500">
                                                    Evaluation question
                                                </dt>
                                                <dd className="italic text-gray-700">
                                                    {candidateMeta.evaluationQuestion}
                                                </dd>
                                            </div>
                                        </dl>
                                    </>
                                );
                            })()}
                        </>
                    ) : (
                        <>
                            {(() => {
                                const conceptMeta = getSnapshotConcept(concept);
                                return (
                                    <>
                                        <p>
                                            <span className="font-semibold text-gray-800">
                                                {conceptMeta.label}
                                            </span>
                                            <span className="mx-2 text-gray-400" aria-hidden>
                                                ·
                                            </span>
                                            {conceptMeta.description}
                                        </p>
                                        <dl className="grid gap-1 text-xs text-gray-600 sm:grid-cols-2">
                                            <div>
                                                <dt className="font-semibold uppercase tracking-wide text-gray-500">
                                                    Organizing principle
                                                </dt>
                                                <dd>{conceptMeta.organizingPrinciple}</dd>
                                            </div>
                                            <div>
                                                <dt className="font-semibold uppercase tracking-wide text-gray-500">
                                                    Clinical reading pattern
                                                </dt>
                                                <dd>{conceptMeta.clinicalReadingPattern}</dd>
                                            </div>
                                        </dl>
                                    </>
                                );
                            })()}
                        </>
                    )}
                </div>
            ) : null}
            {isV1 ? <AssessmentSnapshotThreadsLegend /> : <AssessmentSnapshotLegend />}
            {isV1 ? (
                <AssessmentSnapshotTargetThreads
                    profile={profile}
                    cycleDateLabels={cycleDateLabels}
                />
            ) : isCandidate ? (
                <AssessmentSnapshotCandidateView
                    candidate={concept}
                    profile={profile}
                    cycleDateLabels={cycleDateLabels}
                />
            ) : (
                <AssessmentSnapshotConceptView
                    concept={concept}
                    profile={profile}
                    cycleDateLabels={cycleDateLabels}
                />
            )}
            {isV1 ? (
                <AssessmentSnapshotThreadsFooter
                    profile={profile}
                    generatedAtLabel={generatedAt}
                />
            ) : null}
        </article>
    );
}
