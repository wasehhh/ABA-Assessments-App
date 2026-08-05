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
 * Label resolution reuses zone display helpers (compaction / disambiguation / fallback).
 * Outside RenderPlan / PrintRenderPlan — INV-I6.
 */
export function buildSnapshotTargetIndex(
    profile: AssessmentSnapshotProfile,
    mode: SnapshotLayoutMode = 'print'
): SnapshotTargetIndex | null {
    const rows: SnapshotTargetIndexRow[] = [];
    let triggered = false;

    for (const domain of profile.domains) {
        for (const section of zoneSections(domain)) {
            const labels = resolveZoneThreadLabelDisplays(section.targets, mode);

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
