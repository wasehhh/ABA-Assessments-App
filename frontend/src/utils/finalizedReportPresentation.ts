import { ReportDomainSection } from '../services/reportProfile';
import {
    AssessmentCommunicationReport,
    ReportEmbeddedComputed,
    ReportEmbeddedPresentLevels,
    ReportEmbeddedPresentLevelsChange,
    ReportEmbeddedPresentLevelsDomainSummaryRow,
    REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION,
    ReportTargetTimeframe,
} from '../services/reportAuthoringTypes';
import { StructureLabels } from '../types';
import {
    REPORT_COMPARISON_METHOD,
    ReportAnchorSpan,
} from './reportPresentLevelsChange';

/** Interim first-assessment framing (OQ-RA10 — founder owns final copy). */
export const FIRST_ASSESSMENT_STATEMENT =
    'This is a first assessment (baseline administration).';

/** Interim comparison line titles (OQ-RA10 / §1.8.8 — not cycle-named). */
export const PRESENT_LEVELS_LINE_LABELS = {
    since_last_assessed: 'Since each skill was last assessed',
    since_first_assessed: 'Since each skill was first assessed',
} as const;

export const PRESENT_LEVELS_TRANSITION_METRICS = [
    { key: 'skills_improved', label: 'Skills improved' },
    { key: 'skills_regressed', label: 'Skills regressed' },
    { key: 'newly_assessed', label: 'Newly assessed' },
    { key: 'no_longer_scored', label: 'No longer scored' },
] as const;

export const FIRST_ASSESSMENT_COUNT_ORDER = [
    { key: 'demonstrated', state: 'at_maximum' },
    { key: 'emerging', state: 'in_progress' },
    { key: 'not_demonstrated', state: 'not_yet' },
    { key: 'unscored', state: 'unscored' },
] as const;

/** Fixed six-section render order (contract §5.2). */
export const FINALIZED_REPORT_SECTION_ORDER = [
    'overview',
    'present_levels',
    'target_skills',
    'measurable_treatment_goals',
    'recommended_therapy_hours',
    'clinical_summary',
] as const;

export type FinalizedReportSectionId = (typeof FINALIZED_REPORT_SECTION_ORDER)[number];

export function formatReportTargetTimeframe(timeframe: ReportTargetTimeframe): string {
    switch (timeframe) {
        case '3_months':
            return '3 months';
        case '6_months':
            return '6 months';
        case '12_months':
            return '12 months';
        default:
            return timeframe;
    }
}

export function presentLevelsDomainsToReportSections(
    domains: ReportEmbeddedPresentLevelsDomainSummaryRow[]
): ReportDomainSection[] {
    return domains.map((row) => ({
        profile: {
            domainId: row.domain_id,
            title: row.title,
            coverage: row.coverage,
            pointsCaptured: {
                earned: 0,
                available: 0,
                percentage: row.points_captured_percentage,
            },
            stateDistribution: row.state_distribution,
            cycleDelta: null,
            sequence: [],
        },
        targets: [],
    }));
}

export function isPresentLevelsChangeMetrics(
    presentLevels: ReportEmbeddedPresentLevels
): presentLevels is ReportEmbeddedPresentLevelsChange {
    return (
        presentLevels != null &&
        typeof presentLevels === 'object' &&
        'mode' in presentLevels &&
        'comparison_method' in presentLevels &&
        (presentLevels.mode === 'first_assessment' ||
            presentLevels.mode === 'single_comparison' ||
            presentLevels.mode === 'dual_comparison') &&
        presentLevels.comparison_method === REPORT_COMPARISON_METHOD
    );
}

export type PresentLevelsRenderSelection =
    | { kind: 'change_metrics'; presentLevels: ReportEmbeddedPresentLevelsChange }
    | { kind: 'legacy' }
    | { kind: 'corrupt' };

/** Visible when a row declares the change-metric schema but cannot satisfy it. */
export const PRESENT_LEVELS_CORRUPT_EMBED_MESSAGE =
    'Present Levels cannot be displayed: this document declares computed_schema_version 5 but the change-metric payload is missing.';

/**
 * Primary discriminator is `computed_schema_version`.
 * Shape (`mode` / `comparison_method`) is a secondary assertion on a declared v5 body.
 * Absent version → legacy (heading only). Declared v5 without required fields → corrupt.
 */
