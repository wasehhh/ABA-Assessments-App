import { AssessmentCycle, AssessmentScore, ContentPackData } from '../types';
import {
    computePresentLevelsChange,
    ReportComparisonLine,
    ReportPriorCycleInput,
    ReportPresentLevelsChangeResult,
    REPORT_COMPARISON_METHOD,
} from '../utils/reportPresentLevelsChange';
import { ReportEmbeddedComputed, REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION } from './reportAuthoringTypes';

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
    scores: AssessmentScore[];
    priorCycles: ReportPriorCycleInput[];
    finalizedByUserId: string;
    authoringClinicianName: string | null;
    snapshotAt?: Date;
}

export class ReportEmbeddedComputedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ReportEmbeddedComputedError';
    }
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

function clientDisplayName(client?: { first_name?: string; last_name?: string }): string | null {
    if (!client) {
        return null;
    }
    return `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || null;
}

function mapComparisonLine(line: ReportComparisonLine): ReportComparisonLine {
    return {
        role: line.role,
        label_key: line.label_key,
        anchor_span: {
            earliest_cycle_number: line.anchor_span.earliest_cycle_number,
            latest_cycle_number: line.anchor_span.latest_cycle_number,
            earliest_date: line.anchor_span.earliest_date,
            latest_date: line.anchor_span.latest_date,
            available: line.anchor_span.available,
        },
        anchors_by_cycle_number: { ...line.anchors_by_cycle_number },
        skills_improved: line.skills_improved,
        skills_regressed: line.skills_regressed,
        newly_assessed: line.newly_assessed,
        no_longer_scored: line.no_longer_scored,
    };
}

function toEmbeddedPresentLevels(
    result: ReportPresentLevelsChangeResult
): ReportPresentLevelsChangeResult {
    if (result.comparison_method !== REPORT_COMPARISON_METHOD) {
        throw new ReportEmbeddedComputedError(
            'Cannot embed Present Levels: comparison_method is not per_target_last_and_first_scored.'
        );
    }

    if (result.mode === 'first_assessment') {
        if (result.first_assessment == null) {
            throw new ReportEmbeddedComputedError(
                'Cannot embed Present Levels: first_assessment mode is missing first_assessment counts.'
            );
        }
        return {
            mode: 'first_assessment',
            comparison_method: result.comparison_method,
            first_assessment: {
                statement_key: result.first_assessment.statement_key,
                counts: {
                    demonstrated: result.first_assessment.counts.demonstrated,
                    emerging: result.first_assessment.counts.emerging,
                    not_demonstrated: result.first_assessment.counts.not_demonstrated,
                    unscored: result.first_assessment.counts.unscored,
                },
            },
            comparisons: [],
        };
    }

    if (result.mode === 'single_comparison') {
        if (result.comparisons.length !== 1 || result.comparisons[0]?.role !== 'last_assessed') {
            throw new ReportEmbeddedComputedError(
                'Cannot embed Present Levels: single_comparison must contain exactly one last_assessed line.'
            );
        }
        return {
            mode: 'single_comparison',
            comparison_method: result.comparison_method,
            first_assessment: null,
            comparisons: [mapComparisonLine(result.comparisons[0])],
        };
    }

    if (result.mode === 'dual_comparison') {
        if (
            result.comparisons.length !== 2 ||
            result.comparisons[0]?.role !== 'last_assessed' ||
            result.comparisons[1]?.role !== 'first_assessed'
        ) {
            throw new ReportEmbeddedComputedError(
                'Cannot embed Present Levels: dual_comparison must contain last_assessed then first_assessed.'
            );
        }
        return {
            mode: 'dual_comparison',
            comparison_method: result.comparison_method,
            first_assessment: null,
            comparisons: result.comparisons.map(mapComparisonLine),
        };
    }

    throw new ReportEmbeddedComputedError('Cannot embed Present Levels: unrecognized mode.');
}

/**
 * Snapshots Overview metadata + Present Levels change results (contract §5.2.2 / INV-RA-G1).
 * Does not persist raw scores, per-target maps, target lists, or aggregate figures.
 */
export function buildEmbeddedComputedFromReportProfile(
    input: BuildEmbeddedComputedInput
): ReportEmbeddedComputed {
    if (input.cycle.cycle_number > 1 && input.priorCycles.length === 0) {
        throw new ReportEmbeddedComputedError(
            'Cannot embed Present Levels: cycle_number > 1 requires loaded prior cycles; empty priorCycles would misreport this as a first assessment.'
        );
    }

    const snapshotAt = input.snapshotAt ?? new Date();
    const pack = input.assessment.pack_snapshot;
    const presentLevels = toEmbeddedPresentLevels(
        computePresentLevelsChange({
            packSnapshot: pack,
            reportCycle: {
                cycle_id: input.cycle.id,
                cycle_number: input.cycle.cycle_number,
                start_date: input.cycle.start_date,
                end_date: input.cycle.end_date,
            },
            scores: input.scores,
            priorCycles: input.priorCycles,
        })
    );

    return {
        computed_schema_version: REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION,
        provenance: {
            snapshot_at: snapshotAt.toISOString(),
            pack_title: pack.title,
            pack_version: pack.version,
            assessment_id: input.assessment.id,
            cycle_id: input.cycle.id,
            cycle_number: input.cycle.cycle_number,
            pack_snapshot_frozen: true,
        },
        overview: {
            client_name: clientDisplayName(input.assessment.client),
            client_id: input.assessment.client_id ?? null,
            pack_title: pack.title,
            pack_version: pack.version,
            assessment_id: input.assessment.id,
            cycle_id: input.cycle.id,
            cycle_number: input.cycle.cycle_number,
            cycle_start_date: toIsoDate(input.cycle.start_date),
            cycle_end_date: toIsoDate(input.cycle.end_date),
            assessment_date: toIsoDate(input.assessment.assessment_date),
            authoring_clinician_name: input.authoringClinicianName,
            authoring_clinician_user_id: input.finalizedByUserId,
        },
        present_levels: presentLevels,
    };
}
