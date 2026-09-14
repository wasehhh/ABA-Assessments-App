import type { DataPoint, PhaseKind } from '@/types';
import { trials } from './trials';
import { sessions } from './sessions';

// Derive DataPoints from trial data — one aggregated point per target per session
// For trial-by-trial and percentage/probe: value = % correct (independent + correct)
// For frequency: value = count of trials
// For duration: value = seconds (mocked)
// For task-analysis: value = % steps correct

let dpIdCounter = 0;
const nextDpId = () => `dp-${++dpIdCounter}`;

const sessionDateMap: Record<string, string> = {};
sessions.forEach((s) => {
  sessionDateMap[s.id] = s.startedAt.split('T')[0];
});

// Determine phase based on session date
function getPhase(sessionId: string): PhaseKind {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return 'baseline';
  const date = new Date(session.startedAt);
  const baselineEnd = new Date('2026-08-05');
  const interventionEnd = new Date('2026-08-28');

  if (date <= baselineEnd) return 'baseline';
  if (date <= interventionEnd) return 'intervention';
  return 'mastery';
}

// Group trials by (targetId, sessionId)
const grouped: Record<string, Record<string, typeof trials>> = {};
trials.forEach((t) => {
  if (!grouped[t.targetId]) grouped[t.targetId] = {};
  if (!grouped[t.targetId][t.sessionId]) grouped[t.targetId][t.sessionId] = [] as never;
  grouped[t.targetId][t.sessionId].push(t);
});

export const dataPoints: DataPoint[] = [];

Object.entries(grouped).forEach(([targetId, sessionTrials]) => {
  Object.entries(sessionTrials).forEach(([sessionId, trialArr]) => {
    const total = trialArr.length;
    if (total === 0) return;

    const correctCount = trialArr.filter(
      (t) => t.result === 'correct' && t.promptLevelUsed === 'Independent',
    ).length;
    const pct = Math.round((correctCount / total) * 100);

    const date = sessionDateMap[sessionId];
    if (!date) return;

    dataPoints.push({
      id: nextDpId(),
      targetId,
      sessionId,
      date,
      value: pct,
      phase: getPhase(sessionId),
    });
  });
});

// Sort by date for each target
dataPoints.sort((a, b) => a.date.localeCompare(b.date));
