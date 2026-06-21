import { STATE_BUCKET_DISPLAY } from '../assessment/domainProfile/stateDisplay';

export function LearnerMapScoreBandsCard() {
    return (
        <section className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900">Score bands</h2>
            <p className="mt-1 text-xs text-gray-600">
                Canonical Evalis competency states used across the Learner Map.
            </p>
            <ul className="mt-3 space-y-2">
                {STATE_BUCKET_DISPLAY.map((bucket) => (
                    <li key={bucket.key} className="flex items-center gap-2 text-sm text-gray-800">
                        <span
                            className={`inline-flex h-5 w-5 shrink-0 rounded border ${bucket.legendClass}`}
                            aria-hidden
                        />
                        <span className="font-medium">{bucket.label}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
