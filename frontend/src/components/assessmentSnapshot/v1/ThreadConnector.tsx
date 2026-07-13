interface Props {
    geometry: {
        arrowSlotRem: number;
        arrowWidthRem: number;
    };
}

/** Quiet filled chevron — scale direction toward maximum only. */
export function ThreadConnector({ geometry }: Props) {
    return (
        <div
            className="pointer-events-none relative z-[5] flex shrink-0 items-center justify-center"
            style={{ width: `${geometry.arrowSlotRem}rem` }}
            data-assessment-snapshot-thread-connector
            data-arrow-slot-rem={geometry.arrowSlotRem}
            aria-hidden
        >
            <svg
                className="shrink-0 text-gray-400"
                style={{
                    width: `${geometry.arrowWidthRem * 0.85}rem`,
                    height: `${geometry.arrowWidthRem * 0.75}rem`,
                }}
                viewBox="0 0 10 8"
                fill="currentColor"
                aria-hidden
            >
                <path d="M0 3.1h5.6V1.4L10 4 5.6 6.6V4.9H0V3.1z" />
            </svg>
        </div>
    );
}

/** Hairline progression under bead slots. */
export function ThreadProgressionLine() {
    return (
        <div
            className="pointer-events-none absolute inset-y-0 left-0 right-0 z-[1] flex items-center"
            data-assessment-snapshot-thread-line
            aria-hidden
        >
            <div className="h-px w-full bg-gray-300" />
        </div>
    );
}
