import { SnapshotTargetIndex, SnapshotTargetIndexRow } from './snapshotTargetIndex';

export const SNAPSHOT_TARGET_INDEX_TITLE = 'Target index';

interface Props {
    index: SnapshotTargetIndex;
    /** screen = collapsible chrome; print = appendix after evidence pages. */
    surface: 'screen' | 'print';
}

function formatGroupContext(id: string, title: string): string {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle === id) {
        return id;
    }
    return `${id} · ${trimmedTitle}`;
}

function IndexRow({ row }: { row: SnapshotTargetIndexRow }) {
    return (
        <tr
            data-assessment-snapshot-target-index-row
            data-target-id={row.authoredTargetId}
            data-displayed-code={row.displayedCode}
        >
            <td data-index-field="displayed-code">{row.displayedCode}</td>
            <td data-index-field="authored-target-id">{row.authoredTargetId}</td>
            <td data-index-field="authored-label">{row.authoredLabel}</td>
            <td data-index-field="primary-group">
                {formatGroupContext(row.primaryGroupId, row.primaryGroupTitle)}
            </td>
            <td data-index-field="secondary-group">
                {row.secondaryGroupId
                    ? formatGroupContext(
                          row.secondaryGroupId,
                          row.secondaryGroupTitle ?? row.secondaryGroupId
                      )
                    : null}
            </td>
        </tr>
    );
}

/**
 * Shared Target Index table markup (§6). Content-identical for screen and print/export.
 */
export function AssessmentSnapshotTargetIndexTable({ index, surface }: Props) {
    return (
        <section
            data-assessment-snapshot-target-index
            data-assessment-snapshot-target-index-surface={surface}
            aria-label={SNAPSHOT_TARGET_INDEX_TITLE}
        >
            {surface === 'print' ? (
                <h2
                    className="mb-2 text-[11px] font-semibold tracking-tight text-black"
                    data-assessment-snapshot-target-index-heading
                >
                    {SNAPSHOT_TARGET_INDEX_TITLE}
                </h2>
            ) : null}
            <div className={surface === 'print' ? 'overflow-visible' : 'overflow-x-auto'}>
                <table
                    className={
                        surface === 'print'
                            ? 'w-full border-collapse text-[8px] leading-snug text-black'
                            : 'w-full border-collapse text-xs text-gray-800'
                    }
                    data-assessment-snapshot-target-index-table
                >
                    <thead>
                        <tr>
                            <th scope="col">Displayed code</th>
                            <th scope="col">Authored target ID</th>
                            <th scope="col">Authored label</th>
                            <th scope="col">Primary group</th>
                            <th scope="col">Secondary group</th>
                        </tr>
                    </thead>
                    <tbody>
                        {index.rows.map((row) => (
                            <IndexRow key={row.authoredTargetId} row={row} />
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
