import { LearnerMapCell, LearnerMapTarget } from '../../../services/learnerMapProfile';
import { SnapshotLayoutMode } from '../../../utils/snapshotLayoutEngine';
import {
    disambiguateVisibleCodes,
    resolveThreadDisplayLabel,
} from './snapshotTargetIdentity';
import { truncatePreservingDistinction } from './snapshotVisualSystem';

export interface ThreadLabelDisplay {
    code: string;
    /** Visible code after length-aware distinction-preserving truncation. */
    visibleCode: string;
    /** Always null — titles are tooltip/aria only (PR13.5A). */
    subtitle: string | null;
    fullTitle: string;
    accessibleLabel: string;
    /** Always false — code-only visible rows. */
    showSubtitle: boolean;
    /** From {@link resolveThreadDisplayLabel} — compacted longer authored id. */
    wasCompacted: boolean;
    /** From {@link resolveThreadDisplayLabel} — title/positional fallback. */
    usedNonAuthoredFallback: boolean;
    /** True when {@link disambiguateVisibleCodes} added a `-2`/`-3`/… suffix. */
    wasDisambiguated: boolean;
}

const CODE_MAX_BY_MODE: Record<SnapshotLayoutMode, number> = {
    screen: 10,
    print: 10,
};

function buildAccessibleLabel(accessibilityIdentity: string, fullTitle: string): string {
    if (fullTitle && fullTitle.toLowerCase() !== accessibilityIdentity.toLowerCase()) {
        return `${accessibilityIdentity} — ${fullTitle}`;
    }
    return accessibilityIdentity;
}

/**
 * Deterministic target identity for Snapshot rows.
 * Prefer full short codes; never collapse a zone of siblings into one shared truncated prefix.
 * Visible label is code only — full authored ID + title remain on tooltip / aria-label.
 */
export function resolveThreadLabelDisplay(
    target: Pick<LearnerMapTarget, 'targetId' | 'title'>,
    targetIndex: number,
    mode: SnapshotLayoutMode
): ThreadLabelDisplay {
    const {
        primary,
        fullTitle,
        accessibilityIdentity,
        wasCompacted,
        usedNonAuthoredFallback,
    } = resolveThreadDisplayLabel(target, targetIndex);

    const codeMax = CODE_MAX_BY_MODE[mode];
    const visibleCode =
        primary.length <= codeMax
            ? primary
            : truncatePreservingDistinction(primary, codeMax);

    return {
        code: primary,
        visibleCode,
        subtitle: null,
        fullTitle,
        accessibleLabel: buildAccessibleLabel(accessibilityIdentity, fullTitle),
        showSubtitle: false,
        wasCompacted,
        usedNonAuthoredFallback,
        wasDisambiguated: false,
    };
}

/** Target Index trigger (§6.3) — any abbreviation of the visible thread code. */
export function isTargetIndexTrigger(label: Pick<
    ThreadLabelDisplay,
    'wasCompacted' | 'usedNonAuthoredFallback' | 'wasDisambiguated'
>): boolean {
    return label.wasCompacted || label.usedNonAuthoredFallback || label.wasDisambiguated;
}

/**
 * Resolve labels for every thread in a child zone, then disambiguate colliding visible codes.
 */
export function resolveZoneThreadLabelDisplays(
    targets: Array<Pick<LearnerMapTarget, 'targetId' | 'title'>>,
    mode: SnapshotLayoutMode
): ThreadLabelDisplay[] {
    const resolved = targets.map((target, index) =>
        resolveThreadLabelDisplay(target, index, mode)
    );
    const disambiguated = disambiguateVisibleCodes(
        resolved.map((label) => label.visibleCode)
    );

    return resolved.map((label, index) => {
        const visibleCode = disambiguated[index] ?? label.visibleCode;
        const wasDisambiguated = visibleCode !== label.visibleCode;
        if (!wasDisambiguated) {
            return label;
        }
        return {
            ...label,
            visibleCode,
            wasDisambiguated: true,
        };
    });
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
