import { DomainProfileTarget } from '../../../services/domainProfile';
import { CompetencyState } from '../../../utils/scoreInterpretation';

interface Props {
    sequence: DomainProfileTarget[];
}

const STATE_LABELS: Record<CompetencyState, string> = {
    unscored: 'Unscored',
    not_yet: 'Not Yet',
    in_progress: 'In Progress',
    at_maximum: 'At Maximum',
};

const CELL_STYLES: Record<CompetencyState, string> = {
    unscored: 'border-2 border-dashed border-gray-300 bg-white',
    not_yet: 'border-2 border-gray-500 bg-gray-300',
    in_progress: 'border-2 border-amber-600 bg-amber-400',
    at_maximum: 'border-2 border-emerald-800 bg-emerald-500',
};

export function DomainSequenceStrip({ sequence }: Props) {
    if (sequence.length === 0) {
        return null;
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
                        const stateLabel = STATE_LABELS[state];

                        return (
                            <div
                                key={targetId}
                                role="listitem"
                                className={`h-8 w-8 shrink-0 rounded-sm ${CELL_STYLES[state]}`}
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
