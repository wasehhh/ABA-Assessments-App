export type LearnerMapExportMode = 'standard' | 'full';

export const LEARNER_MAP_EXPORT_MODES: {
    id: LearnerMapExportMode;
    label: string;
    description: string;
}[] = [
    {
        id: 'standard',
        label: 'Standard',
        description: 'Header, rollup, legends, and domain competency summary only.',
    },
    {
        id: 'full',
        label: 'Full',
        description: 'Standard content plus appendix with cycle × target detail.',
    },
];
