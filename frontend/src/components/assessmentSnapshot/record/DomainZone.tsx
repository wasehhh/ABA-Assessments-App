import { LearnerMapCycleSummary, LearnerMapDomain } from '../../../services/learnerMapProfile';
import { EvidenceMarkDensity } from './EvidenceMark';
import { HistoryStrip } from './HistoryStrip';

export type DomainZoneVariant = 'quiet' | 'chapter' | 'ledger';

interface Props {
    domain: LearnerMapDomain;
    cycles: LearnerMapCycleSummary[];
    cycleDateLabels?: Record<string, string>;
    variant: DomainZoneVariant;
    stripDensity?: EvidenceMarkDensity;
    showPerZoneCycleAxis?: boolean;
}

const ZONE_STYLES: Record<
    DomainZoneVariant,
    { section: string; title: string; stripGap: string; labelWidth: string }
> = {
    quiet: {
        section: 'border-t border-gray-200 pt-2',
        title: 'text-[10px] font-semibold uppercase tracking-wide text-gray-500',
        stripGap: 'space-y-0.5',
        labelWidth: 'w-40',
    },
    chapter: {
        section: 'border-l-4 border-slate-700 bg-slate-50/60 py-3 pl-3 pr-2',
        title: 'text-sm font-bold uppercase tracking-wide text-slate-900',
        stripGap: 'space-y-1.5',
        labelWidth: 'w-36',
    },
    ledger: {
        section: 'border-t border-gray-400 pt-3',
        title: 'text-xs font-semibold uppercase tracking-[0.12em] text-gray-800',
        stripGap: 'space-y-1',
        labelWidth: 'w-44',
    },
};

export function DomainZone({
    domain,
    cycles,
    cycleDateLabels,
    variant,
    stripDensity = 'default',
    showPerZoneCycleAxis = false,
}: Props) {
    const styles = ZONE_STYLES[variant];

    return (
        <section
            className={styles.section}
            data-assessment-snapshot-domain-zone
            data-domain-id={domain.domainId}
            data-domain-zone-variant={variant}
        >
            <h2 className={`mb-2 ${styles.title}`}>{domain.title}</h2>
            {showPerZoneCycleAxis ? (
                <div className="mb-2 flex gap-px pl-[calc(theme(spacing.36)+theme(spacing.2))] text-[9px] text-gray-500">
                    {cycles.map((cycle) => (
                        <span key={cycle.cycleId} className="min-w-[2.25rem] text-center tabular-nums">
                            C{cycle.cycleNumber}
                        </span>
                    ))}
                </div>
            ) : null}
            <div className={styles.stripGap}>
                {domain.targets.map((target) => (
                    <HistoryStrip
                        key={target.targetId}
                        target={target}
                        cycles={cycles}
                        cycleDateLabels={cycleDateLabels}
                        labelWidth={styles.labelWidth}
                        density={stripDensity}
                    />
                ))}
            </div>
        </section>
    );
}
