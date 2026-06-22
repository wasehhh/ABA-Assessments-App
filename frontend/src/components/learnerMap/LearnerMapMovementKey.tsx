import { MOVEMENT_MARKER_ENTRIES } from './movementDisplay';

export function LearnerMapMovementKey() {
    return (
        <section
            className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm"
            data-learner-map-export-movement-key
        >
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900">Movement</h2>
            <p className="mt-1 text-xs text-gray-600">
                L1 summarizes latest movement per target. Appendix score markers show movement
                compared with the prior cycle.
            </p>
            <ul className="mt-3 space-y-2">
                {MOVEMENT_MARKER_ENTRIES.map((entry) => (
                    <li key={entry.symbol} className="flex items-start gap-2 text-sm text-gray-800">
                        <span
                            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${entry.badgeClass}`}
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
