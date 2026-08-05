import { LearnerMapTarget } from '../../../services/learnerMapProfile';

export interface ThreadDisplayLabel {
    primary: string;
    fullTitle: string;
    /**
     * Lead identity for tooltip / aria-label.
     * Full authored targetId when the visible code is a compact form of a longer ID;
     * otherwise the clinical primary code (e.g. A1, ECHO_12).
     */
    accessibilityIdentity: string;
    /** True when `primary` is a compacted form of a longer usable authored id. */
    wasCompacted: boolean;
    /**
     * True when the visible code came from title helpers or positional fallback
     * because the authored id was unusable (`isUnusableAuthoredTargetId`).
     */
    usedNonAuthoredFallback: boolean;
}

const SHORT_ID_MAX = 10;
const COMPACT_CODE_MAX = 10;

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_HEX_RE = /^[0-9a-f]{16,}$/i;
const OPAQUE_T_NUMBER_RE = /^T\d+$/i;
const DOM_PREFIX_RE = /^DOM_[A-Z0-9]+_/i;

/**
 * True when the ID is empty, UUID-like, or an opaque system key — not a clinical authored code.
 */
export function isUnusableAuthoredTargetId(targetId: string): boolean {
    const trimmed = targetId.trim();
    if (!trimmed) {
        return true;
    }
    if (UUID_RE.test(trimmed) || OPAQUE_HEX_RE.test(trimmed)) {
        return true;
    }
    const withoutDom = trimmed.replace(DOM_PREFIX_RE, '').trim();
    if (OPAQUE_T_NUMBER_RE.test(withoutDom)) {
        return true;
    }
    return false;
}

function stripDomPrefix(targetId: string): string {
    return targetId.replace(DOM_PREFIX_RE, '').trim();
}

/**
 * Abbreviate a single middle segment for compact display.
 * Short words stay intact; longer words take a 3-letter stem.
 */
function abbreviateSegment(word: string): string {
    const upper = word.toUpperCase();
    if (upper.length <= 4) {
        return upper;
    }
    return upper.slice(0, 3);
}

/**
 * Deterministic compact grammar for long structured IDs.
 * Examples:
 * - L1_LISTENER_RESPONDING_1 → L1-LR-1
 * - L1_MAND_1 → L1-MAND-1
 * - L1_SOCIAL_2 → L1-SOC-2
 *
 * Preserves a meaningful prefix and numeric suffix; never returns only the final number.
 */
export function compactStructuredTargetId(
    targetId: string,
    maxLength: number = COMPACT_CODE_MAX
): string {
    const id = stripDomPrefix(targetId);
    if (!id) {
        return id;
    }
    if (id.length <= maxLength) {
        return id;
    }

    const parts = id.split(/[_\-.]+/).filter(Boolean);
    if (parts.length < 2) {
        return truncateLongIdPreservingEnds(id, maxLength);
    }

    const last = parts[parts.length - 1];
    const hasNumericSuffix = /^\d+[A-Za-z]*$/.test(last) && /\d/.test(last);
    const suffix = hasNumericSuffix ? last.toUpperCase() : null;
    const head = hasNumericSuffix ? parts.slice(0, -1) : parts;

    if (head.length === 0) {
        return (suffix ?? id).slice(0, maxLength);
    }

    const prefix = head[0].toUpperCase();
    const middle = head.slice(1);

    let mid = '';
    if (middle.length === 1) {
        mid = abbreviateSegment(middle[0]);
    } else if (middle.length > 1) {
        mid = middle.map((part) => part.charAt(0).toUpperCase()).join('');
    }

    let candidate =
        mid.length > 0
            ? suffix
                ? `${prefix}-${mid}-${suffix}`
                : `${prefix}-${mid}`
            : suffix
              ? `${prefix}-${suffix}`
              : prefix;

    if (candidate.length <= maxLength) {
        return candidate;
    }

    // Prefer keeping prefix + suffix when over budget.
    if (suffix) {
        const tightMid =
            mid.length > 1 ? mid.charAt(0) : mid.length === 1 ? mid : '';
        candidate =
            tightMid.length > 0
                ? `${prefix}-${tightMid}-${suffix}`
                : `${prefix}-${suffix}`;
        if (candidate.length <= maxLength) {
            return candidate;
        }
        const suffixBudget = Math.max(1, maxLength - prefix.length - 1);
        return `${prefix}-${suffix.slice(0, suffixBudget)}`.slice(0, maxLength);
    }

    return candidate.slice(0, maxLength);
}

