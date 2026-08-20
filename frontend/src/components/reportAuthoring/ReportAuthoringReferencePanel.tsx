import { ReportProfile } from '../../services/reportProfile';
import { ReportAssessmentScoreDistribution } from '../report/ReportAssessmentScoreDistribution';
import { ReportDomainSummaryTable } from '../report/ReportDomainSummaryTable';

interface Props {
    reportProfile: ReportProfile;
}

export function ReportAuthoringReferencePanel({ reportProfile }: Props) {
    return (
        <aside
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 lg:sticky lg:top-4"
            data-report-authoring-reference-panel
        >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                Reference data (live)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Computed from the frozen pack snapshot and current cycle scores. This panel is for
                your reference while writing — it is not saved into the report document.
            </p>

            <div className="mt-4 space-y-4">
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Assessment score distribution
                    </h3>
                    <div className="mt-2">
                        <ReportAssessmentScoreDistribution
                            distribution={reportProfile.assessmentBandDistribution}
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {reportProfile.structureLabels.primary_group} summary
                    </h3>
                    <div className="mt-2">
                        <ReportDomainSummaryTable
                            domains={reportProfile.domains}
                            structureLabels={reportProfile.structureLabels}
                        />
                    </div>
                </div>
            </div>
        </aside>
    );
}
