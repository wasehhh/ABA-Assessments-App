import { useMemo, useRef } from 'react';
import { useContainerWidthRem } from '../../hooks/useContainerWidthRem';
import { AssessmentSnapshotProfile } from '../../services/assessmentSnapshotProfile';
import { SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM } from '../../utils/snapshotLayoutEngine';
import { buildPrintRenderPlan } from '../../utils/snapshotPrintRenderPlan';
import { AssessmentSnapshotPrintDocument } from './print/AssessmentSnapshotPrintDocument';
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
import { AssessmentSnapshotScreenDocument } from './v1/AssessmentSnapshotScreenDocument';

/**
 * Assessment Snapshot V1 — dual render surface.
 *
 * Screen: measured-width screen RenderPlan via {@link AssessmentSnapshotScreenDocument}.
 * Print: {@link buildPrintRenderPlan} → {@link AssessmentSnapshotPrintDocument}
 * (explicit pages / columns / domain segments). Pipelines are intentionally separate.
 */
interface Props {
    profile: AssessmentSnapshotProfile;
    displayContext?: LearnerMapDisplayContext;
    cycleDateLabels?: Record<string, string>;
    concept?: AssessmentSnapshotConceptId;
    /** When true (default for V1), screen packing uses measured container width. */
    measureScreenViewport?: boolean;
    /** When false, evidence-bead numerals are visually suppressed (scan view). */
    showScores?: boolean;
}

export function AssessmentSnapshotView({
    profile,
    displayContext,
    cycleDateLabels,
    concept = SNAPSHOT_V1_ID,
    measureScreenViewport = true,
    showScores = true,
}: Props) {
    const generatedAt = new Date(profile.metadata.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const isV1 = isSnapshotV1(concept);
    const isCandidate = isSnapshotCandidate(concept);
    const measureRef = useRef<HTMLDivElement>(null);
    const measuredViewportRem = useContainerWidthRem(measureRef, {
        fallbackRem: SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM,
        thresholdRem: 0.5,
    });
    const screenViewportRem =
        isV1 && measureScreenViewport
            ? measuredViewportRem
            : SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM;

    const printRenderPlan = useMemo(
        () => (isV1 ? buildPrintRenderPlan(profile, { paper: 'letter' }) : null),
        [isV1, profile]
    );

    return (
        <article
            className={`mx-auto max-w-none bg-white px-4 py-5 text-gray-900 sm:px-6 print:px-3 print:py-2 ${
                isV1 ? 'assessment-snapshot-print' : 'space-y-3 print:space-y-2'
            }`}
            data-assessment-snapshot
            data-assessment-snapshot-document
            data-assessment-snapshot-concept={concept}
            data-assessment-snapshot-variant={isV1 ? 'target-threads-v1' : concept}
            data-assessment-snapshot-screen-viewport-rem={
                isV1 ? String(screenViewportRem) : undefined
            }
        >
            <div
                ref={isV1 && measureScreenViewport ? measureRef : undefined}
                className={isV1 ? 'assessment-snapshot-screen-only print:hidden' : 'space-y-3'}
                data-assessment-snapshot-measure={isV1 ? 'true' : undefined}
            >
                {isV1 ? (
                    <AssessmentSnapshotScreenDocument
                        profile={profile}
                        displayContext={displayContext}
                        cycleDateLabels={cycleDateLabels}
                        generatedAtLabel={generatedAt}
                        viewportWidthRem={screenViewportRem}
                        showScores={showScores}
                    />
                ) : (
                    <>
                        <AssessmentSnapshotHeader
                            profile={profile}
                            generatedAtLabel={generatedAt}
                            displayContext={displayContext}
                            variant="default"
                        />
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
                        <AssessmentSnapshotLegend />
                        {isCandidate ? (
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
                    </>
                )}
            </div>
            {isV1 && printRenderPlan ? (
                <div
                    className="assessment-snapshot-print-only hidden print:block"
                    aria-hidden="true"
                    data-assessment-snapshot-print-surface
                >
                    <AssessmentSnapshotPrintDocument
                        profile={profile}
                        plan={printRenderPlan}
                        generatedAtLabel={generatedAt}
                        displayContext={displayContext}
                        cycleDateLabels={cycleDateLabels}
                        showScores={showScores}
                    />
                </div>
            ) : null}
        </article>
    );
}
