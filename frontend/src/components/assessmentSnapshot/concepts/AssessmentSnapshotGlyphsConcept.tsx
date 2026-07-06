import { snapshotCellClass, snapshotCellLabel } from '../snapshotCellDisplay';
import {
    cellForTargetCycle,
    formatCycleLabel,
    SnapshotConceptProps,
} from './snapshotConceptShared';

function glyphGridClass(cycleCount: number): string {
    if (cycleCount <= 1) return 'grid-cols-1';
    if (cycleCount <= 2) return 'grid-cols-2';
    if (cycleCount <= 4) return 'grid-cols-2 grid-rows-2';
    return 'grid-cols-3';
}

export function AssessmentSnapshotGlyphsConcept({ profile, cycleDateLabels }: SnapshotConceptProps) {
    return (
        <div className="space-y-6" data-assessment-snapshot-concept="glyphs">
            {profile.domains.map((domain) => (
                <section key={domain.domainId}>
                    <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-800">
                        {domain.title}
                    </h2>
                    <div className="flex flex-wrap gap-1">
                        {domain.targets.map((target) => (
                            <div
                                key={target.targetId}
                                className="group relative"
                                title={target.title}
                            >
                                <div
                                    className={`grid h-8 w-8 gap-px overflow-hidden rounded border border-gray-400 p-px ${glyphGridClass(profile.cycles.length)}`}
                                    aria-label={target.title}
                                >
                                    {profile.cycles.map((cycle) => {
                                        const cell = cellForTargetCycle(target, cycle.cycleId);
                                        if (!cell) {
                                            return (
                                                <div
                                                    key={`${target.targetId}-${cycle.cycleId}`}
                                                    className="bg-gray-100"
                                                    title={`${target.title} · ${formatCycleLabel(cycle, cycleDateLabels)} · Unscored`}
                                                />
                                            );
                                        }

                                        return (
                                            <div
                                                key={`${target.targetId}-${cycle.cycleId}`}
                                                className={`flex items-center justify-center ${snapshotCellClass(cell.competencyState)}`}
                                                title={`${target.title} · ${formatCycleLabel(cycle, cycleDateLabels)} · ${snapshotCellLabel(cell.competencyState)} · ${cell.displayScoreWithMax}`}
                                            >
                                                <span className="font-mono text-[6px] font-bold leading-none text-gray-900">
                                                    {cell.displayScoreWithMax.length <= 2
                                                        ? cell.displayScoreWithMax
                                                        : ''}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
