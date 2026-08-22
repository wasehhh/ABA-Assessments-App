import { ReportDomainSection } from '../services/reportProfile';
import {
    AssessmentCommunicationReport,
    ReportEmbeddedPresentLevelsDomainSummaryRow,
    ReportTargetTimeframe,
} from '../services/reportAuthoringTypes';
import { StructureLabels } from '../types';

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

export function resolveDomainTitle(
    domains: ReportEmbeddedPresentLevelsDomainSummaryRow[],
    domainId: string
): string {
    return domains.find((row) => row.domain_id === domainId)?.title ?? domainId;
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
    return report.status === 'finalized' && report.embedded_computed != null;
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
