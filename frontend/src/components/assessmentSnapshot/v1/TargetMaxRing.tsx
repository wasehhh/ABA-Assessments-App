import {
    maxRingAccessibleLabel,
    maxRingSurfaceClass,
} from './snapshotVisualSystem';

interface Props {
    maxDisplay: string;
    targetTitle: string;
    targetId: string;
    sizeClass: string;
}

export function TargetMaxRing({ maxDisplay, targetTitle, targetId, sizeClass }: Props) {
    const title = maxRingAccessibleLabel(targetTitle, maxDisplay);

    return (
        <div
            className={`relative z-10 flex shrink-0 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-green-800 focus-visible:ring-offset-1 ${maxRingSurfaceClass()} ${sizeClass}`}
            data-assessment-snapshot-target-max-ring
            data-target-id={targetId}
            data-target-max={maxDisplay}
            title={title}
            aria-label={title}
            tabIndex={0}
            role="img"
        >
            {maxDisplay}
        </div>
    );
}
