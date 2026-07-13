import { LearnerMapCell, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { SnapshotLayoutMode } from '../../../utils/snapshotLayoutEngine';
import { resolveThreadDisplayLabel } from './threadsLayout';
import {
    shouldShowThreadSubtitle,
    truncatePreservingDistinction,
} from './snapshotVisualSystem';

export interface ThreadLabelDisplay {
    code: string;
    /** Visible code after length-aware distinction-preserving truncation. */
    visibleCode: string;
    subtitle: string | null;
    fullTitle: string;
    accessibleLabel: string;
    showSubtitle: boolean;
}

const DEFAULT_TITLE_MAX = 20;
const PRINT_TITLE_MAX = 16;
const CODE_MAX_BY_MODE: Record<SnapshotLayoutMode, number> = {
    screen: 8,
    print: 10,
};

export function shortenThreadTitle(title: string, maxLength: number): string {
    const trimmed = title.trim();
    if (trimmed.length <= maxLength) {
        return trimmed;
    }

    return `${trimmed.slice(0, Math.max(1, maxLength - 1))}…`;
}

/**
 * Deterministic target identity for Snapshot rows.
 * Prefer full short codes; never collapse a zone of siblings into one shared truncated prefix.
 */
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

    const codeMax = CODE_MAX_BY_MODE[mode];
    const visibleCode =
        primary.length <= codeMax
            ? primary
            : truncatePreservingDistinction(primary, codeMax);

    const strippedTitle = fullTitle.replace(/^Target\s+/i, '').trim();
    const titleMax = mode === 'print' ? PRINT_TITLE_MAX : DEFAULT_TITLE_MAX;
    const subtitleSource =
        strippedTitle && strippedTitle.toLowerCase() !== primary.toLowerCase()
            ? strippedTitle
            : fullTitle !== primary
              ? fullTitle
              : null;
    const subtitle = subtitleSource
        ? shortenThreadTitle(subtitleSource, titleMax)
        : null;
    const showSubtitle = shouldShowThreadSubtitle(mode, primary, subtitle, codeMax);

    return {
        code: primary,
        visibleCode,
        subtitle: showSubtitle ? subtitle : null,
        fullTitle,
        accessibleLabel: `${primary} · ${fullTitle} (${target.targetId})`,
        showSubtitle,
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
