import { type ReactNode } from 'react';
import {
    AssessmentCommunicationReport,
    ReportEmbeddedPresentLevelsChange,
} from '../../services/reportAuthoringTypes';
import { StructureLabels } from '../../types';
import { STATE_DISPLAY_LABELS } from '../assessment/domainProfile/stateDisplay';
import {
    DOCUMENT_STATUS_CURRENT,
    FIRST_ASSESSMENT_COUNT_ORDER,
    FIRST_ASSESSMENT_STATEMENT,
    FINALIZED_REPORT_SECTION_ORDER,
    documentStatusForIssuedReport,
    formatFinalizedReportDate,
    formatPresentLevelsAnchorSpan,
    formatReportTargetTimeframe,
    legacyPresentLevelsDomainRows,
    PRESENT_LEVELS_CORRUPT_EMBED_MESSAGE,
    PRESENT_LEVELS_LINE_LABELS,
    PRESENT_LEVELS_TRANSITION_METRICS,
    resolveGoalDomainHeading,
    selectPresentLevelsRenderBody,
} from '../../utils/finalizedReportPresentation';

interface Props {
    report: AssessmentCommunicationReport;
    structureLabels: StructureLabels;
    /** Current issued version number — chrome only, not recomputation. */
    currentIssuedVersion?: number | null;
}

function SectionHeading({ children }: { children: ReactNode }) {
    return (
        <h2 className="text-base font-bold uppercase tracking-wide text-gray-900 border-b-2 border-gray-900 pb-2 mb-6 print:mb-4">
            {children}
        </h2>
    );
}

function MetricCount({ value, label }: { value: number; label: string }) {
    return (
        <div className="text-center sm:text-left">
            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-gray-900 print:text-2xl">
                {value}
            </div>
            <div className="mt-2 text-sm font-medium text-gray-600 print:text-gray-800">{label}</div>
        </div>
    );
}

function PresentLevelsChangeBody({ presentLevels }: { presentLevels: ReportEmbeddedPresentLevelsChange }) {
    if (presentLevels.mode === 'first_assessment') {
        const counts = presentLevels.first_assessment?.counts;
        if (!counts) {
            return null;
        }
        return (
            <div data-present-levels-change data-present-levels-mode="first_assessment">
                <p className="text-sm text-gray-800 print:text-gray-900">{FIRST_ASSESSMENT_STATEMENT}</p>
                <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4 print:gap-4">
                    {FIRST_ASSESSMENT_COUNT_ORDER.map((metric) => (
                        <MetricCount
                            key={metric.key}
                            value={counts[metric.key]}
                            label={STATE_DISPLAY_LABELS[metric.state]}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (presentLevels.comparisons.length === 0) {
        return null;
    }

    return (
        <div data-present-levels-change data-present-levels-mode={presentLevels.mode}>
            <div className="space-y-8 print:space-y-6">
                {presentLevels.comparisons.map((line) => {
                    const spanCopy = formatPresentLevelsAnchorSpan(line.anchor_span);
                    return (
                        <div key={line.role} data-comparison-line={line.role}>
                            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900 mb-3 print:mb-2">
                                {PRESENT_LEVELS_LINE_LABELS[line.label_key]}
                            </h3>
                            {spanCopy ? (
                                <p className="mb-4 text-sm text-gray-700 print:text-gray-800">{spanCopy}</p>
                            ) : null}
                            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 print:gap-4">
                                {PRESENT_LEVELS_TRANSITION_METRICS.map((metric) => (
                                    <MetricCount
                                        key={metric.key}
                                        value={line[metric.key]}
                                        label={metric.label}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function FinalizedReportDocument({ report, currentIssuedVersion }: Props) {
    const embedded = report.embedded_computed!;
    const authoring = report.authoring.sections;
    const overview = embedded.overview;
    const presentLevels = embedded.present_levels;
    const domainRows = legacyPresentLevelsDomainRows(presentLevels);
    const snapshotAtStr = new Date(embedded.provenance.snapshot_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

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
                                    <div className="border-l-2 border-gray-300 pl-4 print:border-gray-400">
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">
                                            Document status
                                        </dt>
                                        <dd
                                            className="mt-1 text-base font-medium text-gray-900"
                                            data-report-document-status
                                        >
                                            {documentStatusForIssuedReport(
                                                report.status,
                                                currentIssuedVersion
                                            ) ?? DOCUMENT_STATUS_CURRENT}
                                        </dd>
                                    </div>
                                    <div className="border-l-2 border-gray-300 pl-4 print:border-gray-400">
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 print:text-gray-600">
                                            Finalized
                                        </dt>
                                        <dd className="mt-1 text-base font-medium text-gray-900">
                                            {formatFinalizedReportDate(report.finalized_at)}
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
                                {(() => {
                                    const selection = selectPresentLevelsRenderBody(embedded);
                                    if (selection.kind === 'change_metrics') {
                                        return (
                                            <PresentLevelsChangeBody
                                                presentLevels={selection.presentLevels}
                                            />
                                        );
                                    }
                                    if (selection.kind === 'corrupt') {
                                        return (
                                            <p
                                                data-present-levels-corrupt-embed
                                                className="text-sm font-medium text-red-800 print:text-black"
                                            >
                                                {PRESENT_LEVELS_CORRUPT_EMBED_MESSAGE}
                                            </p>
                                        );
                                    }
                                    return <div data-present-levels-without-change-metrics />;
                                })()}
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
                                                {resolveGoalDomainHeading(goal, domainRows)}
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
