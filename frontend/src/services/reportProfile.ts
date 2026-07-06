import { AssessmentCycle, AssessmentScore, ContentPackData, StructureLabels } from '../types';
import {
    AssessmentLandscapeRollup,
    buildAssessmentLandscapeRollup,
} from './assessmentLandscape';
import {
    buildDomainProfiles,
    DomainProfile,
    StateDistribution,
} from './domainProfile';
import { CompetencyState } from '../utils/scoreInterpretation';
import {
    buildReadSurfaceTargetSections,
    getPackStructureLabels,
    ReadSurfaceTargetSection,
} from '../utils/readSurfaceDisplay';

export type ReportTargetSection = ReadSurfaceTargetSection<ReportTargetRow>;

export interface ReportProfileMetadata {
    assessmentId: string;
    assessmentTitle: string;
    packTitle: string;
    packVersion: string;
    assessmentStatus: string | null;
    assessmentDate: string | null;
    clientId: string | null;
    clientName: string | null;
    cycleId: string | null;
    cycleNumber: number | null;
    cycleStatus: string | null;
    generatedAt: string;
}

export interface ReportTargetRow {
    targetId: string;
    title: string;
    score: number | null;
    displayScoreWithMax: string;
    competencyState: CompetencyState;
    normalizedRatio: number | null;
    note: string | null;
}

export interface ReportDomainSection {
    profile: DomainProfile;
    targets: ReportTargetRow[];
    targetSections?: ReportTargetSection[];
}

export interface ReportProfile {
    metadata: ReportProfileMetadata;
    structureLabels: StructureLabels;
    rollup: AssessmentLandscapeRollup;
    assessmentBandDistribution: StateDistribution;
    domains: ReportDomainSection[];
}

export interface BuildReportProfileInput {
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
    cycle?: Pick<AssessmentCycle, 'id' | 'cycle_number' | 'status'> | null;
    scores: AssessmentScore[];
    previousScores?: AssessmentScore[];
    generatedAt?: Date;
}

function aggregateAssessmentBandDistribution(
    profiles: DomainProfile[]
): StateDistribution {
    const totals = {
        unscored: 0,
        not_yet: 0,
        in_progress: 0,
        at_maximum: 0,
        showsInProgressBucket: false,
    };

    profiles.forEach((profile) => {
        totals.unscored += profile.stateDistribution.unscored;
        totals.not_yet += profile.stateDistribution.not_yet;
        totals.in_progress += profile.stateDistribution.in_progress;
        totals.at_maximum += profile.stateDistribution.at_maximum;

        if (profile.stateDistribution.showsInProgressBucket) {
            totals.showsInProgressBucket = true;
        }
    });

    return totals;
}

function buildMetadata(
    input: BuildReportProfileInput,
    generatedAt: Date
): ReportProfileMetadata {
    const { assessment, cycle } = input;
    const clientName = assessment.client
        ? `${assessment.client.first_name ?? ''} ${assessment.client.last_name ?? ''}`.trim() || null
        : null;

    return {
        assessmentId: assessment.id,
        assessmentTitle: assessment.pack_snapshot.title,
        packTitle: assessment.pack_snapshot.title,
        packVersion: assessment.pack_snapshot.version,
        assessmentStatus: assessment.status ?? null,
        assessmentDate: assessment.assessment_date ?? null,
        clientId: assessment.client_id ?? null,
        clientName,
        cycleId: cycle?.id ?? null,
        cycleNumber: cycle?.cycle_number ?? null,
        cycleStatus: cycle?.status ?? null,
        generatedAt: generatedAt.toISOString(),
    };
}

function buildReportTargetRows(
    profile: DomainProfile,
    scores: AssessmentScore[]
): ReportTargetRow[] {
    const scoreByTargetId = new Map(scores.map((row) => [row.target_id, row]));

    return profile.sequence.map(({ target, interpretation }) => ({
        targetId: target.target_id,
        title: target.title,
        score: interpretation.rawScore,
        displayScoreWithMax: interpretation.displayScoreWithMax,
        competencyState: interpretation.competencyState,
        normalizedRatio: interpretation.normalizedRatio,
        note: scoreByTargetId.get(target.target_id)?.note ?? null,
    }));
}

/**
 * Composes report-ready data from existing domain profile and landscape services.
 * Composition layer only — does not duplicate score interpretation or analytics logic.
 */
export function buildReportProfile(input: BuildReportProfileInput): ReportProfile {
    const generatedAt = input.generatedAt ?? new Date();
    const structureLabels = getPackStructureLabels(input.assessment.pack_snapshot);
    const domainProfiles = buildDomainProfiles(
        input.assessment.pack_snapshot,
        input.scores,
        input.previousScores
    );
    const rollup = buildAssessmentLandscapeRollup(domainProfiles);
    const packDomainsById = new Map(
        input.assessment.pack_snapshot.domains.map((domain) => [domain.domain_id, domain])
    );

    return {
        metadata: buildMetadata(input, generatedAt),
        structureLabels,
        rollup,
        assessmentBandDistribution: aggregateAssessmentBandDistribution(domainProfiles),
        domains: domainProfiles.map((profile) => {
            const targets = buildReportTargetRows(profile, input.scores);
            const packDomain = packDomainsById.get(profile.domainId);
            const targetsById = new Map(targets.map((row) => [row.targetId, row]));

            return {
                profile,
                targets,
                targetSections: packDomain
                    ? buildReadSurfaceTargetSections(packDomain, targetsById)
                    : undefined,
            };
        }),
    };
}
