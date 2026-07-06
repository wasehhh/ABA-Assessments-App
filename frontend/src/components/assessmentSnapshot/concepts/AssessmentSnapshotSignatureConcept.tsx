import { snapshotCellClass, snapshotCellLabel } from '../snapshotCellDisplay';
import {
    cellForTargetCycle,
    formatCycleLabel,
    SnapshotConceptProps,
} from './snapshotConceptShared';

/**
 * Evalis Meridian — experimental signature visualization.
 * One horizontal axis spans the assessment; domain zones segment the axis;
 * each target is a vertical pulse crossing the meridian with stacked cycle history.
 */
export function AssessmentSnapshotSignatureConcept({ profile, cycleDateLabels }: SnapshotConceptProps) {
    const domainColors = [
        'border-emerald-400 bg-emerald-50/40',
        'border-blue-400 bg-blue-50/40',
        'border-violet-400 bg-violet-50/40',
        'border-amber-400 bg-amber-50/40',
        'border-rose-400 bg-rose-50/40',
        'border-cyan-400 bg-cyan-50/40',
    ];

    return (
        <div className="space-y-4" data-assessment-snapshot-concept="signature">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">
                Evalis Meridian · experimental
            </p>
            <div className="relative overflow-x-auto pb-4">
                <div className="flex min-w-max items-stretch gap-0">
                    {profile.domains.map((domain, domainIndex) => {
                        const zoneClass = domainColors[domainIndex % domainColors.length];

                        return (
                            <section
                                key={domain.domainId}
                                className={`flex flex-col border-x border-t border-b-0 px-2 pb-2 pt-1 ${zoneClass}`}
                            >
                                <h2 className="mb-2 max-w-[8rem] text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-gray-800">
                                    {domain.title}
                                </h2>
                                <div className="relative flex flex-1 items-end justify-center gap-1">
                                    {domain.targets.map((target, targetIndex) => {
                                        const above = targetIndex % 2 === 0;

                                        return (
                                            <div
                                                key={target.targetId}
                                                className={`relative flex w-5 flex-col items-center ${
                                                    above ? 'flex-col-reverse' : 'flex-col'
                                                }`}
                                            >
                                                <div
                                                    className={`flex gap-px overflow-hidden rounded-sm border border-gray-400 ${
                                                        above ? 'mb-px' : 'mt-px'
                                                    }`}
                                                    style={{
                                                        height: `${Math.max(24, profile.cycles.length * 10)}px`,
                                                    }}
                                                >
                                                    {profile.cycles.map((cycle) => {
                                                        const cell = cellForTargetCycle(
                                                            target,
                                                            cycle.cycleId
                                                        );
                                                        if (!cell) {
                                                            return (
                                                                <div
                                                                    key={`${target.targetId}-${cycle.cycleId}`}
                                                                    className="w-2 bg-gray-100"
                                                                    title={`${target.title} · ${formatCycleLabel(cycle, cycleDateLabels)} · Unscored`}
                                                                />
                                                            );
                                                        }

                                                        return (
                                                            <div
                                                                key={`${target.targetId}-${cycle.cycleId}`}
                                                                className={`flex w-2 items-center justify-center ${snapshotCellClass(cell.competencyState)}`}
                                                                title={`${target.title} · ${formatCycleLabel(cycle, cycleDateLabels)} · ${snapshotCellLabel(cell.competencyState)} · ${cell.displayScoreWithMax}`}
                                                            >
                                                                <span className="rotate-90 font-mono text-[6px] font-bold leading-none text-gray-900">
                                                                    {cell.displayScoreWithMax.length <= 2
                                                                        ? cell.displayScoreWithMax
                                                                        : ''}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div
                                                    className="z-10 h-2 w-2 shrink-0 rounded-full border border-gray-600 bg-white"
                                                    title={target.title}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
                <div
                    className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-slate-500 via-slate-700 to-slate-500"
                    aria-hidden
                    data-assessment-snapshot-meridian
                />
            </div>
        </div>
    );
}
