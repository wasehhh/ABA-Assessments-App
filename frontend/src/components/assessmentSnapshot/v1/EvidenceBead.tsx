import { LearnerMapCell, LearnerMapCycleSummary } from '../../../services/learnerMapProfile';
import { formatCycleLabel } from '../record/recordShared';
import {
    beadFocusClass,
    beadScoreText,
    evidenceBeadTitle,
    scoredBeadClass,
    unscoredBeadClass,
} from './targetThreadsShared';
import { ThreadsLayoutTokens } from './threadsLayout';

interface Props {
    cell: LearnerMapCell | null;
    cycle: LearnerMapCycleSummary;
    targetTitle: string;
    targetId: string;
    cycleDateLabels?: Record<string, string>;
    isLatestCycle: boolean;
    layout: ThreadsLayoutTokens;
}

export function EvidenceBead({
    cell,
    cycle,
    targetTitle,
    targetId,
    cycleDateLabels,
    isLatestCycle,
    layout,
}: Props) {
    const sizeClass = isLatestCycle ? layout.beadSizeLatest : layout.beadSizeDefault;
    const emphasisClass = isLatestCycle ? 'ring-1 ring-gray-600/35' : '';
    const isUnscored = !cell || cell.isUnscored;

    const title = isUnscored
        ? `${targetTitle} · ${formatCycleLabel(cycle, cycleDateLabels)} · Unscored · —`
        : evidenceBeadTitle(cell!, cycle, targetTitle, cycleDateLabels);

    return (
        <div
            className={`relative z-10 flex shrink-0 items-center justify-center font-mono font-semibold tabular-nums leading-none ${isUnscored ? unscoredBeadClass() : `${scoredBeadClass(cell!.competencyState)} text-gray-900`} ${sizeClass} ${emphasisClass} ${beadFocusClass()}`}
            data-assessment-snapshot-evidence-bead
            data-target-id={targetId}
            data-cycle-id={cycle.cycleId}
            data-cycle-number={cycle.cycleNumber}
            data-latest-cycle={isLatestCycle ? 'true' : undefined}
            data-is-unscored={isUnscored ? 'true' : 'false'}
            data-competency-state={cell?.competencyState ?? 'unscored'}
            data-raw-score={cell?.rawScore ?? undefined}
            title={title}
            aria-label={title}
            tabIndex={0}
            role="img"
        >
            {isUnscored ? '—' : beadScoreText(cell!)}
        </div>
    );
}
