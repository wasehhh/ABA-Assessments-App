export interface CycleDateSource {
    id: string;
    start_date?: string | null;
    end_date?: string | null;
    created_at?: string | null;
}

export function resolveCycleAnchorIso(cycle: CycleDateSource): string | null {
    const candidate = cycle.end_date ?? cycle.start_date ?? cycle.created_at ?? null;
    if (!candidate) {
        return null;
    }

    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return candidate;
}

export function formatCycleAnchorLabel(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
    });
}

export function buildCycleDateLabels(cycles: CycleDateSource[]): Record<string, string> {
    const labels: Record<string, string> = {};

    for (const cycle of cycles) {
        const anchor = resolveCycleAnchorIso(cycle);
        if (anchor) {
            labels[cycle.id] = formatCycleAnchorLabel(anchor);
        }
    }

    return labels;
}
