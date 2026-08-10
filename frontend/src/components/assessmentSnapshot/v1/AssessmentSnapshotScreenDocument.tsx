import { useMemo } from 'react';
import { buildSnapshotScreenPlanConfig } from '../../../hooks/snapshotViewport';
import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import {
    buildSnapshotRenderPlan,
    SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM,
} from '../../../utils/snapshotLayoutEngine';
import { LearnerMapDisplayContext } from '../../learnerMap/learnerMapDisplayContext';
import { AssessmentSnapshotHeader } from '../AssessmentSnapshotHeader';
import { AssessmentSnapshotCycleReference } from './AssessmentSnapshotCycleReference';
import { AssessmentSnapshotTargetIndexScreen } from './AssessmentSnapshotTargetIndexScreen';
import { AssessmentSnapshotTargetThreads } from './AssessmentSnapshotTargetThreads';
import { AssessmentSnapshotThreadsFooter } from './AssessmentSnapshotThreadsFooter';
import { AssessmentSnapshotThreadsLegend } from './AssessmentSnapshotThreadsLegend';
import { buildSnapshotTargetIndex } from './snapshotTargetIndex';

interface Props {
    profile: AssessmentSnapshotProfile;
    displayContext?: LearnerMapDisplayContext;
    cycleDateLabels?: Record<string, string>;
    generatedAtLabel: string;
    /**
     * Frozen screen packing width. HTML export and export-page preview use
     * {@link SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM}; live Snapshot may measure.
     */
    viewportWidthRem?: number;
}

/**
 * Screen-layout Snapshot evidence document (PR14B HTML channel).
 *
 * Packs via {@link buildSnapshotRenderPlan} at a frozen viewport — never via
 * PrintRenderPlan. Target Index is collapsible chrome, expanded in markup.
 */
export function AssessmentSnapshotScreenDocument({
    profile,
    displayContext,
    cycleDateLabels,
    generatedAtLabel,
    viewportWidthRem = SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM,
}: Props) {
    const renderPlan = useMemo(
        () =>
            buildSnapshotRenderPlan(
                profile,
                buildSnapshotScreenPlanConfig(viewportWidthRem)
            ),
        [profile, viewportWidthRem]
    );
    const targetIndex = useMemo(() => buildSnapshotTargetIndex(profile), [profile]);

    return (
        <div
            className="space-y-5"
            data-assessment-snapshot-screen-document
            data-assessment-snapshot-screen-viewport-rem={String(viewportWidthRem)}
            data-assessment-snapshot-layout-tier={renderPlan.tier}
            data-assessment-snapshot-topology={renderPlan.topology}
            data-assessment-snapshot-has-target-index={targetIndex ? 'true' : undefined}
        >
            <AssessmentSnapshotHeader
                profile={profile}
                generatedAtLabel={generatedAtLabel}
                displayContext={displayContext}
                variant="compact"
            />
            <AssessmentSnapshotCycleReference
                cycles={profile.cycles}
                cycleDateLabels={cycleDateLabels}
            />
            <AssessmentSnapshotThreadsLegend />
            <AssessmentSnapshotTargetThreads
                profile={profile}
                renderPlan={renderPlan}
                cycleDateLabels={cycleDateLabels}
            />
            {targetIndex ? (
                <AssessmentSnapshotTargetIndexScreen index={targetIndex} />
            ) : null}
            <AssessmentSnapshotThreadsFooter
                profile={profile}
                generatedAtLabel={generatedAtLabel}
            />
        </div>
    );
}
