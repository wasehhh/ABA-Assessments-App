import { LearnerMapCycleSummary, LearnerMapProfile } from '../../../services/learnerMapProfile';
import { LearnerMapArtifactHeader } from '../LearnerMapArtifactHeader';
import { LearnerMapAssessmentRollup } from '../LearnerMapAssessmentRollup';
import { LearnerMapDomainSummary } from '../LearnerMapDomainSummary';
import { LearnerMapDisplayContext } from '../learnerMapDisplayContext';
import { LearnerMapMovementKey } from '../LearnerMapMovementKey';
import { LearnerMapScoreBandsCard } from '../LearnerMapScoreBandsCard';
import { LearnerMapAppendixSection } from './LearnerMapAppendixSection';
import {
    buildDomainIndexById,
    LearnerMapExportMode,
    LEARNER_MAP_EXPORT_MODES,
    resolveAppendixDomains,
} from './learnerMapExportMode';

interface Props {
    profile: LearnerMapProfile;
    mode: LearnerMapExportMode;
    displayContext?: LearnerMapDisplayContext;
    selectedDomainIds?: string[];
}

function formatCycleRange(cycles: LearnerMapCycleSummary[]): string {
    if (cycles.length === 0) {
        return 'No cycles represented';
    }

    const cycleNumbers = cycles.map((cycle) => cycle.cycleNumber);
    const min = Math.min(...cycleNumbers);
    const max = Math.max(...cycleNumbers);

    if (min === max) {
        return `Cycle ${min}`;
    }

    return `Cycles ${min}–${max}`;
}

export function LearnerMapExportView({
    profile,
    mode,
    displayContext,
    selectedDomainIds,
}: Props) {
    const { metadata, cycles, domains } = profile;
    const generatedAt = new Date(metadata.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const cycleRangeLabel = formatCycleRange(cycles);
    const appendixDomains = resolveAppendixDomains(domains, mode, selectedDomainIds);
    const showAppendix =
        (mode === 'full' || mode === 'selected-domains') &&
        cycles.length > 0 &&
        appendixDomains.length > 0;
    const modeLabel =
        LEARNER_MAP_EXPORT_MODES.find((entry) => entry.id === mode)?.label ?? mode;
    const domainIndexById = buildDomainIndexById(domains);

    const appendixTitle =
        mode === 'selected-domains'
            ? 'Appendix — Selected Domain Detail'
            : 'Appendix — Cycle × Target Detail';

    const appendixDescription =
        mode === 'selected-domains'
            ? 'This appendix contains target-level longitudinal assessment detail for selected domains.'
            : 'This appendix contains target-level longitudinal assessment detail by domain.';

    return (
        <div
            className="learner-map-export-root bg-white text-gray-900"
            data-learner-map-export-root
            data-export-mode={mode}
        >
            <article
                className="learner-map-export-document mx-auto max-w-6xl space-y-8 px-6 py-8"
                data-learner-map-export-document
            >
                <div data-learner-map-export-header-group>
                    <LearnerMapArtifactHeader
                        profile={profile}
                        cycleRangeLabel={cycleRangeLabel}
                        generatedAtLabel={generatedAt}
                        displayContext={displayContext}
                    />
                </div>

                <div data-learner-map-export-rollup>
                    <LearnerMapAssessmentRollup totals={profile.totals} domains={domains} />
                </div>

                <div
                    className="grid gap-4 md:grid-cols-2"
                    data-learner-map-export-legends
                >
                    <LearnerMapScoreBandsCard />
                    <LearnerMapMovementKey />
                </div>

                <section
                    className="space-y-4 rounded-lg border border-gray-300 bg-white px-4 py-5 shadow-sm"
                    data-learner-map-export-l1
                >
                    <div className="border-b border-gray-200 pb-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                            Primary supervision layer
                        </p>
                        <h2 className="mt-1 text-lg font-bold tracking-tight text-gray-900">
                            Domain competency summary
                        </h2>
                        <p className="mt-1 max-w-3xl text-sm text-gray-600">
                            Domain coverage, score distribution, and movement across all cycles in
                            this record.
                        </p>
                    </div>
                    <LearnerMapDomainSummary domains={domains} />
                </section>

                {showAppendix ? (
                    <section
                        className="space-y-8 border-t border-gray-300 pt-8"
                        data-learner-map-export-appendix
                    >
                        <div data-learner-map-export-appendix-intro>
                            <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">
                                {appendixTitle}
                            </h2>
                            <p className="mt-1 max-w-3xl text-sm text-gray-600">
                                {appendixDescription}
                            </p>
                        </div>
                        <LearnerMapAppendixSection
                            domains={appendixDomains}
                            cycles={cycles}
                            domainIndexById={domainIndexById}
                        />
                    </section>
                ) : null}

                <footer
                    className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500"
                    data-learner-map-export-footer
                >
                    <p className="font-medium text-gray-700">Generated by Evalis</p>
                    <p className="mt-0.5">Learner Map Export · {modeLabel} Mode</p>
                    <p className="mt-0.5 tabular-nums text-gray-600">{generatedAt}</p>
                </footer>
            </article>
        </div>
    );
}
