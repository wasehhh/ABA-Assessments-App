import { assessmentService } from './assessments';
import { orgService } from './orgs';
import {
    buildLearnerMapProfile,
    LearnerMapCycleInput,
    LearnerMapProfile,
} from './learnerMapProfile';
import { buildProductionDisplayContext, LearnerMapDisplayContext } from '../components/learnerMap/learnerMapDisplayContext';

export interface LearnerMapProductionData {
    assessment: Awaited<ReturnType<typeof assessmentService.getById>>;
    cycles: Awaited<ReturnType<typeof assessmentService.getCycles>>;
    profile: LearnerMapProfile;
    displayContext: LearnerMapDisplayContext;
}

export async function loadLearnerMapProductionData(
    assessmentId: string,
    orgId?: string | null
): Promise<LearnerMapProductionData> {
    const [assessment, cycles] = await Promise.all([
        assessmentService.getById(assessmentId),
        assessmentService.getCycles(assessmentId),
    ]);

    if (!assessment) {
        throw new Error('Assessment not found');
    }

    const sortedCycles = [...cycles].sort(
        (left, right) => left.cycle_number - right.cycle_number
    );

    const cycleInputs: LearnerMapCycleInput[] = await Promise.all(
        sortedCycles.map(async (cycle) => ({
            cycle: {
                id: cycle.id,
                cycle_number: cycle.cycle_number,
                status: cycle.status,
            },
            scores: await assessmentService.getScores(assessmentId, cycle.id),
        }))
    );

    const profile = buildLearnerMapProfile({
        assessment: {
            id: assessment.id,
            pack_snapshot: assessment.pack_snapshot,
        },
        cycles: cycleInputs,
    });

    let organizationName = '—';
    if (orgId) {
        try {
            const organization = await orgService.getById(orgId);
            organizationName = organization.name;
        } catch {
            organizationName = '—';
        }
    }

    const displayContext = buildProductionDisplayContext(assessment, organizationName);

    return {
        assessment,
        cycles: sortedCycles,
        profile,
        displayContext,
    };
}
