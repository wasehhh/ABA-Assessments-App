import { ClipboardCheck, Layers, LayoutGrid, PieChart, Target } from 'lucide-react';
import { LearnerMapDomain, LearnerMapTotals } from '../../services/learnerMapProfile';
import {
    deriveAssessmentCoverageSummary,
    deriveAssessmentTargetMovementSummary,
    targetMovementPercent,
} from './domainCellDisplay';
import { MOVEMENT_MARKER_ENTRIES, movementMetricEmphasisClass } from './movementDisplay';

interface Props {
    totals: LearnerMapTotals;
    domains: LearnerMapDomain[];
}

interface StatItem {
    label: string;
    value: number | string;
    icon: typeof Layers;
}

export function LearnerMapAssessmentRollup({ totals, domains }: Props) {
    const coverageSummary = deriveAssessmentCoverageSummary(domains);
    const stats: StatItem[] = [
        { label: 'Domains', value: totals.totalDomains, icon: Layers },
        { label: 'Targets', value: totals.totalTargets, icon: Target },
        { label: 'Cycles', value: totals.totalCycles, icon: LayoutGrid },
        {
            label: 'Targets Assessed',
            value: coverageSummary.targetsAssessed,
            icon: ClipboardCheck,
        },
        {
            label: 'Assessment Coverage',
            value: `${coverageSummary.coveragePercent}%`,
            icon: PieChart,
        },
    ];

    const movementSummary = deriveAssessmentTargetMovementSummary(domains);

    return (
        <section
            className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm"
            data-learner-map-export-rollup-section
        >
            <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900">
                    Assessment rollup
                </h2>
                <p className="text-[11px] text-gray-500">Assessment-wide totals</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5"
                        >
                            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                {stat.label}
                            </dt>
                            <dd className="mt-1 tabular-nums text-xl font-semibold text-gray-900">
                                {stat.value}
                            </dd>
                        </div>
                    );
                })}
            </dl>

            <div
                className="mt-4 border-t border-gray-100 pt-3"
                data-learner-map-assessment-movement-summary
            >
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-900">
                    Latest Target Movement
                </h3>
                <p className="mt-0.5 text-[10px] text-gray-500">
                    Percentages are based on total targets in this assessment.
                </p>
                <div
                    className="mt-2 overflow-hidden rounded-md border border-gray-200 bg-white"
                    data-learner-map-assessment-movement-strip
                >
                    <ul className="flex flex-wrap lg:flex-nowrap">
                        {MOVEMENT_MARKER_ENTRIES.map((entry, index) => {
                            const count = movementSummary.movement[entry.key];
                            const percent = targetMovementPercent(
                                count,
                                movementSummary.totalTargets
                            );

                            return (
                                <li
                                    key={entry.key}
                                    className={`min-w-[9rem] flex-1 px-2 py-2.5 text-center ${
                                        entry.key === 'none' ? 'bg-gray-50/60' : ''
                                    } ${
                                        index > 0
                                            ? 'border-t border-gray-200 lg:border-t-0 lg:border-l'
                                            : ''
                                    }`}
                                >
                                    <div className="space-y-0.5">
                                        <p
                                            className={`text-[11px] leading-tight ${
                                                entry.key === 'none'
                                                    ? 'font-medium text-gray-400'
                                                    : `font-semibold ${entry.markerClass}`
                                            }`}
                                        >
                                            <span aria-hidden>{entry.symbol}</span> {entry.label}
                                        </p>
                                        <p
                                            className={`tabular-nums leading-tight ${movementMetricEmphasisClass(entry.key)} ${
                                                entry.key === 'none'
                                                    ? 'text-xs font-medium'
                                                    : 'text-sm font-semibold'
                                            }`}
                                            title={`${entry.label}: ${count} targets (${percent}%)`}
                                        >
                                            {count}{' '}
                                            <span className="font-medium">({percent}%)</span>
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </section>
    );
}
