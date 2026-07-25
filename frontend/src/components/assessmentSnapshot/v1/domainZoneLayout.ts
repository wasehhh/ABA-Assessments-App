import { ChildZonePlan, SnapshotLayoutMode } from '../../../utils/snapshotLayoutEngine';
import { SNAPSHOT_PRINT_ARROW_TO_MAX_GAP_REM } from './snapshotPrintDensity';
import { ThreadsLayoutTier } from './threadsLayout';

/**
 * Fixed header bands by layout tier — deterministic CSS grid rows so sibling
 * zones in one packing row share equal baselines without title-length estimation.
 * Title → count → cycle axis → body. Overflow is clipped per band to prevent collisions.
 */
export interface DomainZoneHeaderBands {
    primaryTitleBandRem: number;
    targetCountBandRem: number;
    cycleAxisBandRem: number;
    maxTitleLines: number;
    titleBandClass: string;
    countBandClass: string;
    cycleBandClass: string;
}

const HEADER_BANDS: Record<ThreadsLayoutTier, DomainZoneHeaderBands> = {
    compact: {
        primaryTitleBandRem: 2.7,
        targetCountBandRem: 0.85,
        cycleAxisBandRem: 1.05,
        maxTitleLines: 3,
        titleBandClass: 'assessment-snapshot-title-band assessment-snapshot-title-band--compact',
        countBandClass: 'assessment-snapshot-count-band assessment-snapshot-count-band--compact',
        cycleBandClass: 'assessment-snapshot-cycle-band assessment-snapshot-cycle-band--compact',
    },
    standard: {
        primaryTitleBandRem: 2.85,
        targetCountBandRem: 0.9,
        cycleAxisBandRem: 1.1,
        maxTitleLines: 3,
        titleBandClass: 'assessment-snapshot-title-band assessment-snapshot-title-band--standard',
        countBandClass: 'assessment-snapshot-count-band assessment-snapshot-count-band--standard',
        cycleBandClass: 'assessment-snapshot-cycle-band assessment-snapshot-cycle-band--standard',
    },
    dense: {
        primaryTitleBandRem: 2.45,
        targetCountBandRem: 0.75,
        cycleAxisBandRem: 0.95,
        maxTitleLines: 3,
        titleBandClass: 'assessment-snapshot-title-band assessment-snapshot-title-band--dense',
        countBandClass: 'assessment-snapshot-count-band assessment-snapshot-count-band--dense',
        cycleBandClass: 'assessment-snapshot-cycle-band assessment-snapshot-cycle-band--dense',
    },
};

export function resolveDomainZoneHeaderBands(tier: ThreadsLayoutTier): DomainZoneHeaderBands {
    return HEADER_BANDS[tier];
}

export function resolveThreadBodyStartOffsetRem(bands: DomainZoneHeaderBands): number {
    return bands.primaryTitleBandRem + bands.targetCountBandRem + bands.cycleAxisBandRem;
}

export interface ThreadConnectorGeometry {
    arrowSlotRem: number;
    arrowToMaxGapRem: number;
    maxRingSlotRem: number;
    arrowWidthRem: number;
}

const ARROW_SLOT_REM: Record<ThreadsLayoutTier, number> = {
    compact: 0.8,
    standard: 0.8,
    dense: 0.7,
};

const MAX_RING_SLOT_REM: Record<ThreadsLayoutTier, number> = {
    compact: 1.3,
    standard: 1.3,
    dense: 1.2,
};

export const ARROW_TO_MAX_GAP_REM = 0.375;

export function resolveThreadConnectorGeometry(
    tier: ThreadsLayoutTier,
    _cycleCount: number,
    mode: SnapshotLayoutMode = 'screen'
): ThreadConnectorGeometry {
    return {
        arrowSlotRem: ARROW_SLOT_REM[tier],
        arrowToMaxGapRem:
            mode === 'print' ? SNAPSHOT_PRINT_ARROW_TO_MAX_GAP_REM : ARROW_TO_MAX_GAP_REM,
        maxRingSlotRem: MAX_RING_SLOT_REM[tier],
        arrowWidthRem: tier === 'dense' ? 0.65 : 0.75,
    };
}

export function assertPositiveArrowToMaxGap(geometry: ThreadConnectorGeometry): boolean {
    return geometry.arrowToMaxGapRem >= 0.25 && geometry.arrowSlotRem > geometry.arrowWidthRem * 0.5;
}

export function zoneHeaderTitle(zone: Pick<ChildZonePlan, 'zoneTitle'>): string {
    return zone.zoneTitle;
}
