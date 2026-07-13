import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { LearnerMapCell, LearnerMapTarget } from '../../../services/learnerMapProfile';
import {
    DomainZonePlan,
    EvidenceMarkPlan,
} from '../../../utils/snapshotLayoutEngine';

export function buildTargetByIdMap(
    profile: AssessmentSnapshotProfile
): Map<string, LearnerMapTarget> {
    const targetsById = new Map<string, LearnerMapTarget>();

    for (const domain of profile.domains) {
        for (const target of domain.targets) {
            targetsById.set(target.targetId, target);
        }
    }

    return targetsById;
}

export function resolveBeadCell(
    mark: EvidenceMarkPlan,
    target: LearnerMapTarget | undefined
): LearnerMapCell {
    const fromProfile = target?.cells.find((cell) => cell.cycleId === mark.cycleId);
    if (fromProfile) {
        return fromProfile;
    }

    return {
        cycleId: mark.cycleId,
        cycleNumber: mark.cycleNumber,
        rawScore: null,
        displayScoreWithMax: mark.displayScoreWithMax,
        competencyState: mark.competencyState,
        normalizedRatio: null,
        isUnscored: mark.isUnscored,
        movementFromPrevious: 'none',
    };
}

export function zoneTargetCount(zone: DomainZonePlan): number {
    return zone.parts.reduce(
        (partSum, part) =>
            partSum +
            part.secondarySections.reduce(
                (sectionSum, section) => sectionSum + section.threads.length,
                0
            ),
        0
    );
}

export function shouldRenderSecondaryHeader(title: string): boolean {
    return title.length > 0;
}
