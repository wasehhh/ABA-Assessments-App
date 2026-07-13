import { LearnerMapTarget } from '../../../services/learnerMapProfile';
import { LearnerMapCell } from '../../../services/learnerMapProfile';
import { SnapshotLayoutMode } from '../../../utils/snapshotLayoutEngine';
import { resolveThreadDisplayLabel } from './threadsLayout';

export interface ThreadLabelDisplay {
    code: string;
    subtitle: string | null;
    fullTitle: string;
    accessibleLabel: string;
}

const DEFAULT_TITLE_MAX = 18;
const PRINT_TITLE_MAX = 14;

export function shortenThreadTitle(title: string, maxLength: number): string {
    const trimmed = title.trim();
    if (trimmed.length <= maxLength) {
        return trimmed;
    }

    return `${trimmed.slice(0, Math.max(1, maxLength - 1))}…`;
}

export function resolveThreadLabelDisplay(
    target: Pick<LearnerMapTarget, 'targetId' | 'title'>,
    targetIndex: number,
    mode: SnapshotLayoutMode
): ThreadLabelDisplay {
    const { primary, fullTitle } = resolveThreadDisplayLabel(
        {
            targetId: target.targetId,
            title: target.title,
            displayTargetMax: '4',
            cells: [],
        },
        targetIndex
    );

    const strippedTitle = fullTitle.replace(/^Target\s+/i, '').trim();
    const titleMax = mode === 'print' ? PRINT_TITLE_MAX : DEFAULT_TITLE_MAX;
    const subtitleSource = strippedTitle && strippedTitle !== primary ? strippedTitle : fullTitle;
    const subtitle = shortenThreadTitle(subtitleSource, titleMax);
    const showSubtitle = subtitle.length > 0 && subtitle !== primary;

    return {
        code: primary,
        subtitle: showSubtitle ? subtitle : null,
        fullTitle,
        accessibleLabel:
            mode === 'print'
                ? `${primary} · ${fullTitle} (${target.targetId})`
                : `${fullTitle} (${target.targetId})`,
    };
}

/** Compact bead surface text — numeric when possible; falls back to short labels without overflow. */
export function resolveBeadSurfaceText(cell: LearnerMapCell): string {
    if (cell.isUnscored || cell.rawScore === null) {
        return '—';
    }

    const displayPrefix = cell.displayScoreWithMax.split('/')[0]?.trim() ?? '';

    if (/^\d{1,2}$/.test(displayPrefix)) {
        return displayPrefix;
    }

    if (/^(yes|no|y|n)$/i.test(displayPrefix)) {
        return displayPrefix.charAt(0).toUpperCase();
    }

    if (displayPrefix.length > 0 && displayPrefix.length <= 3) {
        return displayPrefix;
    }

    if (cell.rawScore !== null && Number.isFinite(cell.rawScore)) {
        return String(cell.rawScore);
    }

    return displayPrefix.slice(0, 2) || '—';
}
