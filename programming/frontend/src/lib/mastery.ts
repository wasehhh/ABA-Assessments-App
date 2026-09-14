import type { TrialRecord, DataPoint, Target } from '@/types';

// ── Mastery evaluation: pure functions ──
// These are the beginning of the real measurement engine.

export interface MasteryCheckResult {
  met: boolean;
  currentStreak: number;
  lastNValues: number[];
  threshold: number;
  requiredSessions: number;
}

// Parse a mastery rule string like "80% independent across 3 consecutive sessions"
// Returns threshold percentage and required consecutive sessions
export function parseMasteryRule(rule: string): { threshold: number; requiredSessions: number } {
  const thresholdMatch = rule.match(/(\d+)%/);
  const sessionsMatch = rule.match(/(\d+)\s+consecutive/);

  return {
    threshold: thresholdMatch ? parseInt(thresholdMatch[1], 10) : 80,
    requiredSessions: sessionsMatch ? parseInt(sessionsMatch[1], 10) : 3,
  // For task-analysis rules like "4/5 steps correct across 3 consecutive sessions"
  // the threshold is parsed from the fraction
  };
}

// Parse task-analysis mastery rule like "4/5 steps correct across 3 consecutive sessions"
export function parseTaskAnalysisMasteryRule(rule: string): { numerator: number; denominator: number; requiredSessions: number } {
  const fractionMatch = rule.match(/(\d+)\/(\d+)/);
  const sessionsMatch = rule.match(/(\d+)\s+consecutive/);

  return {
    numerator: fractionMatch ? parseInt(fractionMatch[1], 10) : 4,
    denominator: fractionMatch ? parseInt(fractionMatch[2], 10) : 5,
    requiredSessions: sessionsMatch ? parseInt(sessionsMatch[1], 10) : 3,
  // Convert to percentage threshold
  };
}

// Check mastery for a percentage-based program
// Given data points (sorted by date), check if the last N sessions all meet threshold
export function checkPercentageMastery(dataPoints: DataPoint[], rule: string): MasteryCheckResult {
  const { threshold, requiredSessions } = parseMasteryRule(rule);

  if (dataPoints.length === 0) {
    return { met: false, currentStreak: 0, lastNValues: [], threshold, requiredSessions };
  }

  const sorted = [...dataPoints].sort((a, b) => a.date.localeCompare(b.date));
  const lastN = sorted.slice(-requiredSessions);

  // Count consecutive sessions from the end that meet threshold
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].value >= threshold) streak++;
    else break;
  }

  return {
    met: streak >= requiredSessions,
    currentStreak: streak,
    lastNValues: lastN.map((d) => d.value),
    threshold,
    requiredSessions,
  };
}

// Calculate percentage of independent correct trials from a set of trials
export function calculateIndependentPercentage(trials: TrialRecord[]): number {
  if (trials.length === 0) return 0;
  const independent = trials.filter(
    (t) => t.result === 'correct' && t.promptLevelUsed === 'Independent',
  ).length;
  return Math.round((independent / trials.length) * 100);
}

// Calculate percentage of correct trials (including prompted)
export function calculateCorrectPercentage(trials: TrialRecord[]): number {
  if (trials.length === 0) return 0;
  const correct = trials.filter(
    (t) => t.result === 'correct' || t.result === 'prompted',
  ).length;
  return Math.round((correct / trials.length) * 100);
}

// Calculate trend: simple linear regression slope
// Returns positive for improving, negative for declining
export function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

// Check if a target should be marked as mastered based on its data
export function evaluateTargetMastery(target: Target, dataPoints: DataPoint[], masteryRule: string): MasteryCheckResult {
  const targetData = dataPoints.filter((d) => d.targetId === target.id);
  return checkPercentageMastery(targetData, masteryRule);
}

// Aggregate trials for a target in a session into a single percentage
export function aggregateSessionTrials(trials: TrialRecord[]): {
  total: number;
  independentCorrect: number;
  prompted: number;
  incorrect: number;
  percentage: number;
} {
  const total = trials.length;
  const independentCorrect = trials.filter(
    (t) => t.result === 'correct' && t.promptLevelUsed === 'Independent',
  ).length;
  const prompted = trials.filter((t) => t.result === 'prompted').length;
  const incorrect = trials.filter((t) => t.result === 'incorrect').length;
  const percentage = total > 0 ? Math.round((independentCorrect / total) * 100) : 0;

  return { total, independentCorrect, prompted, incorrect, percentage };
}
