import { LearnerMapCycleSummary } from '../../../services/learnerMapProfile';
import { buildSnapshotCycleReferenceEntries } from './snapshotCycleReference';

interface Props {
    cycles: LearnerMapCycleSummary[];
    cycleDateLabels?: Record<string, string>;
}

/**
 * Document-level Cycle Reference — dates once, not on every domain axis.
 */
export function AssessmentSnapshotCycleReference({ cycles, cycleDateLabels }: Props) {
    if (cycles.length === 0) {
        return null;
    }

    const entries = buildSnapshotCycleReferenceEntries(cycles, cycleDateLabels);

    return (
        <div
            className="border-b border-gray-200 pb-2.5 print:border-gray-400 print:pb-2"
            data-assessment-snapshot-cycle-reference
        >
            <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-gray-400 print:text-[8px] print:text-black">
                Cycle reference
            </p>
            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-gray-600 print:text-[9px] print:text-black">
                {entries.map((entry) => (
                    <li key={entry.cycleId} data-cycle-id={entry.cycleId}>
                        {entry.label}
                    </li>
                ))}
            </ul>
        </div>
    );
}
