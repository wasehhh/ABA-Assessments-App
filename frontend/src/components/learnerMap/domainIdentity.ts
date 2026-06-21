export interface DomainIdentity {
    id: string;
    borderClass: string;
    accentTextClass: string;
    headerBgClass: string;
    markerClass: string;
}

const DOMAIN_IDENTITY_PALETTE: DomainIdentity[] = [
    {
        id: 'purple',
        borderClass: 'border-l-purple-600',
        accentTextClass: 'text-purple-900',
        headerBgClass: 'bg-purple-50',
        markerClass: 'bg-purple-600',
    },
    {
        id: 'blue',
        borderClass: 'border-l-blue-600',
        accentTextClass: 'text-blue-900',
        headerBgClass: 'bg-blue-50',
        markerClass: 'bg-blue-600',
    },
    {
        id: 'green',
        borderClass: 'border-l-green-600',
        accentTextClass: 'text-green-900',
        headerBgClass: 'bg-green-50',
        markerClass: 'bg-green-600',
    },
    {
        id: 'orange',
        borderClass: 'border-l-orange-600',
        accentTextClass: 'text-orange-900',
        headerBgClass: 'bg-orange-50',
        markerClass: 'bg-orange-600',
    },
    {
        id: 'teal',
        borderClass: 'border-l-teal-600',
        accentTextClass: 'text-teal-900',
        headerBgClass: 'bg-teal-50',
        markerClass: 'bg-teal-600',
    },
    {
        id: 'indigo',
        borderClass: 'border-l-indigo-600',
        accentTextClass: 'text-indigo-900',
        headerBgClass: 'bg-indigo-50',
        markerClass: 'bg-indigo-600',
    },
];

export function getDomainIdentity(domainIndex: number): DomainIdentity {
    return DOMAIN_IDENTITY_PALETTE[domainIndex % DOMAIN_IDENTITY_PALETTE.length];
}
