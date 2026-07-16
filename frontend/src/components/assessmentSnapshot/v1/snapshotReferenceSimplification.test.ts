import { describe, expect, it } from 'vitest';
import { buildAssessmentSnapshotProfile } from '../../../services/assessmentSnapshotProfile';
import {
    buildSnapshotRenderPlan,
    flattenRenderPlanTargetIds,
} from '../../../utils/snapshotLayoutEngine';
import { getAssessmentSnapshotStressScenario } from '../../../pages/dev/assessmentSnapshotMockData';
import { resolveThreadLabelDisplay } from './snapshotThreadDisplay';
import {
    buildSnapshotCycleReferenceEntries,
} from './snapshotCycleReference';
import { shouldShowThreadSubtitle } from './snapshotVisualSystem';

describe('snapshot reference simplification (PR13.5A)', () => {
    it('never shows thread subtitles on screen or print', () => {
        expect(shouldShowThreadSubtitle('screen', 'A1', 'Take a reinforcer', 8)).toBe(false);
        expect(shouldShowThreadSubtitle('print', 'A1', 'Take a reinforcer', 8)).toBe(false);
    });

    it('keeps flat/grouped topology and all targets after label simplification', () => {
        const flat = getAssessmentSnapshotStressScenario('alpha-small');
        const grouped = getAssessmentSnapshotStressScenario('vb-mapp-like');
        const flatProfile = buildAssessmentSnapshotProfile(flat.profile);
        const groupedProfile = buildAssessmentSnapshotProfile(grouped.profile);

        const flatPlan = buildSnapshotRenderPlan(flatProfile, { mode: 'screen' });
        const groupedPlan = buildSnapshotRenderPlan(groupedProfile, { mode: 'screen' });

        expect(flatPlan.topology).toBe('flat');
        expect(groupedPlan.topology).toBe('grouped');
        expect(flattenRenderPlanTargetIds(flatPlan)).toHaveLength(
            flatProfile.domains.reduce((sum, domain) => sum + domain.targets.length, 0)
        );
        expect(flattenRenderPlanTargetIds(groupedPlan)).toHaveLength(
            groupedProfile.domains.reduce((sum, domain) => sum + domain.targets.length, 0)
        );
        expect(groupedPlan.chapters.every((chapter) => chapter.chapterKind === 'grouped')).toBe(
            true
        );
    });

    it('builds unique visible codes across Alpha Small peers', () => {
        const scenario = getAssessmentSnapshotStressScenario('alpha-small');
        const domain = scenario.profile.domains[0];
        const codes = domain.targets.map((target, index) =>
            resolveThreadLabelDisplay(target, index, 'screen').visibleCode
        );
        expect(new Set(codes).size).toBe(codes.length);
        expect(codes.every((code) => !code.includes(' '))).toBe(true);
    });

    it('lists every cycle once in Cycle Reference using shared labels', () => {
        const scenario = getAssessmentSnapshotStressScenario('vb-mapp-like');
        const entries = buildSnapshotCycleReferenceEntries(
            scenario.profile.cycles,
            scenario.cycleDateLabels
        );

        expect(entries).toHaveLength(scenario.profile.cycles.length);
        expect(entries.map((entry) => entry.cycleNumber)).toEqual(
            scenario.profile.cycles.map((cycle) => cycle.cycleNumber)
        );
        expect(new Set(entries.map((entry) => entry.cycleId)).size).toBe(entries.length);
        for (const entry of entries) {
            expect(entry.label.startsWith(`C${entry.cycleNumber} — `)).toBe(true);
            expect(entry.label).not.toMatch(/^C\d+$/);
        }
    });

    it('does not mutate the learner-map profile when projecting Snapshot references', () => {
        const scenario = getAssessmentSnapshotStressScenario('alpha-small');
        const frozen = JSON.stringify(scenario.profile);
        buildAssessmentSnapshotProfile(scenario.profile);
        buildSnapshotCycleReferenceEntries(scenario.profile.cycles, scenario.cycleDateLabels);
        expect(JSON.stringify(scenario.profile)).toBe(frozen);
    });
});
