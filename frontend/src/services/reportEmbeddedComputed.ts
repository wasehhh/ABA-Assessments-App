import { AssessmentCycle, ContentPackData } from '../types';
import { buildReportProfile, ReportProfile } from './reportProfile';
import {
    ReportEmbeddedComputed,
    ReportEmbeddedPresentLevelsDomainSummaryRow,
    ReportEmbeddedTargetSkillRow,
} from './reportAuthoringTypes';

export interface BuildEmbeddedComputedInput {
    assessment: {
        id: string;
        client_id?: string;
        pack_snapshot: ContentPackData;
        assessment_date?: string | null;
        status?: string | null;
        client?: {
            first_name?: string;
            last_name?: string;
        };
    };
    cycle: Pick<AssessmentCycle, 'id' | 'cycle_number' | 'status' | 'start_date' | 'end_date'>;
    scores: Parameters<typeof buildReportProfile>[0]['scores'];
    previousScores?: Parameters<typeof buildReportProfile>[0]['previousScores'];
    finalizedByUserId: string;
    authoringClinicianName: string | null;
    snapshotAt?: Date;
}

function toIsoDate(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toISOString().slice(0, 10);
}

function mapTargetSkillRows(
    reportProfile: ReportProfile
): ReportEmbeddedComputed['target_skills']['domains'] {
    return reportProfile.domains.map((section) => ({
        domain_id: section.profile.domainId,
        title: section.profile.title,
        targets: section.targets.map(
            (target): ReportEmbeddedTargetSkillRow => ({
                target_id: target.targetId,
                title: target.title,
                display_score_with_max: target.displayScoreWithMax,
                competency_state: target.competencyState,
                normalized_ratio: target.normalizedRatio,
            })
        ),
    }));
}

function mapPresentLevelsDomains(
    reportProfile: ReportProfile
): ReportEmbeddedPresentLevelsDomainSummaryRow[] {
    return reportProfile.domains.map((section) => ({
        domain_id: section.profile.domainId,
        title: section.profile.title,
        coverage: {
            scored: section.profile.coverage.scored,
            total: section.profile.coverage.total,
        },
        points_captured_percentage: section.profile.pointsCaptured.percentage,
        state_distribution: section.profile.stateDistribution,
    }));
}

/**
 * Projects buildReportProfile() output into embedded_computed (contract §5.2.2 / INV-RA-G1).
 * Matrix score notes are excluded from target_skills (prior OQ-7).
 */
export function buildEmbeddedComputedFromReportProfile(
    input: BuildEmbeddedComputedInput
): ReportEmbeddedComputed {
    const snapshotAt = input.snapshotAt ?? new Date();
    const reportProfile = buildReportProfile({
        assessment: input.assessment,
        cycle: input.cycle,
        scores: input.scores,
        previousScores: input.previousScores,
        generatedAt: snapshotAt,
    });

    const metadata = reportProfile.metadata;

    return {
        provenance: {
            snapshot_at: snapshotAt.toISOString(),
            pack_title: metadata.packTitle,
            pack_version: metadata.packVersion,
            assessment_id: input.assessment.id,
            cycle_id: input.cycle.id,
            cycle_number: input.cycle.cycle_number,
            pack_snapshot_frozen: true,
        },
        overview: {
            client_name: metadata.clientName,
            client_id: metadata.clientId,
            pack_title: metadata.packTitle,
            pack_version: metadata.packVersion,
            assessment_id: input.assessment.id,
            cycle_id: input.cycle.id,
            cycle_number: input.cycle.cycle_number,
            cycle_start_date: toIsoDate(input.cycle.start_date),
            cycle_end_date: toIsoDate(input.cycle.end_date),
            assessment_date: toIsoDate(metadata.assessmentDate),
            authoring_clinician_name: input.authoringClinicianName,
            authoring_clinician_user_id: input.finalizedByUserId,
        },
        present_levels: {
            rollup: reportProfile.rollup,
            assessment_band_distribution: reportProfile.assessmentBandDistribution,
            domains: mapPresentLevelsDomains(reportProfile),
        },
        target_skills: {
            domains: mapTargetSkillRows(reportProfile),
        },
    };
}
