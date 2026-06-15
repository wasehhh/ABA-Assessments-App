import { CompetencyState } from '../../../utils/scoreInterpretation';

/** User-facing score band labels (display only; internal enum values unchanged). */
export const STATE_DISPLAY_LABELS: Record<CompetencyState, string> = {
    unscored: 'Unscored',
    not_yet: 'Not Yet',
    in_progress: 'Emerging',
    at_maximum: 'Mastered',
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
        segmentClass: 'bg-gray-500',
        legendClass: 'border-gray-500 bg-gray-200',
    },
    {
        key: 'in_progress',
        label: STATE_DISPLAY_LABELS.in_progress,
        segmentClass: 'bg-amber-400',
        legendClass: 'border-amber-400 bg-amber-50',
    },
    {
        key: 'at_maximum',
        label: STATE_DISPLAY_LABELS.at_maximum,
        segmentClass: 'bg-emerald-600',
        legendClass: 'border-emerald-600 bg-emerald-50',
    },
];
