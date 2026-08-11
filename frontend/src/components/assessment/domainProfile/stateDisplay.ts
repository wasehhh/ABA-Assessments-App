import { CompetencyState } from '../../../utils/scoreInterpretation';

/** User-facing score band labels (display only; internal enum values unchanged). */
export const STATE_DISPLAY_LABELS: Record<CompetencyState, string> = {
    unscored: 'Unscored',
    not_yet: 'Not Demonstrated',
    in_progress: 'Emerging',
    at_maximum: 'Demonstrated',
};

export interface StateBucketDisplay {
    key: CompetencyState;
    label: string;
    segmentClass: string;
    legendClass: string;
}

export const STATE_BUCKET_DISPLAY: StateBucketDisplay[] = [
    {
        key: 'unscored',
        label: STATE_DISPLAY_LABELS.unscored,
        segmentClass: 'bg-gray-300',
        legendClass: 'border-gray-300 bg-gray-100',
    },
    {
        key: 'not_yet',
        label: STATE_DISPLAY_LABELS.not_yet,
        segmentClass: 'bg-orange-500',
        legendClass: 'border-orange-500 bg-orange-50',
    },
    {
        key: 'in_progress',
        label: STATE_DISPLAY_LABELS.in_progress,
        segmentClass: 'bg-yellow-400',
        legendClass: 'border-yellow-400 bg-yellow-50',
    },
    {
        key: 'at_maximum',
        label: STATE_DISPLAY_LABELS.at_maximum,
        segmentClass: 'bg-green-600',
        legendClass: 'border-green-600 bg-green-50',
    },
];

/** Border accents paired with segment fills for swatches and sequence cells. */
export const COMPETENCY_STATE_BORDER_CLASS: Record<CompetencyState, string> = {
    unscored: 'border-gray-400',
    not_yet: 'border-orange-600',
    in_progress: 'border-yellow-500',
    at_maximum: 'border-green-700',
};

export function competencyStateBucket(state: CompetencyState): StateBucketDisplay {
    return STATE_BUCKET_DISPLAY.find((bucket) => bucket.key === state) ?? STATE_BUCKET_DISPLAY[0];
}

/** Legend / key swatch — matches distribution bar fill, not pale legend variants. */
export function competencyLegendSwatchClass(state: CompetencyState): string {
    const bucket = competencyStateBucket(state);
    const borderClass =
        state === 'unscored'
            ? `${COMPETENCY_STATE_BORDER_CLASS.unscored} border-dashed`
            : COMPETENCY_STATE_BORDER_CLASS[state];

    return `border ${borderClass} ${bucket.segmentClass}`;
}

/** Target sequence cell — same canonical fills as distribution bar. */
export function competencySequenceCellClass(state: CompetencyState): string {
    const bucket = competencyStateBucket(state);
    const borderClass =
        state === 'unscored'
            ? `${COMPETENCY_STATE_BORDER_CLASS.unscored} border-dashed`
            : COMPETENCY_STATE_BORDER_CLASS[state];

    return `border-2 ${borderClass} ${bucket.segmentClass}`;
}
