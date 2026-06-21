const MOVEMENT_ENTRIES = [
    { symbol: '↑', label: 'Up', description: 'Score increased from previous cycle' },
    { symbol: '↓', label: 'Down', description: 'Score decreased from previous cycle' },
    { symbol: '=', label: 'No Change', description: 'Score unchanged from previous cycle' },
    { symbol: '+', label: 'New / First', description: 'Newly scored this cycle' },
    { symbol: '–', label: 'No Movement', description: 'No prior-cycle comparison' },
] as const;

export function LearnerMapMovementKey() {
    return (
        <section className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900">Movement</h2>
            <p className="mt-1 text-xs text-gray-600">
                Markers shown beneath each scored cell when a prior cycle exists.
            </p>
            <ul className="mt-3 space-y-2">
                {MOVEMENT_ENTRIES.map((entry) => (
                    <li key={entry.symbol} className="flex items-start gap-2 text-sm text-gray-800">
                        <span
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-300 bg-gray-50 text-xs font-semibold text-gray-800"
                            aria-hidden
                        >
                            {entry.symbol}
                        </span>
                        <span>
                            <span className="font-medium">{entry.label}</span>
                            <span className="text-gray-500"> · {entry.description}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
