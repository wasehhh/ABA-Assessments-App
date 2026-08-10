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
 * On-screen / HTML Target Index (§6.7, PR14B §4.7).
 *
 * Collapsible, **expanded by default**. Panel stays in the DOM so static HTML
 * markup always includes every index row; collapse is a progressive enhancement
 * (React state on screen, inline script in standalone HTML).
 */
export function AssessmentSnapshotTargetIndexScreen({ index }: Props) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div
            className="rounded-md border border-gray-200 bg-white"
            data-assessment-snapshot-target-index-screen
            data-expanded={expanded ? 'true' : 'false'}
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
                <span
                    className="text-xs font-medium text-gray-500"
                    data-assessment-snapshot-target-index-toggle-label
                >
                    {expanded ? 'Hide' : 'Show'}
                </span>
            </button>
            <div
                id="assessment-snapshot-target-index-panel"
                className="border-t border-gray-200 px-3 pb-3 pt-2"
                data-assessment-snapshot-target-index-panel
                hidden={!expanded}
            >
                <AssessmentSnapshotTargetIndexTable index={index} surface="screen" />
            </div>
        </div>
    );
}
