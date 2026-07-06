import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { CycleAxis, DomainZone } from '../record';
import { SnapshotCandidateProps } from './AssessmentSnapshotCandidateA';

/**
 * Candidate C — Record First
 * One continuous Evalis Record; domains divide the ledger without card chrome.
 */
export function AssessmentSnapshotCandidateC({
    profile,
    cycleDateLabels,
}: SnapshotCandidateProps) {
    const generatedLabel = new Date(profile.metadata.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    return (
        <div data-assessment-snapshot-candidate="c">
            <div className="border-y border-gray-400 bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-700">
                    Evalis Record
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                    Continuous evidence ledger · {profile.totals.totalTargets} targets ·{' '}
                    {profile.totals.totalCycles} cycles
                </p>
            </div>
            <div className="px-1 py-3">
                <CycleAxis
                    cycles={profile.cycles}
                    cycleDateLabels={cycleDateLabels}
                    labelWidth="w-44"
                    className="mb-3"
                />
                <div className="space-y-0 divide-y divide-gray-300">
                    {profile.domains.map((domain) => (
                        <DomainZone
                            key={domain.domainId}
                            domain={domain}
                            cycles={profile.cycles}
                            cycleDateLabels={cycleDateLabels}
                            variant="ledger"
                            stripDensity="default"
                        />
                    ))}
                </div>
            </div>
            <footer className="border-t border-gray-400 px-3 py-2 text-center text-[10px] text-gray-500">
                End of record · Generated {generatedLabel}
            </footer>
        </div>
    );
}
