import { AssessmentScore, ContentPackData, Target } from '../types';
import { CompetencyState, interpretTargetScore } from './scoreInterpretation';

export const REPORT_COMPARISON_METHOD = 'per_target_last_and_first_scored' as const;

export type ReportPresentLevelsMode =
    | 'first_assessment'
    | 'single_comparison'
    | 'dual_comparison';

export type ReportComparisonLineRole = 'last_assessed' | 'first_assessed';

export type TransitionBucket =
    | 'improved'
    | 'regressed'
    | 'newly_assessed'
    | 'no_longer_scored'
    | 'stable'
    | 'still_unscored';

export interface ReportPriorCycleInput {
    cycle_id: string;
    cycle_number: number;
    start_date: string | null;
    end_date: string | null;
    scores: AssessmentScore[];
}

export interface ReportPresentLevelsChangeInput {
    packSnapshot: ContentPackData;
    reportCycle: {
        cycle_id: string;
        cycle_number: number;
        start_date: string | null;
        end_date: string | null;
    };
    scores: AssessmentScore[];
    priorCycles: ReportPriorCycleInput[];
}

export interface ReportAnchorSpan {
    earliest_cycle_number: number | null;
    latest_cycle_number: number | null;
    earliest_date: string | null;
    latest_date: string | null;
    available: boolean;
}

export interface ReportComparisonLine {
    role: ReportComparisonLineRole;
    label_key: 'since_last_assessed' | 'since_first_assessed';
    anchor_span: ReportAnchorSpan;
    anchors_by_cycle_number: Record<string, number>;
    skills_improved: number;
    skills_regressed: number;
    newly_assessed: number;
    no_longer_scored: number;
}

export interface ReportFirstAssessmentCounts {
    demonstrated: number;
    emerging: number;
    not_demonstrated: number;
    unscored: number;
}

export interface ReportPresentLevelsChangeResult {
    mode: ReportPresentLevelsMode;
    comparison_method: typeof REPORT_COMPARISON_METHOD;
    first_assessment: {
        statement_key: 'first_assessment';
        counts: ReportFirstAssessmentCounts;
    } | null;
    comparisons: ReportComparisonLine[];
}

export interface ResolvedScoredAnchor {
    cycle_id: string;
    cycle_number: number;
    start_date: string | null;
    end_date: string | null;
    state: CompetencyState;
}

export interface TargetAnchorResolution {
    targetId: string;
    to: CompetencyState;
    lastScored: ResolvedScoredAnchor | null;
    firstScored: ResolvedScoredAnchor | null;
}

const SCORED_LADDER: Record<'not_yet' | 'in_progress' | 'at_maximum', number> = {
    not_yet: 0,
    in_progress: 1,
    at_maximum: 2,
};

export function isScoredCompetencyState(state: CompetencyState): boolean {
    return state === 'not_yet' || state === 'in_progress' || state === 'at_maximum';
}

export function classifyCompetencyTransition(
    from: CompetencyState,
    to: CompetencyState
): TransitionBucket {
    const fromScored = isScoredCompetencyState(from);
    const toScored = isScoredCompetencyState(to);

    if (!fromScored && !toScored) {
        return 'still_unscored';
    }
    if (!fromScored && toScored) {
        return 'newly_assessed';
    }
    if (fromScored && !toScored) {
        return 'no_longer_scored';
    }
    if (from === to) {
        return 'stable';
    }
    if (SCORED_LADDER[from] < SCORED_LADDER[to]) {
        return 'improved';
    }
    return 'regressed';
}

function packTargets(pack: ContentPackData): Target[] {
    return pack.domains.flatMap((domain) => domain.targets);
}

function scoreRowForTarget(
    scores: AssessmentScore[],
    targetId: string
): AssessmentScore | null {
    for (let index = scores.length - 1; index >= 0; index -= 1) {
        if (scores[index].target_id === targetId) {
            return scores[index];
        }
    }
    return null;
}

function stateForTarget(
    target: Target,
    scores: AssessmentScore[],
    pack: ContentPackData
): CompetencyState {
    return interpretTargetScore(target, scoreRowForTarget(scores, target.target_id), pack)
        .competencyState;
}

