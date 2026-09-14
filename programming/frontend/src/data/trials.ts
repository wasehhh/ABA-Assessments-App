import type { TrialRecord, TrialResult, PromptLevel } from '@/types';

// Helper to generate trial IDs
let trialIdCounter = 1000;
const nextTrialId = () => `trial-${++trialIdCounter}`;

interface TrialSeed {
  sessionId: string;
  targetId: string;
  dayOffset: number; // days from session start
  result: TrialResult;
  promptLevelUsed: PromptLevel | null;
}

// ── Olivia's trial data across 12 sessions ──
// Targets: tgt-1 (mand-juice, mastered), tgt-2 (mand-iPad), tgt-3 (mand-cookie),
//          tgt-4 (mand-bubbles), tgt-5 (receptive-apple), tgt-6 (receptive-ball),
//          tgt-8 (motor clap-stomp-wave), tgt-9 (motor tap-knee-reach)
//
// Trend: baseline (sess 1-2) → intervention (sess 3-8) → mastery/generalization (sess 9-12)
// tgt-1 (juice) starts high, masters by sess 7
// tgt-2 (iPad) starts low, climbs to ~80% by sess 12
// tgt-3 (cookie) introduced sess 5, climbs steadily
// tgt-4 (bubbles) introduced sess 7, starts low
// tgt-5 (apple) steady improvement
// tgt-6 (ball) slower improvement
// tgt-8, tgt-9 (motor) gradual improvement

const seeds: TrialSeed[] = [];

// Helper: generate N trials for a target in a session with a target accuracy
function genTrials(
  sessionId: string,
  targetId: string,
  count: number,
  accuracyPct: number,
  promptLevel: PromptLevel | null,
  baseDay: number,
): void {
  for (let i = 0; i < count; i++) {
    const isCorrect = Math.random() * 100 < accuracyPct;
    let result: TrialResult;
    let prompt: PromptLevel | null = promptLevel;

    if (isCorrect) {
      // If accuracy is high, more likely independent
      if (accuracyPct >= 80 && Math.random() < 0.6) {
        prompt = 'Independent';
        result = 'correct';
      } else if (promptLevel && Math.random() < 0.5) {
        result = 'prompted';
      } else {
        prompt = 'Independent';
        result = 'correct';
      }
    } else {
      result = promptLevel ? 'prompted' : 'incorrect';
      if (!promptLevel) prompt = null;
    }

    seeds.push({
      sessionId,
      targetId,
      dayOffset: baseDay,
      result,
      promptLevelUsed: prompt,
    });
  }
}

// Session 1 (2026-08-01) — baseline
genTrials('sess-1', 'tgt-1', 5, 40, 'Verbal', 0);
genTrials('sess-1', 'tgt-2', 5, 20, 'Full Physical', 0);
genTrials('sess-1', 'tgt-5', 5, 30, 'Partial Physical', 0);
genTrials('sess-1', 'tgt-8', 5, 20, 'Full Physical', 0);

// Session 2 (2026-08-04) — baseline
genTrials('sess-2', 'tgt-1', 5, 50, 'Verbal', 3);
genTrials('sess-2', 'tgt-2', 5, 30, 'Full Physical', 3);
genTrials('sess-2', 'tgt-5', 5, 40, 'Partial Physical', 3);
genTrials('sess-2', 'tgt-8', 5, 30, 'Full Physical', 3);

// Session 3 (2026-08-08) — intervention begins
genTrials('sess-3', 'tgt-1', 5, 60, 'Verbal', 7);
genTrials('sess-3', 'tgt-2', 5, 40, 'Partial Physical', 7);
genTrials('sess-3', 'tgt-5', 5, 50, 'Gestural', 7);
genTrials('sess-3', 'tgt-8', 5, 40, 'Partial Physical', 7);
genTrials('sess-3', 'tgt-6', 5, 20, 'Full Physical', 7);

// Session 4 (2026-08-11)
genTrials('sess-4', 'tgt-1', 5, 70, 'Gestural', 10);
genTrials('sess-4', 'tgt-2', 5, 50, 'Partial Physical', 10);
genTrials('sess-4', 'tgt-5', 5, 60, 'Gestural', 10);
genTrials('sess-4', 'tgt-8', 5, 50, 'Model', 10);
genTrials('sess-4', 'tgt-6', 5, 30, 'Full Physical', 10);

// Session 5 (2026-08-15) — introduce tgt-3 (cookie)
genTrials('sess-5', 'tgt-1', 5, 80, 'Gestural', 14);
genTrials('sess-5', 'tgt-2', 5, 60, 'Partial Physical', 14);
genTrials('sess-5', 'tgt-3', 5, 20, 'Full Physical', 14);
genTrials('sess-5', 'tgt-5', 5, 70, 'Gestural', 14);
genTrials('sess-5', 'tgt-8', 5, 60, 'Model', 14);
genTrials('sess-5', 'tgt-6', 5, 40, 'Partial Physical', 14);

// Session 6 (2026-08-18)
genTrials('sess-6', 'tgt-1', 5, 90, 'Independent', 17);
genTrials('sess-6', 'tgt-2', 5, 70, 'Verbal', 17);
genTrials('sess-6', 'tgt-3', 5, 40, 'Partial Physical', 17);
genTrials('sess-6', 'tgt-5', 5, 80, 'Gestural', 17);
genTrials('sess-6', 'tgt-8', 5, 70, 'Model', 17);
genTrials('sess-6', 'tgt-6', 5, 50, 'Partial Physical', 17);
genTrials('sess-6', 'tgt-9', 5, 30, 'Full Physical', 17);

