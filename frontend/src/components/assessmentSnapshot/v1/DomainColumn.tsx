import { LearnerMapCycleSummary, LearnerMapDomain } from '../../../services/learnerMapProfile';
import { CycleColumnHeader } from './CycleColumnHeader';
import { domainAccentClass } from './targetThreadsShared';
import { domainColumnStyle, ThreadsLayoutTokens } from './threadsLayout';
import { TargetThread } from './TargetThread';

interface Props {
    domain: LearnerMapDomain;
    domainIndex: number;
    cycles: LearnerMapCycleSummary[];
    cycleDateLabels?: Record<string, string>;
    layout: ThreadsLayoutTokens;
}

export function DomainColumn({
    domain,
    domainIndex,
    cycles,
    cycleDateLabels,
    layout,
}: Props) {
    const targetCountLabel = `${domain.targets.length} target${domain.targets.length === 1 ? '' : 's'}`;
    const columnStyle = domainColumnStyle(layout);

    return (
        <section
            className={`shrink-0 grow-0 ${layout.domainZoneClass}`}
            style={columnStyle}
            data-assessment-snapshot-domain
            data-assessment-snapshot-domain-column
            data-domain-id={domain.domainId}
            data-domain-index={domainIndex}
            data-domain-target-count={domain.targets.length}
        >
            <header className="mb-2 px-0.5">
                <div className="flex flex-col items-center gap-1 text-center">
                    <span
                        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${domainAccentClass(domainIndex)}`}
                        aria-hidden
                    />
                    <h2
                        className={`max-w-full hyphens-auto break-words font-bold uppercase leading-snug tracking-wide text-gray-900 ${layout.domainTitleClass}`}
                    >
                        {domain.title}
                    </h2>
                    <p className={`text-gray-500 ${layout.domainMetaClass}`}>{targetCountLabel}</p>
                </div>
            </header>

            <CycleColumnHeader
                cycles={cycles}
                cycleDateLabels={cycleDateLabels}
                layout={layout}
                labelOffsetClass={layout.labelOffsetClass}
            />

            <div className={layout.threadRowGapClass}>
                {domain.targets.map((target, targetIndex) => (
                    <TargetThread
                        key={target.targetId}
                        target={target}
                        targetIndex={targetIndex}
                        cycles={cycles}
                        cycleDateLabels={cycleDateLabels}
                        layout={layout}
                    />
                ))}
            </div>
        </section>
    );
}
