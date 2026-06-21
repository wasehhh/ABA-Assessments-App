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
