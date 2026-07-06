import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';

interface Props {
    profile: AssessmentSnapshotProfile;
    generatedAtLabel: string;
}

export function AssessmentSnapshotThreadsFooter({ profile, generatedAtLabel }: Props) {
    const totalTargets = profile.domains.reduce((sum, domain) => sum + domain.targets.length, 0);
    const targetLabel = profile.structureLabels.target.toLowerCase();

    return (
        <footer
            className="border-t border-gray-300 pt-2 text-center text-[9px] text-gray-600 print:border-gray-400 print:text-[8px] print:text-black"
            data-assessment-snapshot-footer
        >
            Assessment Snapshot · {profile.metadata.packTitle} v{profile.metadata.packVersion} ·{' '}
            {totalTargets} {targetLabel}
            {totalTargets === 1 ? '' : 's'} · {profile.cycles.length} cycles · Generated{' '}
            {generatedAtLabel}
        </footer>
    );
}
