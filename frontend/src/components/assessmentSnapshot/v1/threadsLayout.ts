import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { LearnerMapTarget } from '../../../services/learnerMapProfile';

export type ThreadsLayoutTier = 'compact' | 'standard' | 'dense';

export interface ThreadsLayoutTokens {
    tier: ThreadsLayoutTier;
    labelWidthClass: string;
    beadSlotWidthClass: string;
    beadGapClass: string;
    beadSizeDefault: string;
    beadSizeLatest: string;
    maxRingSize: string;
    threadRowGapClass: string;
    domainGapClass: string;
    domainZoneClass: string;
    cycleHeaderClass: string;
    domainTitleClass: string;
    domainMetaClass: string;
    threadLabelClass: string;
    labelOffsetClass: string;
    domainColumnWidthRem: number;
}

const BEAD_DEFAULT = 'h-[1.125rem] w-[1.125rem] min-h-[1.125rem] min-w-[1.125rem] text-[9px]';
const BEAD_LATEST = 'h-[1.375rem] w-[1.375rem] min-h-[1.375rem] min-w-[1.375rem] text-[10px]';
const BEAD_STANDARD = 'h-5 w-5 min-h-[1.25rem] min-w-[1.25rem] text-[10px]';
const BEAD_LATEST_STANDARD = 'h-6 w-6 min-h-[1.5rem] min-w-[1.5rem] text-[11px]';

/** Horizontal space per bead slot including inter-bead gap. */
const BEAD_SLOT_REM = {
    compact: 1.625,
    standard: 1.75,
    dense: 1.5,
} as const;

const LAYOUT_BY_TIER: Record<ThreadsLayoutTier, Omit<ThreadsLayoutTokens, 'tier' | 'domainColumnWidthRem'>> = {
    compact: {
        labelWidthClass: 'w-9',
        beadSlotWidthClass: 'w-5',
        beadGapClass: 'gap-1.5',
        beadSizeDefault: BEAD_STANDARD,
        beadSizeLatest: BEAD_LATEST_STANDARD,
        maxRingSize: 'h-5 w-5 text-[10px]',
        threadRowGapClass: 'space-y-1',
        domainGapClass: 'gap-x-5 gap-y-4',
        domainZoneClass: 'py-1',
        cycleHeaderClass: 'text-[9px]',
        domainTitleClass: 'text-[10px]',
        domainMetaClass: 'text-[9px]',
        threadLabelClass: 'text-[10px]',
        labelOffsetClass: 'pl-[calc(2.25rem+0.25rem)]',
    },
    standard: {
        labelWidthClass: 'w-10',
        beadSlotWidthClass: 'w-5',
        beadGapClass: 'gap-1.5',
        beadSizeDefault: BEAD_STANDARD,
        beadSizeLatest: BEAD_LATEST_STANDARD,
        maxRingSize: 'h-5 w-5 text-[10px]',
        threadRowGapClass: 'space-y-1',
        domainGapClass: 'gap-x-5 gap-y-4',
        domainZoneClass: 'py-1',
        cycleHeaderClass: 'text-[9px]',
        domainTitleClass: 'text-[10px]',
        domainMetaClass: 'text-[9px]',
        threadLabelClass: 'text-[10px]',
        labelOffsetClass: 'pl-[calc(2.5rem+0.25rem)]',
    },
    dense: {
        labelWidthClass: 'w-8',
        beadSlotWidthClass: 'w-[1.125rem]',
        beadGapClass: 'gap-1',
        beadSizeDefault: BEAD_DEFAULT,
        beadSizeLatest: BEAD_LATEST,
        maxRingSize: 'h-[1.125rem] w-[1.125rem] text-[9px]',
        threadRowGapClass: 'space-y-0.5',
        domainGapClass: 'gap-x-4 gap-y-3',
        domainZoneClass: 'py-0.5',
        cycleHeaderClass: 'text-[8px]',
        domainTitleClass: 'text-[9px]',
        domainMetaClass: 'text-[8px]',
        threadLabelClass: 'text-[9px]',
        labelOffsetClass: 'pl-[calc(2rem+0.25rem)]',
    },
};

