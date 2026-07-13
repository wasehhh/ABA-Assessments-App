import { AssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import { RenderPlan } from '../../../utils/snapshotLayoutEngine';
import { DomainColumn } from './DomainColumn';
import { buildTargetByIdMap } from './snapshotRenderHelpers';
import { resolveThreadsLayoutFromPlan } from './threadsLayout';

export interface AssessmentSnapshotTargetThreadsProps {
    profile: AssessmentSnapshotProfile;
    renderPlan: RenderPlan;
    cycleDateLabels?: Record<string, string>;
}

export function AssessmentSnapshotTargetThreads({
    profile,
    renderPlan,
    cycleDateLabels,
}: AssessmentSnapshotTargetThreadsProps) {
    const layout = resolveThreadsLayoutFromPlan(renderPlan);
    const targetsById = buildTargetByIdMap(profile);
    const cycles = profile.cycles;

    return (
        <div
            data-assessment-snapshot
            data-assessment-snapshot-v1="target-threads"
            data-assessment-snapshot-layout-tier={layout.tier}
            data-assessment-snapshot-layout-mode={renderPlan.mode}
        >
            <div
                className="assessment-snapshot-domain-grid space-y-4"
                data-assessment-snapshot-domain-grid
            >
                {renderPlan.rows.map((row) => (
                    <div
                        key={`row-${row.rowIndex}`}
                        className="flex items-start"
                        style={{ columnGap: `${renderPlan.domainGapRem}rem` }}
                        data-assessment-snapshot-domain-row
                        data-row-index={row.rowIndex}
                    >
                        {row.zones.map((zone) => (
                            <DomainColumn
                                key={zone.domainId}
                                zone={zone}
                                cycles={cycles}
                                targetsById={targetsById}
                                cycleDateLabels={cycleDateLabels}
                                layout={layout}
                                structureLabels={profile.structureLabels}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
