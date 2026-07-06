import {
    LearnerMapCycleSummary,
    LearnerMapDomain,
    LearnerMapTarget,
} from '../../services/learnerMapProfile';
import { StructureLabels } from '../../types';
import { buildSecondaryGroupHeaderCells } from '../../utils/readSurfaceDisplay';
import { getDomainIdentity } from './domainIdentity';
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
    fixedTargetColumns?: number;
    domainIndex?: number;
    cycleDateLabels?: Record<string, string>;
    structureLabels?: StructureLabels;
}

function CycleRowLabel({
    cycleNumber,
    cycleId,
    cycleDateLabels,
    compact,
}: {
    cycleNumber: number;
    cycleId: string;
    cycleDateLabels?: Record<string, string>;
    compact: boolean;
}) {
    const dateLabel = cycleDateLabels?.[cycleId];

    if (!dateLabel) {
        return (
            <div
                className={`tabular-nums ${compact ? 'text-center text-[10px] font-semibold leading-none' : 'text-center font-medium'}`}
            >
                {cycleNumber}
            </div>
        );
    }

    if (compact) {
        return (
            <div className="text-center leading-tight">
                <div className="text-[10px] font-semibold tabular-nums leading-none">
                    {cycleNumber}
                </div>
                <div className="mt-0.5 text-[8px] font-medium leading-none text-gray-500">
                    {dateLabel}
                </div>
            </div>
        );
    }

    return (
        <div className="text-center text-sm leading-tight">
            <span className="font-medium tabular-nums">{cycleNumber}</span>
            <span className="text-gray-500"> · {dateLabel}</span>
        </div>
    );
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

function appendixTargetHeaderCode(target: LearnerMapTarget, domainOrderNumber: number): string {
    const normalizedId = target.targetId.replace(/^DOM_[A-Z0-9]+_/i, '');
    if (/^T\d+$/i.test(normalizedId)) {
        return normalizedId.toUpperCase();
    }

    if (normalizedId.length > 0 && normalizedId.length <= 6 && normalizedId !== target.targetId) {
        return normalizedId;
    }

    return `${domainOrderNumber}`;
}

function AppendixPlaceholderHeader({ compact }: { compact: boolean }) {
    return (
        <th
            className={`bg-gray-50/40 ${
                compact ? 'min-w-[2.25rem] px-0.5 py-1' : 'min-w-[3.5rem] px-1 py-2'
            }`}
            data-appendix-column-placeholder
            aria-hidden
        />
    );
}

function AppendixPlaceholderCell({ compact }: { compact: boolean }) {
    return (
        <td
            className={`border-0 bg-transparent p-0 ${
                compact ? 'min-w-[2.25rem]' : 'min-w-[3.5rem]'
            }`}
            data-appendix-column-placeholder
            aria-hidden
        />
    );
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
    fixedTargetColumns,
    domainIndex,
    cycleDateLabels,
    structureLabels,
}: Props) {
    const visibleTargets = targets ?? domain.targets;
    const headingTitle = titleOverride ?? domain.title;
    const compact = appendixCompact && exportLayout;
    const targetLabel = structureLabels?.target ?? 'Target';
    const secondaryGroupHeaderCells =
        domain.targetSections && visibleTargets.length > 0
            ? buildSecondaryGroupHeaderCells(domain.targetSections, visibleTargets)
            : null;
    const showSecondaryGroupRow = Boolean(
        secondaryGroupHeaderCells?.some((cell) => cell.title.length > 0)
    );
    const cycleHeaderRowSpan = compact ? (showSecondaryGroupRow ? 3 : 2) : showSecondaryGroupRow ? 2 : 1;
    const nativeIdentity =
        domainIndex !== undefined && !exportLayout ? getDomainIdentity(domainIndex) : null;
    const targetColumnCount =
        fixedTargetColumns && compact
            ? fixedTargetColumns
            : visibleTargets.length;
    const placeholderCount =
        fixedTargetColumns && compact
            ? Math.max(0, fixedTargetColumns - visibleTargets.length)
            : 0;
    const tableWrapperClass = exportLayout
        ? 'rounded-md border border-gray-200'
        : 'overflow-x-auto rounded-lg border border-gray-200';

    return (
        <section
            className={`${hideSectionHeader ? 'space-y-0' : 'space-y-3'} ${
                exportLayout ? 'learner-map-export-domain-segment-block' : ''
            } ${
                nativeIdentity
                    ? `rounded-r-lg border border-gray-200 border-l-4 ${nativeIdentity.borderClass}`
                    : ''
            }`}
            data-domain-identity={nativeIdentity?.id}
        >
            {!hideSectionHeader ? (
                <div className={segmentRangeLabel ? 'space-y-1' : 'flex flex-wrap items-center gap-2'}>
                    {nativeIdentity ? (
                        <span
                            className={`h-4 w-1 shrink-0 rounded-sm ${nativeIdentity.markerClass}`}
                            aria-hidden
                        />
                    ) : null}
                    <h3
                        className={`text-sm font-bold uppercase tracking-wide ${
                            nativeIdentity ? nativeIdentity.accentTextClass : 'text-gray-800'
                        }`}
                    >
                        {headingTitle}
                    </h3>
                    {segmentRangeLabel ? (
                        <p className="text-xs font-medium tabular-nums text-emerald-800">
                            {segmentRangeLabel}
                        </p>
                    ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-700">
                            {domain.targets.length} {targetLabel.toLowerCase()}
                            {domain.targets.length === 1 ? '' : 's'}
                        </span>
                    )}
                </div>
            ) : null}

            {cycles.length === 0 ? (
                <p className="text-sm text-gray-600">No cycles available for this domain.</p>
            ) : visibleTargets.length === 0 ? (
                <p className="text-sm text-gray-600">
                    No {targetLabel.toLowerCase()}s in this domain.
                </p>
            ) : (
                <div
                    className={tableWrapperClass}
                    data-learner-map-domain-table={exportLayout ? 'export' : 'default'}
                >
                    <table
                        className={`w-full border-collapse ${compact ? 'text-[10px]' : 'text-sm'} ${
                            compact && fixedTargetColumns ? 'table-fixed' : ''
                        }`}
                    >
                        <thead>
                            {compact ? (
                                <>
                                    <tr className="border-b border-gray-200 text-left">
                                        <th
                                            rowSpan={cycleHeaderRowSpan}
                                            className="min-w-[2.25rem] border-r border-gray-200 bg-gray-50 px-1 py-1 align-middle text-[9px] font-semibold leading-tight text-gray-600"
                                        >
                                            Cycles ↓
                                        </th>
                                        <th
                                            colSpan={targetColumnCount}
                                            className="px-1 py-1 text-center text-[9px] font-semibold tracking-wide text-gray-600"
                                        >
                                            {targetLabel}s →
                                        </th>
                                    </tr>
                                    {showSecondaryGroupRow ? (
                                        <tr className="border-b border-gray-200 text-left">
                                            {secondaryGroupHeaderCells!.map((cell, index) => (
                                                <th
                                                    key={`secondary-${index}-${cell.title}`}
                                                    colSpan={cell.colSpan}
                                                    className="px-0.5 py-0.5 text-center text-[8px] font-semibold uppercase tracking-wide text-gray-500"
                                                >
                                                    {cell.title}
                                                </th>
                                            ))}
                                            {Array.from({ length: placeholderCount }).map(
                                                (_, index) => (
                                                    <AppendixPlaceholderHeader
                                                        key={`placeholder-secondary-${index}`}
                                                        compact
                                                    />
                                                )
                                            )}
                                        </tr>
                                    ) : null}
                                    <tr className="border-b-2 border-gray-300 text-left">
                                        {visibleTargets.map((target, index) => {
                                            const domainOrderNumber = targetOffset + index + 1;
                                            const code = appendixTargetHeaderCode(
                                                target,
                                                domainOrderNumber
                                            );
                                            return (
                                                <th
                                                    key={target.targetId}
                                                    className="min-w-[2.25rem] px-0.5 py-1 text-center align-bottom"
                                                    title={target.title.trim()}
                                                >
                                                    <span className="text-[10px] font-bold tabular-nums leading-none text-gray-900">
                                                        {code}
                                                    </span>
                                                </th>
                                            );
                                        })}
                                        {Array.from({ length: placeholderCount }).map((_, index) => (
                                            <AppendixPlaceholderHeader
                                                key={`placeholder-header-${index}`}
                                                compact
                                            />
                                        ))}
                                    </tr>
                                </>
                            ) : (
                                <>
                                    {showSecondaryGroupRow ? (
                                        <tr className="border-b border-gray-200 text-left">
                                            <th
                                                rowSpan={2}
                                                className={`border-r border-gray-200 bg-gray-50 font-semibold text-gray-900 ${
                                                    compact
                                                        ? 'min-w-[2.25rem] px-1 py-1'
                                                        : 'min-w-[5.5rem] px-2 py-2'
                                                } ${exportLayout ? '' : 'sticky left-0 z-20'}`}
                                            >
                                                Cycle
                                            </th>
                                            {secondaryGroupHeaderCells!.map((cell, index) => (
                                                <th
                                                    key={`secondary-${index}-${cell.title}`}
                                                    colSpan={cell.colSpan}
                                                    className={`text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 ${
                                                        compact ? 'px-0.5 py-1' : 'px-1 py-1.5'
                                                    }`}
                                                >
                                                    {cell.title}
                                                </th>
                                            ))}
                                        </tr>
                                    ) : null}
                                    <tr className="border-b-2 border-gray-300 text-left">
                                        {!showSecondaryGroupRow ? (
                                            <th
                                                className={`border-r border-gray-200 bg-gray-50 font-semibold text-gray-900 ${
                                                    compact
                                                        ? 'min-w-[2.25rem] px-1 py-1'
                                                        : 'min-w-[5.5rem] px-2 py-2'
                                                } ${exportLayout ? '' : 'sticky left-0 z-20'}`}
                                            >
                                                Cycle
                                            </th>
                                        ) : null}
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
                                            </th>
                                        );
                                    })}
                                </tr>
                                </>
                            )}
                        </thead>
                        <tbody>
                            {cycles.map((cycle) => (
                                <tr key={cycle.cycleId} className="border-b border-gray-100">
                                    <th
                                        scope="row"
                                        className={`border-r border-gray-200 bg-white text-left font-medium text-gray-800 ${
                                            compact ? 'px-1 py-1' : 'px-2 py-2'
                                        } ${exportLayout ? '' : 'sticky left-0 z-10'}`}
                                    >
                                        {compact ? (
                                            <CycleRowLabel
                                                cycleNumber={cycle.cycleNumber}
                                                cycleId={cycle.cycleId}
                                                cycleDateLabels={cycleDateLabels}
                                                compact
                                            />
                                        ) : (
                                            <CycleRowLabel
                                                cycleNumber={cycle.cycleNumber}
                                                cycleId={cycle.cycleId}
                                                cycleDateLabels={cycleDateLabels}
                                                compact={false}
                                            />
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
                                    {Array.from({ length: placeholderCount }).map((_, index) => (
                                        <AppendixPlaceholderCell
                                            key={`placeholder-cell-${cycle.cycleId}-${index}`}
                                            compact
                                        />
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
