interface Props {
    insetRightClass: string;
}

export function ThreadConnector({ insetRightClass }: Props) {
    return (
        <div
            className={`pointer-events-none absolute left-0 top-1/2 z-[1] flex -translate-y-1/2 items-center ${insetRightClass}`}
            data-assessment-snapshot-thread-connector
            aria-hidden
        >
            <div className="h-[1.5px] flex-1 rounded-full bg-gray-400" />
            <svg
                className="ml-0.5 h-2.5 w-2.5 shrink-0 text-gray-500"
                viewBox="0 0 8 8"
                fill="none"
                aria-hidden
            >
                <path
                    d="M1 4H6M6 4L4 1.5M6 4L4 6.5"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}
