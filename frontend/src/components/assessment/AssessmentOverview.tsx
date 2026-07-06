
import { DomainProfile } from '../../services/domainProfile';
import { DomainProfileCard } from './domainProfile';
import { StructureLabels } from '../../types';
import { ArrowRight } from 'lucide-react';

interface Props {
    domainProfiles: DomainProfile[];
    structureLabels: StructureLabels;
    onSelectDomain: (domainId: string) => void;
}

export function AssessmentOverview({ domainProfiles, structureLabels, onSelectDomain }: Props) {
    const primaryLabel = structureLabels.primary_group;
    const targetLabel = structureLabels.target;

    return (
        <div className="animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
                {primaryLabel} Overview ({domainProfiles.length})
            </h2>
            <div className="flex flex-col gap-4">
                {domainProfiles.map((profile) => (
                    <button
                        key={profile.domainId}
                        type="button"
                        onClick={() => onSelectDomain(profile.domainId)}
                        className="group relative w-full text-left rounded-xl transition-all hover:ring-2 hover:ring-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <DomainProfileCard profile={profile} targetLabel={targetLabel} />
                        <ArrowRight className="absolute top-4 right-4 w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors pointer-events-none" />
                    </button>
                ))}
            </div>
        </div>
    );
}