function sortPriorsByCycleNumber(priorCycles: ReportPriorCycleInput[]): ReportPriorCycleInput[] {
    return [...priorCycles].sort((left, right) => left.cycle_number - right.cycle_number);
}

function usablePriors(
    priorCycles: ReportPriorCycleInput[],
    reportCycleNumber: number
): ReportPriorCycleInput[] {
    return sortPriorsByCycleNumber(priorCycles).filter(
        (cycle) => cycle.cycle_number < reportCycleNumber
    );
}

function cycleDateForSpan(cycle: {
    start_date: string | null;
    end_date: string | null;
}): string | null {
    return cycle.start_date ?? cycle.end_date ?? null;
}

function emptyTransitionCounts(): Pick<
    ReportComparisonLine,
    'skills_improved' | 'skills_regressed' | 'newly_assessed' | 'no_longer_scored'
> {
    return {
        skills_improved: 0,
        skills_regressed: 0,
        newly_assessed: 0,
        no_longer_scored: 0,
    };
}

function applyBucket(
    counts: ReturnType<typeof emptyTransitionCounts>,
    bucket: TransitionBucket
): void {
    if (bucket === 'improved') {
        counts.skills_improved += 1;
    } else if (bucket === 'regressed') {
        counts.skills_regressed += 1;
    } else if (bucket === 'newly_assessed') {
        counts.newly_assessed += 1;
    } else if (bucket === 'no_longer_scored') {
        counts.no_longer_scored += 1;
    }
}

function incrementHistogram(
    histogram: Record<string, number>,
    cycleNumber: number
): void {
    const key = String(cycleNumber);
    histogram[key] = (histogram[key] ?? 0) + 1;
}

function buildAnchorSpan(
    anchors: Array<{ cycle_number: number; start_date: string | null; end_date: string | null }>
): ReportAnchorSpan {
    if (anchors.length === 0) {
        return {
            earliest_cycle_number: null,
            latest_cycle_number: null,
            earliest_date: null,
            latest_date: null,
            available: false,
        };
    }

    let earliest = anchors[0];
    let latest = anchors[0];
    for (const anchor of anchors) {
        if (anchor.cycle_number < earliest.cycle_number) {
            earliest = anchor;
        }
        if (anchor.cycle_number > latest.cycle_number) {
            latest = anchor;
        }
    }

    return {
        earliest_cycle_number: earliest.cycle_number,
        latest_cycle_number: latest.cycle_number,
        earliest_date: cycleDateForSpan(earliest),
        latest_date: cycleDateForSpan(latest),
        available: true,
    };
}

export function resolveTargetAnchors(
    target: Target,
    input: {
        packSnapshot: ContentPackData;
        reportCycle: ReportPresentLevelsChangeInput['reportCycle'];
        scores: AssessmentScore[];
        priorCycles: ReportPriorCycleInput[];
    }
): TargetAnchorResolution {
    const priors = usablePriors(input.priorCycles, input.reportCycle.cycle_number);
    const to = stateForTarget(target, input.scores, input.packSnapshot);

    let lastScored: ResolvedScoredAnchor | null = null;
    for (const cycle of priors) {
        const state = stateForTarget(target, cycle.scores, input.packSnapshot);
        if (isScoredCompetencyState(state)) {
            lastScored = {
                cycle_id: cycle.cycle_id,
                cycle_number: cycle.cycle_number,
                start_date: cycle.start_date,
                end_date: cycle.end_date,
                state,
            };
        }
    }

    let firstScored: ResolvedScoredAnchor | null = null;
    for (const cycle of priors) {
        const state = stateForTarget(target, cycle.scores, input.packSnapshot);
        if (isScoredCompetencyState(state)) {
            firstScored = {
                cycle_id: cycle.cycle_id,
                cycle_number: cycle.cycle_number,
                start_date: cycle.start_date,
                end_date: cycle.end_date,
                state,
            };
            break;
        }
    }
    if (!firstScored && isScoredCompetencyState(to)) {
        firstScored = {
            cycle_id: input.reportCycle.cycle_id,
            cycle_number: input.reportCycle.cycle_number,
            start_date: input.reportCycle.start_date,
            end_date: input.reportCycle.end_date,
            state: to,
        };
    }

    return {
        targetId: target.target_id,
        to,
        lastScored,
        firstScored,
    };
}

