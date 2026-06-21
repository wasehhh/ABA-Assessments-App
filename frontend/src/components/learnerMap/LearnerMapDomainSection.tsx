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

export function LearnerMapDomainSection({ domain, cycles }: Props) {
    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    {domain.title}
                </h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-700">
                    {domain.targets.length} targets
                </span>
            </div>

            {cycles.length === 0 ? (
                <p className="text-sm text-gray-600">No cycles available for this domain.</p>
            ) : domain.targets.length === 0 ? (
                <p className="text-sm text-gray-600">No targets in this domain.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-300 text-left">
                                <th className="sticky left-0 z-20 min-w-[5.5rem] border-r border-gray-200 bg-gray-50 px-2 py-2 font-semibold text-gray-900">
                                    Cycle
                                </th>
                                {domain.targets.map((target, index) => {
                                    const header = targetHeaderDisplay(target, index);
                                    return (
                                        <th
                                            key={target.targetId}
                                            className="min-w-[4.75rem] max-w-[6rem] px-1 py-2 text-center align-bottom"
                                            title={header.fullTitle}
                                        >
                                            <div className="mx-auto flex max-w-[5.5rem] flex-col items-center gap-0.5">
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
                        </thead>
                        <tbody>
                            {cycles.map((cycle) => {
                                const coverage = cycleRowCoverage(domain, cycle.cycleId);
                                return (
                                    <tr key={cycle.cycleId} className="border-b border-gray-100">
                                        <th
                                            scope="row"
                                            className="sticky left-0 z-10 border-r border-gray-200 bg-white px-2 py-2 text-left font-medium text-gray-800"
                                        >
                                            <div className="tabular-nums">Cycle {cycle.cycleNumber}</div>
                                            <div className="mt-0.5 text-[10px] font-normal tabular-nums text-gray-500">
                                                n={coverage.scored}/{coverage.total}
                                            </div>
                                        </th>
                                        {domain.targets.map((target) => {
                                            const cell = target.cells.find(
                                                (entry) => entry.cycleId === cycle.cycleId
                                            );
                                            if (!cell) {
                                                return (
                                                    <td
                                                        key={`${target.targetId}-${cycle.cycleId}`}
                                                        className="border border-gray-100 p-1 text-center text-xs text-gray-400"
                                                    >
                                                        —
                                                    </td>
                                                );
                                            }
                                            return (
                                                <LearnerMapCell
                                                    key={`${target.targetId}-${cycle.cycleId}`}
                                                    cell={cell}
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
