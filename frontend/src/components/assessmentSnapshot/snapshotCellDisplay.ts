import { CompetencyState } from '../../utils/scoreInterpretation';
import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';

export function snapshotCellClass(state: CompetencyState): string {
    const bucket =
        STATE_BUCKET_DISPLAY.find((entry) => entry.key === state) ?? STATE_BUCKET_DISPLAY[0];

    if (state === 'unscored') {
        return `border border-dashed border-gray-400 ${bucket.segmentClass}`;
    }

    return `border border-gray-300 ${bucket.segmentClass}`;
}

export function snapshotCellLabel(state: CompetencyState): string {
    const bucket =
        STATE_BUCKET_DISPLAY.find((entry) => entry.key === state) ?? STATE_BUCKET_DISPLAY[0];

    return bucket.label;
}
