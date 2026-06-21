import {
    LearnerMapCycleSummary,
    LearnerMapDomain,
    LearnerMapTarget,
} from '../../services/learnerMapProfile';
import { cycleRowCoverage } from './domainCellDisplay';
import { LearnerMapCell } from './LearnerMapCell';

interface Props {
    domain: LearnerMapDomain;
    cycles: LearnerMapCycleSummary[];
    targets?: LearnerMapTarget[];
    targetOffset?: number;
    titleOverride?: string;
    segmentRangeLabel?: string;
    exportLayout?: boolean;
    appendixCompact?: boolean;
    hideSectionHeader?: boolean;
}

function targetHeaderDisplay(target: LearnerMapTarget, index: number) {
    const fullTitle = target.title.trim();
    const numericSuffix = fullTitle.match(/(\d+(?:\.\d+)?)\s*$/);
    const codeFromTitle = numericSuffix?.[1];
    const codeFromId = target.targetId.match(/T(\d+)$/i)?.[1];
    const code = codeFromTitle ?? codeFromId ?? `${index + 1}`;

    const strippedTitle = fullTitle.replace(/^Target\s+/i, '').trim();
    const subtitle =
        strippedTitle && strippedTitle !== code
            ? strippedTitle
            : target.targetId.replace(/^DOM_\d+_/i, '').replace(/^D\d+T/i, 'T');

    return {
        code,
        subtitle,
        fullTitle,
    };
}

function cycleRowCoverageForTargets(
    targets: LearnerMapTarget[],
    cycleId: string
): { scored: number; total: number } {
    const total = targets.length;
    const scored = targets.filter((target) => {
        const cell = target.cells.find((entry) => entry.cycleId === cycleId);
        return cell !== undefined && !cell.isUnscored;
    }).length;

    return { scored, total };
}

export function LearnerMapDomainSection({
    domain,
    cycles,
    targets,
    targetOffset = 0,
    titleOverride,
    segmentRangeLabel,
    exportLayout = false,
    appendixCompact = false,
    hideSectionHeader = false,
}: Props) {
    const visibleTargets = targets ?? domain.targets;
    const headingTitle = titleOverride ?? domain.title;
    const compact = appendixCompact && exportLayout;
    const tableWrapperClass = exportLayout
        ? 'rounded-md border border-gray-200'
        : 'overflow-x-auto rounded-lg border border-gray-200';

    return (
        <section
            className={`${hideSectionHeader ? 'space-y-0' : 'space-y-3'} ${
                exportLayout ? 'learner-map-export-domain-segment-block' : ''
            }`}
        >
            {!hideSectionHeader ? (
                <div className={segmentRangeLabel ? 'space-y-1' : 'flex flex-wrap items-center gap-2'}>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                        {headingTitle}
                    </h3>
                    {segmentRangeLabel ? (
                        <p className="text-xs font-medium tabular-nums text-emerald-800">
                            {segmentRangeLabel}
                        </p>
                    ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-700">
                            {domain.targets.length} targets
                        </span>
                    )}
                </div>
            ) : null}

            {cycles.length === 0 ? (
                <p className="text-sm text-gray-600">No cycles available for this domain.</p>
            ) : visibleTargets.length === 0 ? (
                <p className="text-sm text-gray-600">No targets in this domain.</p>
            ) : (
                <div
                    className={tableWrapperClass}
                    data-learner-map-domain-table={exportLayout ? 'export' : 'default'}
                >
                    <table
                        className={`w-full border-collapse ${compact ? 'text-[10px]' : 'text-sm'}`}
                    >
                        <thead>
                            <tr className="border-b-2 border-gray-300 text-left">
                                <th
                                    className={`border-r border-gray-200 bg-gray-50 font-semibold text-gray-900 ${
                                        compact
                                            ? 'min-w-[2.25rem] px-1 py-1'
                                            : 'min-w-[5.5rem] px-2 py-2'
                                    } ${exportLayout ? '' : 'sticky left-0 z-20'}`}
                                >
                                    {compact ? '' : 'Cycle'}
                                </th>
                                {visibleTargets.map((target, index) => {
                                    const header = targetHeaderDisplay(
                                        target,
                                        targetOffset + index
                                    );
                                    return (
                                        <th
                                            key={target.targetId}
                                            className={`text-center align-bottom ${
                                                compact
                                                    ? 'min-w-[2.25rem] px-0.5 py-1'
                                                    : exportLayout
                                                      ? 'min-w-[3.5rem] px-1 py-2'
                                                      : 'min-w-[4.75rem] max-w-[6rem] px-1 py-2'
                                            }`}
                                            title={header.fullTitle}
                                        >
                                            {compact ? (
                                                <span className="text-[10px] font-bold tabular-nums leading-none text-gray-900">
                                                    {header.code}
                                                </span>
                                            ) : (
                                                <div
                                                    className={`mx-auto flex flex-col items-center gap-0.5 ${
                                                        exportLayout
                                                            ? 'max-w-[4rem]'
                                                            : 'max-w-[5.5rem]'
                                                    }`}
                                                >
                                                    <span className="text-[11px] font-bold tabular-nums leading-none text-gray-900">
                                                        {header.code}
                                                    </span>
                                                    <span className="line-clamp-2 text-[9px] font-medium leading-tight text-gray-600">
                                                        {header.subtitle}
                                                    </span>
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {cycles.map((cycle) => {
                                const coverage = targets
                                    ? cycleRowCoverageForTargets(visibleTargets, cycle.cycleId)
                                    : cycleRowCoverage(domain, cycle.cycleId);
                                return (
                                    <tr key={cycle.cycleId} className="border-b border-gray-100">
                                        <th
                                            scope="row"
                                            className={`border-r border-gray-200 bg-white text-left font-medium text-gray-800 ${
                                                compact ? 'px-1 py-1' : 'px-2 py-2'
                                            } ${exportLayout ? '' : 'sticky left-0 z-10'}`}
                                        >
                                            {compact ? (
                                                <div className="text-center tabular-nums">
                                                    <div className="text-[10px] font-semibold leading-none">
                                                        {cycle.cycleNumber}
                                                    </div>
                                                    <div className="mt-0.5 text-[9px] font-normal leading-none text-gray-500">
                                                        {coverage.scored}/{coverage.total}
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="tabular-nums">
                                                        Cycle {cycle.cycleNumber}
                                                    </div>
                                                    <div className="mt-0.5 text-[10px] font-normal tabular-nums text-gray-500">
                                                        n={coverage.scored}/{coverage.total}
                                                    </div>
                                                </>
                                            )}
                                        </th>
                                        {visibleTargets.map((target) => {
                                            const cell = target.cells.find(
                                                (entry) => entry.cycleId === cycle.cycleId
                                            );
                                            if (!cell) {
                                                return (
                                                    <td
                                                        key={`${target.targetId}-${cycle.cycleId}`}
                                                        className={`border border-gray-100 text-center text-gray-400 ${
                                                            compact
                                                                ? 'p-0 text-[9px]'
                                                                : 'p-1 text-xs'
                                                        }`}
                                                    >
                                                        —
                                                    </td>
                                                );
                                            }
                                            return (
                                                <LearnerMapCell
                                                    key={`${target.targetId}-${cycle.cycleId}`}
                                                    cell={cell}
                                                    compact={compact}
                                                />
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
