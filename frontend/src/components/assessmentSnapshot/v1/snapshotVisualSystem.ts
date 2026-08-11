import { CompetencyState } from '../../../utils/scoreInterpretation';
import { SnapshotLayoutMode } from '../../../utils/snapshotLayoutEngine';
import { STATE_DISPLAY_LABELS } from '../../assessment/domainProfile/stateDisplay';

/** En dash for clinical ranges (Targets 47–92). */
export const SNAPSHOT_EN_DASH = '–';

export const SNAPSHOT_LEGEND_SCORE_HINT = 'Number inside each bead = score for that cycle';
export const SNAPSHOT_LEGEND_MAX_HINT = 'Hollow mark = target maximum';

export function formatStructureCount(count: number, singularLabel: string): string {
    const base = singularLabel.trim().toLowerCase() || 'target';
    if (count === 1) {
        return `1 ${base}`;
    }

    if (base.endsWith('s')) {
        return `${count} ${base}`;
    }

    return `${count} ${base}s`;
}

/** Plural noun in title case for range labels (e.g. Targets, Milestones). */
export function formatPluralNounTitle(singularLabel: string): string {
    const base = singularLabel.trim().toLowerCase() || 'target';
    const plural = base.endsWith('s') ? base : `${base}s`;
    return plural.charAt(0).toUpperCase() + plural.slice(1);
}

/** Screen presentation-Part continuation heading. */
export function formatPresentationPartHeading(
    partNumber: number,
    options?: { continued?: boolean }
): string {
    const continued = options?.continued ? ' (continued)' : '';
    return `Part ${partNumber}${continued}`;
}

export function formatTargetOrdinalRange(
    start: number,
    end: number,
    targetLabel: string
): string {
    return `${formatPluralNounTitle(targetLabel)} ${start}${SNAPSHOT_EN_DASH}${end}`;
}

/** Alias retained for screen Part callers. Prefer {@link formatTargetOrdinalRange}. */
export const formatPresentationTargetRange = formatTargetOrdinalRange;

/** Soft title-case for display headings; preserves short mixed-case acronyms. */
export function toDisplayTitleCase(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) {
        return trimmed;
    }

    const letters = trimmed.replace(/[^A-Za-z]/g, '');
    const shouty = letters.length > 0 && letters === letters.toUpperCase();

    return trimmed
        .split(/\s+/)
        .map((word) => {
            if (word === '&') {
                return word;
            }
            if (/^\d/.test(word)) {
                return word;
            }
            if (!shouty && /^[A-Z0-9]{2,5}$/.test(word)) {
                return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}

/**
 * Truncate while preferring a unique trailing segment so shared prefixes
 * (AFLS_, PEAK_, DOM_) never collapse every row to the same visible prefix.
 */
export function truncatePreservingDistinction(value: string, maxLength: number): string {
    const trimmed = value.trim();
    if (trimmed.length <= maxLength) {
        return trimmed;
    }

    if (maxLength <= 2) {
        return trimmed.slice(-maxLength);
    }

    const suffixMatch = trimmed.match(/([_\-.]?[A-Za-z]*\d+[A-Za-z0-9]*)$/);
    if (suffixMatch) {
        const suffix = suffixMatch[1].replace(/^[_\-.]/, '');
        if (suffix.length > 0 && suffix.length < maxLength) {
            const ellipsisBudget = maxLength - suffix.length;
            if (ellipsisBudget >= 1) {
                return `…${suffix}`.slice(0, maxLength);
            }
            return suffix.slice(0, maxLength);
        }
    }

    return `…${trimmed.slice(-(maxLength - 1))}`;
}

export function codesShareVisiblePrefix(codes: string[], visibleLength: number): boolean {
    if (codes.length < 2 || visibleLength <= 0) {
        return false;
    }

    const prefixes = codes.map((code) => code.slice(0, visibleLength));
    return prefixes.every((prefix) => prefix === prefixes[0] && prefix.length === visibleLength);
}

export interface SnapshotLegendCopy {
    states: Array<{ key: CompetencyState; label: string }>;
    scoreHint: string;
    maxHint: string;
}

export function resolveSnapshotLegendCopy(): SnapshotLegendCopy {
    return {
        states: [
            { key: 'not_yet', label: STATE_DISPLAY_LABELS.not_yet },
            { key: 'in_progress', label: STATE_DISPLAY_LABELS.in_progress },
            { key: 'at_maximum', label: STATE_DISPLAY_LABELS.at_maximum },
            { key: 'unscored', label: STATE_DISPLAY_LABELS.unscored },
        ],
        scoreHint: SNAPSHOT_LEGEND_SCORE_HINT,
        maxHint: SNAPSHOT_LEGEND_MAX_HINT,
    };
}

/** Dark numerals on light competency fills for screen/print readability. */
export function beadNumeralClass(state: CompetencyState | 'unscored'): string {
    if (state === 'not_yet' || state === 'in_progress' || state === 'unscored') {
        return 'text-gray-900';
    }

    if (state === 'at_maximum') {
        return 'text-white';
    }

    return 'text-gray-900';
}

/**
 * Hollow ceiling marker — green outline only.
 * Distinct from Demonstrated evidence beads (solid green fill).
 */
export function maxRingSurfaceClass(): string {
    return 'assessment-snapshot-max-ring rounded-full border-2 border-green-700 bg-white font-mono font-medium tabular-nums text-green-900';
}

/** Legend swatch matching the hollow green-outline maximum ring. */
export function maxRingLegendSwatchClass(): string {
    return 'assessment-snapshot-max-ring rounded-full border-2 border-green-700 bg-white';
}

export function maxRingAccessibleLabel(targetTitle: string, maxDisplay: string): string {
    return `${targetTitle} · Maximum ${maxDisplay}`;
}

/** Visible thread subtitles are retired (PR13.5A). Titles remain on tooltip / aria-label. */
export function shouldShowThreadSubtitle(
    _mode: SnapshotLayoutMode,
    _code: string,
    _subtitle: string | null,
    _codeMaxChars: number
): boolean {
    return false;
}
