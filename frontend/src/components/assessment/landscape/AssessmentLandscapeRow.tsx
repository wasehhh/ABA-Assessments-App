import { ChevronRight } from 'lucide-react';
import { DomainProfile } from '../../../services/domainProfile';
import { DomainStateDistribution } from '../domainProfile/DomainStateDistribution';

interface Props {
    profile: DomainProfile;
    onSelectDomain?: (domainId: string) => void;
}

function coveragePercent(scored: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((scored / total) * 100);
}

export function AssessmentLandscapeRow({ profile, onSelectDomain }: Props) {
    const { scored, total } = profile.coverage;
    const percent = coveragePercent(scored, total);
    const isClickable = onSelectDomain != null;

    const content = (
        <>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900">{profile.title}</h3>
                    <p className="mt-0.5 text-sm text-gray-600 tabular-nums">
                        {scored} of {total} targets scored ({percent}%)
                    </p>
                </div>
                {isClickable && (
                    <ChevronRight
                        className="mt-1 h-4 w-4 shrink-0 text-gray-300"
                        aria-hidden
                    />
                )}
            </div>
            <div className="mt-3">
                <DomainStateDistribution
                    distribution={profile.stateDistribution}
                    variant="compact"
                />
            </div>
        </>
    );

    if (!isClickable) {
        return (
            <div className="border-b border-gray-200 px-4 py-4 last:border-b-0">
                {content}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => onSelectDomain(profile.domainId)}
            className="group w-full border-b border-gray-200 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
        >
            <div className="[&_h3]:group-hover:text-emerald-700 [&_svg]:group-hover:text-emerald-500">
                {content}
            </div>
        </button>
    );
}