export function resolveThreadsLayoutTier(profile: AssessmentSnapshotProfile): ThreadsLayoutTier {
    const totalTargets = profile.domains.reduce((sum, domain) => sum + domain.targets.length, 0);
    const cycleCount = profile.cycles.length;
    const domainCount = profile.domains.length;

    if (totalTargets > 75 || domainCount > 7 || cycleCount > 8) {
        return 'dense';
    }

    if (totalTargets <= 35 && domainCount <= 4 && cycleCount <= 5) {
        return 'compact';
    }

    return 'standard';
}

/** @deprecated RenderPlan is now authoritative. Remove after remaining preview consumers migrate to resolveThreadsLayoutFromPlan. */
export function resolveThreadsLayout(profile: AssessmentSnapshotProfile): ThreadsLayoutTokens {
    const tier = resolveThreadsLayoutTier(profile);
    const cycleCount = profile.cycles.length;
    const domainColumnWidthRem = domainColumnWidthRemForCycles(cycleCount, tier);

    return { tier, domainColumnWidthRem, ...LAYOUT_BY_TIER[tier] };
}

export function resolveThreadsLayoutFromPlan(plan: {
    tier: ThreadsLayoutTier;
    domainColumnWidthRem: number;
}): ThreadsLayoutTokens {
    return {
        tier: plan.tier,
        domainColumnWidthRem: plan.domainColumnWidthRem,
        ...LAYOUT_BY_TIER[plan.tier],
    };
}

export interface ThreadDisplayLabel {
    primary: string;
    fullTitle: string;
}

/**
 * Resolves the compact thread label from real target identity — not mock A/B lettering.
 */
export function resolveThreadDisplayLabel(
    target: LearnerMapTarget,
    targetIndex: number
): ThreadDisplayLabel {
    const fullTitle = target.title.trim() || target.targetId;

    const domainTargetMatch = target.targetId.match(/^D(\d+)T(\d+)$/i);
    if (domainTargetMatch) {
        const domainNumber = Number(domainTargetMatch[1]);
        const letter =
            domainNumber >= 1 && domainNumber <= 26
                ? String.fromCharCode(64 + domainNumber)
                : String(domainNumber);
        return {
            primary: `${letter}${domainTargetMatch[2]}`,
            fullTitle,
        };
    }

    const abllsStyleCode = fullTitle.match(/\b([A-Z]\d{1,3})\b/);
    if (abllsStyleCode) {
        return { primary: abllsStyleCode[1].toUpperCase(), fullTitle };
    }

    const normalizedId = target.targetId.replace(/^DOM_[A-Z0-9]+_/i, '').trim();
    if (normalizedId.length > 0 && normalizedId.length <= 12 && !/^T\d+$/i.test(normalizedId)) {
        return { primary: normalizedId, fullTitle };
    }

    const numericSuffix = fullTitle.match(/(\d+(?:\.\d+)?)\s*$/);
    if (numericSuffix) {
        return { primary: numericSuffix[1], fullTitle };
    }

    const idSuffix = target.targetId.match(/T(\d+)$/i);
    if (idSuffix) {
        return { primary: `T${idSuffix[1]}`, fullTitle };
    }

    return { primary: String(targetIndex + 1), fullTitle };
}

function labelWidthRem(tier: ThreadsLayoutTier): number {
    if (tier === 'dense') return 2;
    if (tier === 'compact') return 2.25;
    return 2.5;
}

/** Fixed column width shared by every domain in one assessment. */
export function domainColumnWidthRemForCycles(
    cycleCount: number,
    tier: ThreadsLayoutTier
): number {
    const labelRem = labelWidthRem(tier);
    const beadSlotRem = BEAD_SLOT_REM[tier];
    const arrowSlotRem = tier === 'dense' ? 0.75 : 0.85;
    const arrowGapRem = 0.375;
    const maxRingRem = tier === 'dense' ? 1.25 : 1.35;

    return labelRem + cycleCount * beadSlotRem + arrowSlotRem + arrowGapRem + maxRingRem;
}

export function domainColumnStyle(layout: ThreadsLayoutTokens): { width: string } {
    return { width: `${layout.domainColumnWidthRem}rem` };
}
