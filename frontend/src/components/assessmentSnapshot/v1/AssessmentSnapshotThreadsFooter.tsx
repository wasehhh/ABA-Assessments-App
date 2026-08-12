import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { formatStructureCount, SNAPSHOT_LEGEND_SCORE_HINT_HIDDEN } from './snapshotVisualSystem';

interface Props {
    profile: AssessmentSnapshotProfile;
    generatedAtLabel: string;
    showScores?: boolean;
}

export function AssessmentSnapshotThreadsFooter({
    profile,
    generatedAtLabel,
    showScores = true,
}: Props) {
    const totalTargets = profile.domains.reduce((sum, domain) => sum + domain.targets.length, 0);
    const targetCountLabel = formatStructureCount(totalTargets, profile.structureLabels.target);

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
            {profile.cycles.length} cycle{profile.cycles.length === 1 ? '' : 's'}
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