function truncateLongIdPreservingEnds(id: string, maxLength: number): string {
    if (id.length <= maxLength) {
        return id;
    }
    if (maxLength <= 2) {
        return id.slice(-maxLength);
    }
    const suffixMatch = id.match(/([_\-.]?[A-Za-z]*\d+[A-Za-z0-9]*)$/);
    if (suffixMatch) {
        const suffix = suffixMatch[1].replace(/^[_\-.]/, '');
        if (suffix.length > 0 && suffix.length < maxLength) {
            return `…${suffix}`.slice(0, maxLength);
        }
    }
    return `…${id.slice(-(maxLength - 1))}`;
}

/**
 * Resolve clinical primary code from authored identity.
 * Authority: usable targetId → short code from ID → title helpers only if ID unusable → positional.
 */
export function resolveThreadDisplayLabel(
    target: Pick<LearnerMapTarget, 'targetId' | 'title'>,
    targetIndex: number
): ThreadDisplayLabel {
    const fullTitle = target.title.trim() || target.targetId;
    const rawId = target.targetId.trim();

    const domainTargetMatch = rawId.match(/^D(\d+)T(\d+)$/i);
    if (domainTargetMatch) {
        const domainNumber = Number(domainTargetMatch[1]);
        const letter =
            domainNumber >= 1 && domainNumber <= 26
                ? String.fromCharCode(64 + domainNumber)
                : String(domainNumber);
        const primary = `${letter}${domainTargetMatch[2]}`;
        return {
            primary,
            fullTitle,
            accessibilityIdentity: primary,
            wasCompacted: false,
            usedNonAuthoredFallback: false,
        };
    }

    if (!isUnusableAuthoredTargetId(rawId)) {
        const normalizedId = stripDomPrefix(rawId);
        if (normalizedId.length > 0) {
            const compacted = normalizedId.length > SHORT_ID_MAX;
            const primary = compacted
                ? compactStructuredTargetId(normalizedId, COMPACT_CODE_MAX)
                : normalizedId;
            return {
                primary,
                fullTitle,
                accessibilityIdentity: compacted ? rawId : primary,
                wasCompacted: compacted,
                usedNonAuthoredFallback: false,
            };
        }
    }

    const abllsStyleCode = fullTitle.match(/\b([A-Z]\d{1,3})\b/);
    if (abllsStyleCode) {
        const primary = abllsStyleCode[1].toUpperCase();
        return {
            primary,
            fullTitle,
            accessibilityIdentity: primary,
            wasCompacted: false,
            usedNonAuthoredFallback: true,
        };
    }

    const numericSuffix = fullTitle.match(/(\d+(?:\.\d+)?)\s*$/);
    if (numericSuffix) {
        return {
            primary: numericSuffix[1],
            fullTitle,
            accessibilityIdentity: numericSuffix[1],
            wasCompacted: false,
            usedNonAuthoredFallback: true,
        };
    }

    const primary = String(targetIndex + 1);
    return {
        primary,
        fullTitle,
        accessibilityIdentity: primary,
        wasCompacted: false,
        usedNonAuthoredFallback: true,
    };
}

/**
 * Deterministic disambiguation when sibling visible codes collide within a zone.
 * First occurrence stays; later ones get `-2`, `-3`, …
 */
export function disambiguateVisibleCodes(codes: string[]): string[] {
    const seen = new Map<string, number>();
    return codes.map((code) => {
        const count = (seen.get(code) ?? 0) + 1;
        seen.set(code, count);
        if (count === 1) {
            return code;
        }
        return `${code}-${count}`;
    });
}
