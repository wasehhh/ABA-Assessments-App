import { ChildZonePlan } from '../../../utils/snapshotLayoutEngine';
import { ThreadsLayoutTier } from './threadsLayout';

/**
 * Fixed header bands by layout tier — deterministic CSS grid rows so sibling
 * zones in one packing row share equal baselines without title-length estimation.
 */
export interface DomainZoneHeaderBands {
    /** Fixed title band height (supports up to 3 wrapped lines). */
    primaryTitleBandRem: number;
    targetCountBandRem: number;
    cycleAxisBandRem: number;
    /** Documented max lines the title band accommodates. */
    maxTitleLines: number;
    titleBandClass: string;
    countBandClass: string;
    cycleBandClass: string;
}

const HEADER_BANDS: Record<ThreadsLayoutTier, DomainZoneHeaderBands> = {
    compact: {
        primaryTitleBandRem: 2.85,
        targetCountBandRem: 0.7,
        cycleAxisBandRem: 1.35,
        maxTitleLines: 3,
        titleBandClass: 'assessment-snapshot-title-band assessment-snapshot-title-band--compact',
        countBandClass: 'assessment-snapshot-count-band assessment-snapshot-count-band--compact',
        cycleBandClass: 'assessment-snapshot-cycle-band assessment-snapshot-cycle-band--compact',
    },
    standard: {
        primaryTitleBandRem: 3.0,
        targetCountBandRem: 0.75,
        cycleAxisBandRem: 1.45,
        maxTitleLines: 3,
        titleBandClass: 'assessment-snapshot-title-band assessment-snapshot-title-band--standard',
        countBandClass: 'assessment-snapshot-count-band assessment-snapshot-count-band--standard',
        cycleBandClass: 'assessment-snapshot-cycle-band assessment-snapshot-cycle-band--standard',
    },
    dense: {
        primaryTitleBandRem: 2.55,
        targetCountBandRem: 0.6,
        cycleAxisBandRem: 1.2,
        maxTitleLines: 3,
        titleBandClass: 'assessment-snapshot-title-band assessment-snapshot-title-band--dense',
        countBandClass: 'assessment-snapshot-count-band assessment-snapshot-count-band--dense',
        cycleBandClass: 'assessment-snapshot-cycle-band assessment-snapshot-cycle-band--dense',
    },
};

export function resolveDomainZoneHeaderBands(tier: ThreadsLayoutTier): DomainZoneHeaderBands {
    return HEADER_BANDS[tier];
}

/** Offset from zone top to first target thread — identical for every sibling in a row. */
export function resolveThreadBodyStartOffsetRem(bands: DomainZoneHeaderBands): number {
    return bands.primaryTitleBandRem + bands.targetCountBandRem + bands.cycleAxisBandRem;
}

export interface ThreadConnectorGeometry {
    /** Width of the dedicated arrowhead slot after beads. */
    arrowSlotRem: number;
    /** Visible gap between arrowhead tip and max-ring edge. */
    arrowToMaxGapRem: number;
    /** Max-ring slot width including breathing room. */
    maxRingSlotRem: number;
    arrowWidthRem: number;
}

const ARROW_SLOT_REM: Record<ThreadsLayoutTier, number> = {
    compact: 0.85,
    standard: 0.85,
    dense: 0.75,
};

const MAX_RING_SLOT_REM: Record<ThreadsLayoutTier, number> = {
    compact: 1.35,
    standard: 1.35,
    dense: 1.25,
};

/** Minimum ~6px gap between arrow tip and max ring. */
export const ARROW_TO_MAX_GAP_REM = 0.375;

/**
 * Explicit arrow geometry: beads | arrow-slot | gap | max-ring.
 * Arrowhead lives in its own slot and never shares the max-ring inset.
 */
export function resolveThreadConnectorGeometry(
    tier: ThreadsLayoutTier,
    _cycleCount: number
): ThreadConnectorGeometry {
    return {
        arrowSlotRem: ARROW_SLOT_REM[tier],
        arrowToMaxGapRem: ARROW_TO_MAX_GAP_REM,
        maxRingSlotRem: MAX_RING_SLOT_REM[tier],
        arrowWidthRem: tier === 'dense' ? 0.7 : 0.8,
    };
}

/** Pure invariant: arrow tip to max-ring gap must stay positive across tiers. */
export function assertPositiveArrowToMaxGap(geometry: ThreadConnectorGeometry): boolean {
    return geometry.arrowToMaxGapRem >= 0.25 && geometry.arrowSlotRem > geometry.arrowWidthRem * 0.5;
}

/** Zone title field used by header bands (zoneTitle replaces domainTitle). */
export function zoneHeaderTitle(zone: Pick<ChildZonePlan, 'zoneTitle'>): string {
    return zone.zoneTitle;
}
