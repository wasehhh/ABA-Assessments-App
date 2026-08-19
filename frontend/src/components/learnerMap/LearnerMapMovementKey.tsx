import { MOVEMENT_MARKER_ENTRIES } from './movementDisplay';

const GRID_MOVEMENT_LEGEND_ENTRIES = MOVEMENT_MARKER_ENTRIES.filter(
    (entry) => entry.key !== 'none'
);

const NONE_GRID_LEGEND = MOVEMENT_MARKER_ENTRIES.find((entry) => entry.key === 'none')!;

export function LearnerMapMovementKey() {
    return (
        <section
            className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm"
            data-learner-map-export-movement-key
        >
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900">Movement</h2>
            <p className="mt-1 text-xs text-gray-600">
                L1 summarizes latest movement per target. Grid markers show movement compared with
                the prior cycle.
            </p>
            <ul className="mt-3 space-y-2">
                {GRID_MOVEMENT_LEGEND_ENTRIES.map((entry) => (
                    <li key={entry.key} className="flex items-start gap-2 text-sm text-gray-800">
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
                <li className="flex items-start gap-2 text-sm text-gray-800">
                    <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-dashed ${NONE_GRID_LEGEND.badgeClass}`}
                        aria-hidden
                    />
                    <span>
                        <span className="font-medium">{NONE_GRID_LEGEND.label}</span>
                        <span className="text-gray-500">
                            {' '}
                            · No marker in the cell — {NONE_GRID_LEGEND.description.toLowerCase()}
                        </span>
                    </span>
                </li>
            </ul>
        </section>
    );
}