export function selectPresentLevelsRenderBody(
    embedded: ReportEmbeddedComputed
): PresentLevelsRenderSelection {
    if (embedded.computed_schema_version == null) {
        return { kind: 'legacy' };
    }

    if (embedded.computed_schema_version === REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION) {
        if (isPresentLevelsChangeMetrics(embedded.present_levels)) {
            return { kind: 'change_metrics', presentLevels: embedded.present_levels };
        }
        return { kind: 'corrupt' };
    }

    return { kind: 'corrupt' };
}

export function finalizedReportAllowsPrintEmission(
    embedded: ReportEmbeddedComputed
): boolean {
    return selectPresentLevelsRenderBody(embedded).kind !== 'corrupt';
}

/** Visible when print is withheld because Present Levels cannot be displayed. */
export const FINALIZED_REPORT_PRINT_UNAVAILABLE_MESSAGE =
    'Print / Save PDF is unavailable because Present Levels cannot be displayed.';

export function legacyPresentLevelsDomainRows(
    presentLevels: ReportEmbeddedPresentLevels
): ReportEmbeddedPresentLevelsDomainSummaryRow[] {
    if ('domains' in presentLevels && Array.isArray(presentLevels.domains)) {
        return presentLevels.domains;
    }
    return [];
}

export function resolveGoalDomainHeading(
    goal: { domain_id: string; domain_title?: string },
    legacyDomainRows: ReportEmbeddedPresentLevelsDomainSummaryRow[]
): string {
    if (goal.domain_title != null && goal.domain_title.trim() !== '') {
        return goal.domain_title;
    }
    const legacyTitle = legacyDomainRows.find((row) => row.domain_id === goal.domain_id)?.title;
    if (legacyTitle != null && legacyTitle.trim() !== '') {
        return legacyTitle;
    }
    return goal.domain_id;
}

function formatCycleAnchor(cycleNumber: number, date: string | null): string {
    if (!date) {
        return `Cycle ${cycleNumber}`;
    }
    const dateLabel = formatFinalizedReportDate(date);
    if (!dateLabel || dateLabel === '—') {
        return `Cycle ${cycleNumber}`;
    }
    return `Cycle ${cycleNumber} (${dateLabel})`;
}

/** Approach C span copy (OQ-RA16 interim). Omit when no prior scored anchors. */
export function formatPresentLevelsAnchorSpan(span: ReportAnchorSpan): string | null {
    if (!span.available) {
        return null;
    }
    if (span.earliest_cycle_number == null || span.latest_cycle_number == null) {
        return null;
    }
    const earliest = formatCycleAnchor(span.earliest_cycle_number, span.earliest_date);
    const latest = formatCycleAnchor(span.latest_cycle_number, span.latest_date);
    return `Prior scores used for comparison range from ${earliest} to ${latest}.`;
}

export function formatFinalizedReportDate(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleDateString(undefined, { dateStyle: 'long' });
}

export function finalizedReportHasRenderableSnapshot(report: AssessmentCommunicationReport): boolean {
    return (
        (report.status === 'finalized' || report.status === 'superseded') &&
        report.embedded_computed != null
    );
}

export const DOCUMENT_STATUS_CURRENT = 'Current issued report';

export function documentStatusForIssuedReport(
    status: AssessmentCommunicationReport['status'],
    currentIssuedVersion?: number | null
): string | null {
    if (status === 'finalized') {
        return DOCUMENT_STATUS_CURRENT;
    }
    if (status === 'superseded') {
        if (currentIssuedVersion != null) {
            return `Superseded — not the current issued report. Current version is v${currentIssuedVersion}.`;
        }
        return 'Superseded — not the current issued report.';
    }
    return null;
}

export function buildCommunicationReportPrintFilename(input: {
    assessmentId: string;
    version: number;
    superseded: boolean;
    generatedAt?: Date;
}): string {
    const date = (input.generatedAt ?? new Date()).toISOString().slice(0, 10);
    const safeId = input.assessmentId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'assessment';
    if (input.superseded) {
        return `communication-report-superseded-v${input.version}-${safeId}-${date}.pdf`;
    }
    return `communication-report-v${input.version}-${safeId}-${date}.pdf`;
}

export function defaultStructureLabelsFromPack(
    packSnapshot: { structure_labels?: StructureLabels } | null | undefined
): StructureLabels {
    return (
        packSnapshot?.structure_labels ?? {
            primary_group: 'Domain',
            target: 'Target',
        }
    );
}
