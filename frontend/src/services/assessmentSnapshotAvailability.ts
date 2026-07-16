import { ContentPackData } from '../types';
import { AssessmentSnapshotProfile } from './assessmentSnapshotProfile';
import { LearnerMapProfile } from './learnerMapProfile';

export type SnapshotAvailabilityCode =
    | 'available'
    | 'not_found'
    | 'missing_pack'
    | 'no_domains'
    | 'no_targets'
    | 'no_cycles';

export interface SnapshotAvailability {
    available: boolean;
    code: SnapshotAvailabilityCode;
    reason?: string;
}

export interface SnapshotAvailabilityInput {
    assessment: {
        id?: string;
        pack_snapshot?: ContentPackData | null;
    } | null;
    cycleCount: number;
}

/**
 * Production gate for Assessment Snapshot.
 * Unscored evidence is allowed — unscored cells are valid raw evidence when a cycle exists.
 */
export function getAssessmentSnapshotAvailability(
    input: SnapshotAvailabilityInput
): SnapshotAvailability {
    if (!input.assessment) {
        return {
            available: false,
            code: 'not_found',
            reason: 'Assessment not found.',
        };
    }

    const pack = input.assessment.pack_snapshot;
    if (!pack) {
        return {
            available: false,
            code: 'missing_pack',
            reason: 'This assessment has no pack snapshot to render.',
        };
    }

    if (!pack.domains?.length) {
        return {
            available: false,
            code: 'no_domains',
            reason: 'This assessment has no domains or primary groups.',
        };
    }

    const targetCount = pack.domains.reduce(
        (sum, domain) => sum + (domain.targets?.length ?? 0),
        0
    );
    if (targetCount === 0) {
        return {
            available: false,
            code: 'no_targets',
            reason: 'This assessment has no targets to display.',
        };
    }

    if (input.cycleCount < 1) {
        return {
            available: false,
            code: 'no_cycles',
            reason: 'Assessment Snapshot becomes available after at least one cycle exists.',
        };
    }

    return { available: true, code: 'available' };
}

export function profileHasAnyScoredEvidence(
    profile: AssessmentSnapshotProfile | LearnerMapProfile
): boolean {
    return profile.domains.some((domain) =>
        domain.targets.some((target) => target.cells.some((cell) => !cell.isUnscored))
    );
}

export function buildAssessmentSnapshotRouteHash(assessmentId: string): string {
    return `#/assessment/${assessmentId}/snapshot`;
}