function contributesToFirstAssessedLine(resolution: TargetAnchorResolution, reportCycleNumber: number): boolean {
    const { firstScored, lastScored } = resolution;
    if (!firstScored || firstScored.cycle_number === reportCycleNumber) {
        return false;
    }
    if (!lastScored) {
        return false;
    }
    if (firstScored.cycle_number === lastScored.cycle_number) {
        return false;
    }
    return firstScored.cycle_number < lastScored.cycle_number;
}

export function computePresentLevelsChange(
    input: ReportPresentLevelsChangeInput
): ReportPresentLevelsChangeResult {
    const targets = packTargets(input.packSnapshot);
    const priors = usablePriors(input.priorCycles, input.reportCycle.cycle_number);
    const isFirstAssessment = input.reportCycle.cycle_number === 1 || priors.length === 0;

    if (isFirstAssessment) {
        const counts: ReportFirstAssessmentCounts = {
            demonstrated: 0,
            emerging: 0,
            not_demonstrated: 0,
            unscored: 0,
        };
        for (const target of targets) {
            const state = stateForTarget(target, input.scores, input.packSnapshot);
            if (state === 'at_maximum') {
                counts.demonstrated += 1;
            } else if (state === 'in_progress') {
                counts.emerging += 1;
            } else if (state === 'not_yet') {
                counts.not_demonstrated += 1;
            } else {
                counts.unscored += 1;
            }
        }

        return {
            mode: 'first_assessment',
            comparison_method: REPORT_COMPARISON_METHOD,
            first_assessment: {
                statement_key: 'first_assessment',
                counts,
            },
            comparisons: [],
        };
    }

    const lastCounts = emptyTransitionCounts();
    const firstCounts = emptyTransitionCounts();
    const lastHistogram: Record<string, number> = {};
    const firstHistogram: Record<string, number> = {};
    const lastAnchors: ResolvedScoredAnchor[] = [];
    const firstAnchors: ResolvedScoredAnchor[] = [];
    let firstLineContributions = 0;

    for (const target of targets) {
        const resolution = resolveTargetAnchors(target, {
            packSnapshot: input.packSnapshot,
            reportCycle: input.reportCycle,
            scores: input.scores,
            priorCycles: priors,
        });

        if (resolution.lastScored) {
            applyBucket(
                lastCounts,
                classifyCompetencyTransition(resolution.lastScored.state, resolution.to)
            );
            incrementHistogram(lastHistogram, resolution.lastScored.cycle_number);
            lastAnchors.push(resolution.lastScored);
        } else {
            applyBucket(lastCounts, classifyCompetencyTransition('unscored', resolution.to));
        }

        if (contributesToFirstAssessedLine(resolution, input.reportCycle.cycle_number)) {
            firstLineContributions += 1;
            applyBucket(
                firstCounts,
                classifyCompetencyTransition(resolution.firstScored!.state, resolution.to)
            );
            incrementHistogram(firstHistogram, resolution.firstScored!.cycle_number);
            firstAnchors.push(resolution.firstScored!);
        }
    }

    const lastLine: ReportComparisonLine = {
        role: 'last_assessed',
        label_key: 'since_last_assessed',
        anchor_span: buildAnchorSpan(lastAnchors),
        anchors_by_cycle_number: lastHistogram,
        ...lastCounts,
    };

    if (firstLineContributions > 0) {
        const firstLine: ReportComparisonLine = {
            role: 'first_assessed',
            label_key: 'since_first_assessed',
            anchor_span: buildAnchorSpan(firstAnchors),
            anchors_by_cycle_number: firstHistogram,
            ...firstCounts,
        };
        return {
            mode: 'dual_comparison',
            comparison_method: REPORT_COMPARISON_METHOD,
            first_assessment: null,
            comparisons: [lastLine, firstLine],
        };
    }

    return {
        mode: 'single_comparison',
        comparison_method: REPORT_COMPARISON_METHOD,
        first_assessment: null,
        comparisons: [lastLine],
    };
}
