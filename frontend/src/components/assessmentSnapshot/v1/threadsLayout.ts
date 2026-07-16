import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
export type { ThreadDisplayLabel } from './snapshotTargetIdentity';
export {
    compactStructuredTargetId,
    disambiguateVisibleCodes,
    isUnusableAuthoredTargetId,
    resolveThreadDisplayLabel,
} from './snapshotTargetIdentity';

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
const BEAD_LATEST = 'h-[1.2rem] w-[1.2rem] min-h-[1.2rem] min-w-[1.2rem] text-[9px]';
const BEAD_STANDARD = 'h-5 w-5 min-h-[1.25rem] min-w-[1.25rem] text-[10px]';
const BEAD_LATEST_STANDARD = 'h-[1.35rem] w-[1.35rem] min-h-[1.35rem] min-w-[1.35rem] text-[10px]';

/** Horizontal space per bead slot including inter-bead gap. */
const BEAD_SLOT_REM = {
    compact: 1.625,
    standard: 1.75,
    dense: 1.5,
} as const;

const LAYOUT_BY_TIER: Record<ThreadsLayoutTier, Omit<ThreadsLayoutTokens, 'tier' | 'domainColumnWidthRem'>> = {
    compact: {
        labelWidthClass: 'w-12',
        beadSlotWidthClass: 'w-5',
        beadGapClass: 'gap-1.5',
        beadSizeDefault: BEAD_STANDARD,
        beadSizeLatest: BEAD_LATEST_STANDARD,
        maxRingSize: 'h-5 w-5 text-[9px]',
        threadRowGapClass: 'space-y-1',
        domainGapClass: 'gap-x-5 gap-y-4',
        domainZoneClass: 'py-1',
        cycleHeaderClass: 'text-[8px]',
        domainTitleClass: 'text-[11px]',
        domainMetaClass: 'text-[9px]',
        threadLabelClass: 'text-[10px]',
        labelOffsetClass: 'pl-[calc(3rem+0.25rem)]',
    },
    standard: {
        labelWidthClass: 'w-12',
        beadSlotWidthClass: 'w-5',
        beadGapClass: 'gap-1.5',
        beadSizeDefault: BEAD_STANDARD,
        beadSizeLatest: BEAD_LATEST_STANDARD,
        maxRingSize: 'h-5 w-5 text-[9px]',
        threadRowGapClass: 'space-y-1',
        domainGapClass: 'gap-x-5 gap-y-4',
        domainZoneClass: 'py-1',
        cycleHeaderClass: 'text-[8px]',
        domainTitleClass: 'text-[11px]',
        domainMetaClass: 'text-[9px]',
        threadLabelClass: 'text-[10px]',
        labelOffsetClass: 'pl-[calc(3rem+0.25rem)]',
    },
    dense: {
        labelWidthClass: 'w-12',
        beadSlotWidthClass: 'w-[1.125rem]',
        beadGapClass: 'gap-1',
        beadSizeDefault: BEAD_DEFAULT,
        beadSizeLatest: BEAD_LATEST,
        maxRingSize: 'h-[1.125rem] w-[1.125rem] text-[8px]',
        threadRowGapClass: 'space-y-0.5',
        domainGapClass: 'gap-x-4 gap-y-3',
        domainZoneClass: 'py-0.5',
        cycleHeaderClass: 'text-[7px]',
        domainTitleClass: 'text-[10px]',
        domainMetaClass: 'text-[8px]',
        threadLabelClass: 'text-[9px]',
        labelOffsetClass: 'pl-[calc(3rem+0.25rem)]',
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

function labelWidthRem(tier: ThreadsLayoutTier): number {
    // Code-only rows — keep a consistent 3rem label column across tiers for AFLS_205 / ECHO_12.
    void tier;
    return 3;
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
