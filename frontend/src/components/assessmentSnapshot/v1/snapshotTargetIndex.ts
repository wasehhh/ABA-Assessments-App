import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { LearnerMapDomain, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { SnapshotLayoutMode } from '../../../utils/snapshotLayoutEngine';
import {
    isTargetIndexTrigger,
    resolveZoneThreadLabelDisplays,
} from './snapshotThreadDisplay';

/**
 * One Target Index row (§6.2). Presentational chrome — not evidence geometry.
 */
export interface SnapshotTargetIndexRow {
    displayedCode: string;
    authoredTargetId: string;
    authoredLabel: string;
    primaryGroupId: string;
    primaryGroupTitle: string;
    secondaryGroupId?: string;
    secondaryGroupTitle?: string;
}

export interface SnapshotTargetIndex {
    rows: SnapshotTargetIndexRow[];
}

/**
 * Canonical label mode for Target Index resolution (PR14A-3 / §6.7).
 * Print and export are the permanent filed artifacts; screen is the derived view.
 * Do not pass a surface-specific mode — screen and print must share one index.
 */
export const TARGET_INDEX_RESOLUTION_MODE: SnapshotLayoutMode = 'print';

function zoneSections(
    domain: LearnerMapDomain
): Array<{
    targets: LearnerMapTarget[];
    secondaryGroupId?: string;
    secondaryGroupTitle?: string;
}> {
    if (domain.targetSections && domain.targetSections.length > 0) {
        return domain.targetSections.map((section) => ({
            targets: section.targets,
            secondaryGroupId: section.secondaryGroupId,
            secondaryGroupTitle: section.secondaryGroupId ? section.title : undefined,
        }));
    }

    return [{ targets: domain.targets }];
}

/**
 * Build the Target Index when §6.3 trigger conditions are met; otherwise null.
 *
 * Ordering: authored pack order (primary → secondary → target) — INV-I4.
 * Label resolution reuses zone display helpers (compaction / disambiguation / fallback)
 * via {@link TARGET_INDEX_RESOLUTION_MODE} only — INV-I / §6.7 content identity.
 * Outside RenderPlan / PrintRenderPlan — INV-I6.
 */
export function buildSnapshotTargetIndex(
    profile: AssessmentSnapshotProfile
): SnapshotTargetIndex | null {
    const rows: SnapshotTargetIndexRow[] = [];
    let triggered = false;

    for (const domain of profile.domains) {
        for (const section of zoneSections(domain)) {
            const labels = resolveZoneThreadLabelDisplays(
                section.targets,
                TARGET_INDEX_RESOLUTION_MODE
            );

            section.targets.forEach((target, index) => {
                const label = labels[index]!;
                if (isTargetIndexTrigger(label)) {
                    triggered = true;
                }

                const row: SnapshotTargetIndexRow = {
                    displayedCode: label.visibleCode,
                    authoredTargetId: target.targetId,
                    authoredLabel: target.title.trim() || target.targetId,
                    primaryGroupId: domain.domainId,
                    primaryGroupTitle: domain.title,
                };

                if (section.secondaryGroupId) {
                    row.secondaryGroupId = section.secondaryGroupId;
                    row.secondaryGroupTitle = section.secondaryGroupTitle ?? section.secondaryGroupId;
                }

                rows.push(row);
            });
        }
    }

    if (!triggered || rows.length === 0) {
        return null;
    }

    return { rows };
}
