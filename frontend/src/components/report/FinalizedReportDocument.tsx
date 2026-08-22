import { type ReactNode } from 'react';
import { ReportAssessmentScoreDistribution } from './ReportAssessmentScoreDistribution';
import { ReportDomainScoreDistribution } from './ReportDomainScoreDistribution';
import { ReportDomainSummaryTable } from './ReportDomainSummaryTable';
import {
    AssessmentCommunicationReport,
    ReportEmbeddedPresentLevelsDomainSummaryRow,
} from '../../services/reportAuthoringTypes';
import { StructureLabels } from '../../types';
import { snapshotCellLabel } from '../assessmentSnapshot/snapshotCellDisplay';
import {
    FINALIZED_REPORT_SECTION_ORDER,
    formatFinalizedReportDate,
    formatReportTargetTimeframe,
    presentLevelsDomainsToReportSections,
    resolveDomainTitle,
} from '../../utils/finalizedReportPresentation';

interface Props {
    report: AssessmentCommunicationReport;
    structureLabels: StructureLabels;
}

function SectionHeading({ children }: { children: ReactNode }) {
    return (
        <h2 className="text-base font-bold uppercase tracking-wide text-gray-900 border-b-2 border-gray-900 pb-2 mb-6 print:mb-4">
            {children}
        </h2>
    );
}

