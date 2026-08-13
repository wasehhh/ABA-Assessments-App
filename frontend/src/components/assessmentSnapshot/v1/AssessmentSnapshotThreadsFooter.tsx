import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { formatStructureCount, SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN } from './snapshotVisualSystem';
import { formatCycleScopeLineValue, isPartialCycleScope } from './snapshotCycleScope';

interface Props {
    profile: AssessmentSnapshotProfile;
    generatedAtLabel: string;
    showScores?: boolean;
    /** Unfiltered assessment cycle count — required under partial scope (§5.1). */
    assessmentCycleCount?: number;
}

export function AssessmentSnapshotThreadsFooter({
    profile,
    generatedAtLabel,
    showScores = true,
    assessmentCycleCount,
}: Props) {
    const totalTargets = profile.domains.reduce((sum, domain) => sum + domain.targets.length, 0);
    const targetCountLabel = formatStructureCount(totalTargets, profile.structureLabels.target);
    const totalCycles = assessmentCycleCount ?? profile.cycles.length;
    const includedIds = profile.cycles.map((cycle) => cycle.cycleId);
    const cycleLabel = isPartialCycleScope(includedIds, totalCycles)
        ? formatCycleScopeLineValue(profile.cycles, totalCycles)
        : `${profile.cycles.length} cycle${profile.cycles.length === 1 ? '' : 's'}`;

    return (
        <footer
            className="mt-8 border-t border-gray-200 pt-3 text-center text-[9px] leading-relaxed text-gray-500 print:mt-3 print:border-gray-400 print:pt-1.5 print:text-[8px] print:text-black"
            data-assessment-snapshot-footer
        >
            Evalis
            <span className="mx-1.5 text-gray-300" aria-hidden>
                ·
            </span>
            {profile.metadata.packTitle} v{profile.metadata.packVersion}
            <span className="mx-1.5 text-gray-300" aria-hidden>
                ·
            </span>
            {targetCountLabel}
            <span className="mx-1.5 text-gray-300" aria-hidden>
                ·
            </span>
            <span data-assessment-snapshot-cycle-scope-footer>{cycleLabel}</span>
            <span className="mx-1.5 text-gray-300" aria-hidden>
                ·
            </span>
            Generated {generatedAtLabel}
            {showScores ? null : (
                <p
                    className="mt-1 text-gray-500 print:text-black"
                    data-assessment-snapshot-numerals-hidden
                >
                    {SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN}
                </p>
            )}
        </footer>
    );
}
