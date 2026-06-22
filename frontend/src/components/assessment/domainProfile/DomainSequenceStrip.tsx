import { DomainProfileTarget } from '../../../services/domainProfile';
import { competencySequenceCellClass, STATE_DISPLAY_LABELS } from './stateDisplay';

interface Props {
    sequence: DomainProfileTarget[];
    scoredCount: number;
}

export function DomainSequenceStrip({ sequence, scoredCount }: Props) {
    if (sequence.length === 0) {
        return null;
    }

    if (scoredCount === 0) {
        return (
            <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Target Sequence
                </h4>
                <p className="text-sm text-gray-500 italic">No targets scored yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Target Sequence
            </h4>
            <div
                className="overflow-x-auto pb-1"
                role="list"
                aria-label="Target sequence strip"
            >
                <div className="flex flex-nowrap gap-1 min-w-min">
                    {sequence.map((item) => {
                        const state = item.interpretation.competencyState;
                        const scoreDisplay = item.interpretation.displayScoreWithMax;
                        const targetId = item.target.target_id;
                        const stateLabel = STATE_DISPLAY_LABELS[state];

                        return (
                            <div
                                key={targetId}
                                role="listitem"
                                className={`h-8 w-8 shrink-0 rounded-sm ${competencySequenceCellClass(state)}`}
                                title={`${targetId} — ${scoreDisplay}`}
                                aria-label={`Target ${targetId}, ${stateLabel}, ${scoreDisplay}`}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
