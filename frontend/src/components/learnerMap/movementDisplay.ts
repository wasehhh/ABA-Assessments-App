import { LearnerMapMovement } from '../../services/learnerMapProfile';

export interface MovementMarkerDisplay {
    key: LearnerMapMovement | 'none';
    symbol: string;
    label: string;
    description: string;
    markerClass: string;
    badgeClass: string;
}

export const MOVEMENT_MARKER_ENTRIES: MovementMarkerDisplay[] = [
    {
        key: 'up',
        symbol: '↑',
        label: 'Improved',
        description: 'Score increased compared with the prior comparable score',
        markerClass: 'text-green-700',
        badgeClass: 'border-green-300 bg-green-50 text-green-800',
    },
    {
        key: 'down',
        symbol: '↓',
        label: 'Regressed',
        description: 'Score decreased compared with the prior comparable score',
        markerClass: 'text-red-600',
        badgeClass: 'border-red-300 bg-red-50 text-red-800',
    },
    {
        key: 'flat',
        symbol: '=',
        label: 'No Change',
        description: 'Score stayed the same compared with the prior comparable score',
        markerClass: 'text-slate-600',
        badgeClass: 'border-slate-300 bg-slate-100 text-slate-700',
    },
    {
        key: 'new',
        symbol: '+',
        label: 'Newly Scored',
        description: 'Target was scored after no prior scored value',
        markerClass: 'text-blue-700',
        badgeClass: 'border-blue-300 bg-blue-50 text-blue-800',
    },
    {
        key: 'none',
        symbol: '–',
        label: 'Not Compared',
        description: 'No valid prior comparison is available',
        markerClass: 'text-gray-500',
        badgeClass: 'border-gray-300 bg-gray-50 text-gray-600',
    },
];

const MOVEMENT_BY_KEY = Object.fromEntries(
    MOVEMENT_MARKER_ENTRIES.map((entry) => [entry.key, entry])
) as Record<LearnerMapMovement | 'none', MovementMarkerDisplay>;

export function movementMarkerDisplay(
    movement: LearnerMapMovement | 'none'
): MovementMarkerDisplay {
    return MOVEMENT_BY_KEY[movement] ?? MOVEMENT_BY_KEY.none;
}

export function movementMarkerSymbol(movement: LearnerMapMovement): string {
    switch (movement) {
        case 'up':
            return '↑';
        case 'down':
            return '↓';
        case 'flat':
            return '=';
        case 'new':
            return '+';
        default:
            return '';
    }
}