// Session 7 (2026-08-22) — introduce tgt-4 (bubbles), tgt-1 approaching mastery
genTrials('sess-7', 'tgt-1', 5, 100, 'Independent', 21);
genTrials('sess-7', 'tgt-2', 5, 80, 'Verbal', 21);
genTrials('sess-7', 'tgt-3', 5, 50, 'Gestural', 21);
genTrials('sess-7', 'tgt-4', 5, 20, 'Full Physical', 21);
genTrials('sess-7', 'tgt-5', 5, 80, 'Independent', 21);
genTrials('sess-7', 'tgt-8', 5, 80, 'Gestural', 21);
genTrials('sess-7', 'tgt-6', 5, 60, 'Model', 21);
genTrials('sess-7', 'tgt-9', 5, 50, 'Partial Physical', 21);

// Session 8 (2026-08-25)
genTrials('sess-8', 'tgt-2', 5, 80, 'Verbal', 24);
genTrials('sess-8', 'tgt-3', 5, 60, 'Gestural', 24);
genTrials('sess-8', 'tgt-4', 5, 40, 'Partial Physical', 24);
genTrials('sess-8', 'tgt-5', 5, 90, 'Independent', 24);
genTrials('sess-8', 'tgt-8', 5, 80, 'Gestural', 24);
genTrials('sess-8', 'tgt-6', 5, 70, 'Model', 24);
genTrials('sess-8', 'tgt-9', 5, 60, 'Model', 24);

// Session 9 (2026-08-29) — mastery/generalization phase, tgt-1 mastered
genTrials('sess-9', 'tgt-2', 5, 90, 'Independent', 28);
genTrials('sess-9', 'tgt-3', 5, 70, 'Gestural', 28);
genTrials('sess-9', 'tgt-4', 5, 50, 'Gestural', 28);
genTrials('sess-9', 'tgt-5', 5, 90, 'Independent', 28);
genTrials('sess-9', 'tgt-8', 5, 90, 'Independent', 28);
genTrials('sess-9', 'tgt-6', 5, 80, 'Gestural', 28);
genTrials('sess-9', 'tgt-9', 5, 70, 'Model', 28);

// Session 10 (2026-09-01)
genTrials('sess-10', 'tgt-2', 5, 90, 'Independent', 31);
genTrials('sess-10', 'tgt-3', 5, 80, 'Gestural', 31);
genTrials('sess-10', 'tgt-4', 5, 60, 'Gestural', 31);
genTrials('sess-10', 'tgt-5', 5, 100, 'Independent', 31);
genTrials('sess-10', 'tgt-8', 5, 90, 'Independent', 31);
genTrials('sess-10', 'tgt-6', 5, 80, 'Gestural', 31);
genTrials('sess-10', 'tgt-9', 5, 80, 'Model', 31);

// Session 11 (2026-09-05)
genTrials('sess-11', 'tgt-2', 5, 100, 'Independent', 35);
genTrials('sess-11', 'tgt-3', 5, 80, 'Gestural', 35);
genTrials('sess-11', 'tgt-4', 5, 70, 'Gestural', 35);
genTrials('sess-11', 'tgt-5', 5, 90, 'Independent', 35);
genTrials('sess-11', 'tgt-8', 5, 100, 'Independent', 35);
genTrials('sess-11', 'tgt-6', 5, 90, 'Gestural', 35);
genTrials('sess-11', 'tgt-9', 5, 80, 'Gestural', 35);

// Session 12 (2026-09-09)
genTrials('sess-12', 'tgt-2', 5, 100, 'Independent', 39);
genTrials('sess-12', 'tgt-3', 5, 90, 'Gestural', 39);
genTrials('sess-12', 'tgt-4', 5, 80, 'Gestural', 39);
genTrials('sess-12', 'tgt-5', 5, 100, 'Independent', 39);
genTrials('sess-12', 'tgt-8', 5, 100, 'Independent', 39);
genTrials('sess-12', 'tgt-6', 5, 90, 'Gestural', 39);
genTrials('sess-12', 'tgt-9', 5, 90, 'Model', 39);

// ── Marcus sessions ──
genTrials('sess-13', 'tgt-12', 5, 60, 'Verbal', 0);
genTrials('sess-14', 'tgt-12', 5, 80, 'Verbal', 4);
genTrials('sess-14', 'tgt-13', 5, 40, 'Model', 4);

// ── Aisha session ──
genTrials('sess-15', 'tgt-14', 5, 40, 'Partial Physical', 0);

// Convert seeds to TrialRecords with timestamps
const sessionDates: Record<string, string> = {
  'sess-1': '2026-08-01T09:00:00',
  'sess-2': '2026-08-04T09:00:00',
  'sess-3': '2026-08-08T09:00:00',
  'sess-4': '2026-08-11T09:00:00',
  'sess-5': '2026-08-15T09:00:00',
  'sess-6': '2026-08-18T09:00:00',
  'sess-7': '2026-08-22T09:00:00',
  'sess-8': '2026-08-25T09:00:00',
  'sess-9': '2026-08-29T09:00:00',
  'sess-10': '2026-09-01T09:00:00',
  'sess-11': '2026-09-05T09:00:00',
  'sess-12': '2026-09-09T09:00:00',
  'sess-13': '2026-09-02T13:00:00',
  'sess-14': '2026-09-06T13:00:00',
  'sess-15': '2026-08-20T10:00:00',
};

export const trials: TrialRecord[] = seeds.map((s) => {
  const baseDate = new Date(sessionDates[s.sessionId]);
  baseDate.setMinutes(baseDate.getMinutes() + s.dayOffset * 0 + Math.floor(Math.random() * 60));
  return {
    id: nextTrialId(),
    sessionId: s.sessionId,
    targetId: s.targetId,
    timestamp: baseDate.toISOString(),
    result: s.result,
    promptLevelUsed: s.promptLevelUsed,
  };
});
