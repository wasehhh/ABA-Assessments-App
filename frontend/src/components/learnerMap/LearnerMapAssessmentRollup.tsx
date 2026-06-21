import { Grid3x3, Layers, LayoutGrid, Target } from 'lucide-react';
import { LearnerMapTotals } from '../../services/learnerMapProfile';

interface Props {
    totals: LearnerMapTotals;
}

interface StatItem {
    label: string;
    value: number | string;
    icon: typeof Layers;
}

export function LearnerMapAssessmentRollup({ totals }: Props) {
    const stats: StatItem[] = [
        { label: 'Domains', value: totals.totalDomains, icon: Layers },
        { label: 'Targets', value: totals.totalTargets, icon: Target },
        { label: 'Cycles', value: totals.totalCycles, icon: LayoutGrid },
        { label: 'Scored Cells', value: totals.scoredCells, icon: Grid3x3 },
        { label: 'Total Cells', value: totals.totalCells, icon: Grid3x3 },
    ];

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
        </section>
    );
}