export function FinalizedReportDocument({ report, structureLabels }: Props) {
    const embedded = report.embedded_computed!;
    const authoring = report.authoring.sections;
    const overview = embedded.overview;
    const presentLevels = embedded.present_levels;
    const domainSections = presentLevelsDomainsToReportSections(presentLevels.domains);
    const primaryLabel = structureLabels.primary_group ?? 'Domain';
    const targetLabel = structureLabels.target ?? 'Target';
    const snapshotAtStr = new Date(embedded.provenance.snapshot_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const domainRows: ReportEmbeddedPresentLevelsDomainSummaryRow[] = presentLevels.domains;

    return (
        <div data-finalized-report-document>
            {FINALIZED_REPORT_SECTION_ORDER.map((sectionId) => {
                switch (sectionId) {
                    case 'overview':
                        return (
                            <section
                                key={sectionId}
                                className="mb-12 print:mb-8 report-section-block"
                                data-finalized-report-section={sectionId}
                            >
                                <SectionHeading>Overview</SectionHeading>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 text-sm print:grid-cols-2 print:gap-y-5">
                                    <div className="border-l-2 border-emerald-700/80 pl-4 print:border-gray-800">
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">
                                            Client
                                        </dt>
                                        <dd className="mt-1 text-lg font-semibold text-gray-900 leading-snug print:text-xl">
                                            {overview.client_name ?? '—'}
                                        </dd>
                                    </div>
                                    <div className="border-l-2 border-gray-300 pl-4 print:border-gray-400">
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">
                                            Assessment / pack
                                        </dt>
                                        <dd className="mt-1 text-base font-medium text-gray-800 leading-snug">
                                            {overview.pack_title} (v{overview.pack_version})
                                        </dd>
                                    </div>
                                    <div className="border-l-2 border-gray-300 pl-4 print:border-gray-400">
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">
                                            Cycle
                                        </dt>
                                        <dd className="mt-1 text-base font-medium text-gray-900">
                                            Cycle {overview.cycle_number}
                                            {overview.cycle_start_date || overview.cycle_end_date ? (
                                                <span className="block text-sm font-normal text-gray-600 print:text-gray-800">
                                                    {formatFinalizedReportDate(overview.cycle_start_date)}
                                                    {overview.cycle_end_date
                                                        ? ` – ${formatFinalizedReportDate(overview.cycle_end_date)}`
                                                        : ''}
                                                </span>
                                            ) : null}
                                        </dd>
                                    </div>
                                    <div className="border-l-2 border-gray-300 pl-4 print:border-gray-400">
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">
                                            Assessment date
                                        </dt>
                                        <dd className="mt-1 text-base font-medium text-gray-900">
                                            {formatFinalizedReportDate(overview.assessment_date)}
                                        </dd>
                                    </div>
                                    <div className="border-l-2 border-gray-300 pl-4 print:border-gray-400">
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">
                                            Authoring clinician
                                        </dt>
                                        <dd className="mt-1 text-base font-medium text-gray-900">
                                            {overview.authoring_clinician_name ?? '—'}
                                        </dd>
                                    </div>
                                    <div className="border-l-2 border-gray-300 pl-4 print:border-gray-400">
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">
                                            Report version
                                        </dt>
                                        <dd className="mt-1 text-base font-medium text-gray-900 tabular-nums">
                                            v{report.version}
                                        </dd>
                                    </div>
                                </dl>
                            </section>
                        );
                    case 'present_levels':
                        return (
                            <section
                                key={sectionId}
                                className="mb-12 print:mb-8 report-section-block"
                                data-finalized-report-section={sectionId}
                            >
                                <SectionHeading>
                                    Present Levels of Performance (Baseline)
                                </SectionHeading>
                                <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-6 py-8 sm:px-8 print:rounded-none print:border-gray-300 print:bg-white print:px-5 print:py-5">
                                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6 print:gap-4">
                                        <div className="text-center sm:text-left">
                                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-gray-900 print:text-2xl">
                                                {presentLevels.rollup.pointsCapturedPercentage}%
                                            </div>
                                            <div className="mt-2 text-sm font-medium text-gray-600 print:text-gray-800">
                                                Points Captured
                                            </div>
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-emerald-700 print:text-2xl print:text-black">
                                                {presentLevels.rollup.scoredTargets}
                                            </div>
                                            <div className="mt-2 text-sm font-medium text-gray-600 print:text-gray-800">
                                                Coverage
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500 tabular-nums print:text-gray-700">
                                                {presentLevels.rollup.scoredTargets} of{' '}
                                                {presentLevels.rollup.totalTargets}{' '}
                                                {targetLabel.toLowerCase()}s scored
                                            </p>
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-blue-800 print:text-2xl print:text-black">
                                                {presentLevels.rollup.totalDomains}
                                            </div>
                                            <div className="mt-2 text-sm font-medium text-gray-600 print:text-gray-800">
                                                {primaryLabel}s covered
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 border-t border-gray-200 pt-8 print:mt-5 print:border-gray-300 print:pt-5">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900 mb-4 print:mb-3">
                                            Assessment Score Distribution
                                        </h3>
                                        <ReportAssessmentScoreDistribution
                                            distribution={presentLevels.assessment_band_distribution}
                                        />
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900 mb-4 print:mb-3">
                                        {primaryLabel} summary
                                    </h3>
                                    <ReportDomainSummaryTable
                                        domains={domainSections}
                                        structureLabels={structureLabels}
                                    />
                                </div>

                                <div className="mt-8 space-y-6 print:space-y-4">
                                    {domainRows.map((row) => (
                                        <div key={row.domain_id}>
                                            <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                                {row.title}
                                            </h4>
                                            <ReportDomainScoreDistribution
                                                distribution={row.state_distribution}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    case 'target_skills':
                        return (
                            <section
                                key={sectionId}
                                className="mb-12 print:mb-8 report-section-block"
                                data-finalized-report-section={sectionId}
                            >
                                <SectionHeading>Target Skills / Areas of Focus</SectionHeading>
                                <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-4 print:border-gray-300 print:bg-white">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                        Focus summary
                                    </h3>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                                        {authoring.target_skills_focus.focus_summary}
                                    </p>
                                </div>
                                <div className="space-y-8 print:space-y-5">
                                    {embedded.target_skills.domains.map((domain) => (
                                        <article key={domain.domain_id}>
                                            <h3 className="text-lg font-bold text-gray-900 print:text-base">
                                                {domain.title}
                                            </h3>
                                            {domain.targets.length === 0 ? (
                                                <p className="mt-2 text-sm text-gray-600">
                                                    No {targetLabel.toLowerCase()}s in this{' '}
                                                    {primaryLabel.toLowerCase()}.
                                                </p>
                                            ) : (
                                                <ul className="mt-3 divide-y divide-gray-200 border border-gray-200 rounded-lg print:divide-gray-300 print:border-gray-300">
                                                    {domain.targets.map((target) => (
                                                        <li
                                                            key={target.target_id}
                                                            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between print:px-3 print:py-2"
                                                        >
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {target.title}
                                                            </span>
                                                            <span className="text-sm tabular-nums text-gray-700">
                                                                {target.display_score_with_max} ·{' '}
                                                                {snapshotCellLabel(target.competency_state)}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </section>
                        );
                    case 'measurable_treatment_goals':
                        return (
                            <section
                                key={sectionId}
                                className="mb-12 print:mb-8 report-section-block"
                                data-finalized-report-section={sectionId}
                            >
                                <SectionHeading>Measurable Treatment Goals</SectionHeading>
                                <ol className="space-y-6 print:space-y-4">
                                    {authoring.measurable_treatment_goals.goals.map((goal, index) => (
                                        <li
                                            key={goal.id}
                                            className="rounded-lg border border-gray-200 px-4 py-4 print:border-gray-300 print:px-3 print:py-3"
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Goal {index + 1} ·{' '}
                                                {resolveDomainTitle(domainRows, goal.domain_id)}
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-gray-900 leading-relaxed">
                                                {goal.goal_statement}
                                            </p>
                                            <p className="mt-2 text-sm text-gray-700">
                                                <span className="font-semibold">Mastery:</span>{' '}
                                                {goal.mastery_criterion}
                                            </p>
                                            <p className="mt-1 text-sm text-gray-700">
                                                <span className="font-semibold">Timeframe:</span>{' '}
                                                {formatReportTargetTimeframe(goal.target_timeframe)}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        );
                    case 'recommended_therapy_hours':
                        return (
                            <section
                                key={sectionId}
                                className="mb-12 print:mb-8 report-section-block"
                                data-finalized-report-section={sectionId}
                            >
                                <SectionHeading>Recommended Therapy Hours</SectionHeading>
                                <p className="text-2xl font-bold tabular-nums text-gray-900 print:text-xl">
                                    {authoring.recommended_therapy_hours.weekly_hours} hours / week
                                </p>
                                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                                    {authoring.recommended_therapy_hours.clinical_justification}
                                </p>
                            </section>
                        );
                    case 'clinical_summary':
                        return (
                            <section
                                key={sectionId}
                                className="mb-12 print:mb-8 report-section-block"
                                data-finalized-report-section={sectionId}
                            >
                                <SectionHeading>Clinical Summary</SectionHeading>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                                    {authoring.clinical_summary.narrative}
                                </p>
                            </section>
                        );
                    default:
                        return null;
                }
            })}

            <footer className="mt-16 border-t border-gray-300 pt-6 text-xs text-gray-500 print:mt-10 print:border-gray-400 print:pt-4 print:text-gray-700">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span>Generated by Evalis · Finalized communication report</span>
                    <span className="tabular-nums">Snapshot {snapshotAtStr}</span>
                </div>
            </footer>
        </div>
    );
}
