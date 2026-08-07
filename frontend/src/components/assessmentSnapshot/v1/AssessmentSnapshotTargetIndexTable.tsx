import { SnapshotTargetIndex, SnapshotTargetIndexRow } from './snapshotTargetIndex';
import {
    TARGET_INDEX_COLUMN_ORDER,
    TARGET_INDEX_COLUMN_WIDTH_FRACTIONS,
} from '../../../utils/snapshotTargetIndexColumns';

export const SNAPSHOT_TARGET_INDEX_TITLE = 'Target index';

interface Props {
    index: SnapshotTargetIndex;
    /** Optional row slice for multi-sheet print; defaults to the full index. */
    rows?: SnapshotTargetIndexRow[];
    /** screen = collapsible chrome; print = appendix after evidence pages. */
    surface: 'screen' | 'print';
    /**
     * When false, omit the section heading (continuation index sheets).
     * Defaults to true for print surface, false for screen (button owns the title).
     */
    showHeading?: boolean;
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
export function AssessmentSnapshotTargetIndexTable({
    index,
    rows,
    surface,
    showHeading,
}: Props) {
    const displayRows = rows ?? index.rows;
    const headingVisible =
        showHeading ?? (surface === 'print');

    return (
        <section
            data-assessment-snapshot-target-index
            data-assessment-snapshot-target-index-surface={surface}
            aria-label={SNAPSHOT_TARGET_INDEX_TITLE}
        >
            {headingVisible ? (
                <h2
                    className={
                        surface === 'print'
                            ? 'mb-2 text-[11px] font-semibold tracking-tight text-black'
                            : 'text-sm font-semibold tracking-tight text-gray-900'
                    }
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
                    <colgroup>
                        {TARGET_INDEX_COLUMN_ORDER.map((key) => (
                            <col
                                key={key}
                                style={{
                                    width: `${Math.round(TARGET_INDEX_COLUMN_WIDTH_FRACTIONS[key] * 1000) / 10}%`,
                                }}
                                data-assessment-snapshot-target-index-col={key}
                            />
                        ))}
                    </colgroup>
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
                        {displayRows.map((row) => (
                            <IndexRow key={row.authoredTargetId} row={row} />
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
