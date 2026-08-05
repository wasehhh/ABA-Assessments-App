import { useState } from 'react';
import { SnapshotTargetIndex } from './snapshotTargetIndex';
import {
    AssessmentSnapshotTargetIndexTable,
    SNAPSHOT_TARGET_INDEX_TITLE,
} from './AssessmentSnapshotTargetIndexTable';

interface Props {
    index: SnapshotTargetIndex;
}

/**
 * On-screen Target Index (§6.7) — collapsible, default expanded when triggered.
 * `no-print`: print/export use the dedicated print appendix.
 */
export function AssessmentSnapshotTargetIndexScreen({ index }: Props) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div
            className="no-print rounded-md border border-gray-200 bg-white"
            data-assessment-snapshot-target-index-screen
        >
            <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                aria-expanded={expanded}
                aria-controls="assessment-snapshot-target-index-panel"
                data-assessment-snapshot-target-index-heading
                onClick={() => setExpanded((value) => !value)}
            >
                <span className="text-sm font-semibold tracking-tight text-gray-900">
                    {SNAPSHOT_TARGET_INDEX_TITLE}
                </span>
                <span className="text-xs font-medium text-gray-500">
                    {expanded ? 'Hide' : 'Show'}
                </span>
            </button>
            {expanded ? (
                <div
                    id="assessment-snapshot-target-index-panel"
                    className="border-t border-gray-200 px-3 pb-3 pt-2"
                >
                    <AssessmentSnapshotTargetIndexTable index={index} surface="screen" />
                </div>
            ) : null}
        </div>
    );
}
