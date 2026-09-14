import type { Session, TrialRecord, DataPoint } from '@/types';
import { sessions } from '@/data/sessions';
import { trials } from '@/data/trials';
import { dataPoints } from '@/data/dataPoints';

const delay = (ms: number = 100) => new Promise((r) => setTimeout(r, ms));

// In-memory mutable store for new sessions and trials created during the prototype
const sessionStore: Session[] = [...sessions];
const trialStore: TrialRecord[] = [...trials];

export async function getSessions(): Promise<Session[]> {
  await delay();
  return [...sessionStore];
}

export async function getSession(id: string): Promise<Session | undefined> {
  await delay();
  return sessionStore.find((s) => s.id === id);
}

export async function getSessionsByLearner(learnerId: string): Promise<Session[]> {
  await delay();
  return sessionStore
    .filter((s) => s.learnerId === learnerId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function createSession(
  session: Omit<Session, 'id' | 'corrections'>,
): Promise<Session> {
  await delay();
  const newSession: Session = {
    ...session,
    id: `sess-${Date.now()}`,
    corrections: [],
  };
  sessionStore.push(newSession);
  return newSession;
}

export async function updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
  await delay();
  const idx = sessionStore.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  sessionStore[idx] = { ...sessionStore[idx], ...updates };
  return sessionStore[idx];
}

export async function endSession(id: string, notes: string): Promise<Session | undefined> {
  await delay();
  const idx = sessionStore.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  sessionStore[idx] = {
    ...sessionStore[idx],
    endedAt: new Date().toISOString(),
    status: 'completed',
    notes: notes || sessionStore[idx].notes,
  };
  return sessionStore[idx];
}

export async function getTrials(): Promise<TrialRecord[]> {
  await delay();
  return [...trialStore];
}

export async function getTrialsBySession(sessionId: string): Promise<TrialRecord[]> {
  await delay();
  return trialStore.filter((t) => t.sessionId === sessionId);
}

export async function getTrialsByTarget(targetId: string): Promise<TrialRecord[]> {
  await delay();
  return trialStore.filter((t) => t.targetId === targetId);
}

export async function getTrialsBySessionAndTarget(
  sessionId: string,
  targetId: string,
): Promise<TrialRecord[]> {
  await delay();
  return trialStore.filter((t) => t.sessionId === sessionId && t.targetId === targetId);
}

export async function addTrial(
  trial: Omit<TrialRecord, 'id' | 'timestamp'>,
): Promise<TrialRecord> {
  await delay(50);
  const newTrial: TrialRecord = {
    ...trial,
    id: `trial-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  trialStore.push(newTrial);
  return newTrial;
}

export async function getDataPoints(): Promise<DataPoint[]> {
  await delay();
  return [...dataPoints];
}

export async function getDataPointsByTarget(targetId: string): Promise<DataPoint[]> {
  await delay();
  return dataPoints
    .filter((d) => d.targetId === targetId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDataPointsByProgramTargets(targetIds: string[]): Promise<DataPoint[]> {
  await delay();
  const idSet = new Set(targetIds);
  return dataPoints
    .filter((d) => idSet.has(d.targetId))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Supervisor correction — audit trail stub
export async function correctSessionNote(
  sessionId: string,
  newNote: string,
  correctedBy: string,
): Promise<Session | undefined> {
  await delay();
  const idx = sessionStore.findIndex((s) => s.id === sessionId);
  if (idx === -1) return undefined;
  const oldNote = sessionStore[idx].notes;
  const correction = {
    id: `corr-${Date.now()}`,
    field: 'notes',
    oldValue: oldNote,
    newValue: newNote,
    correctedBy,
    correctedAt: new Date().toISOString(),
  };
  sessionStore[idx] = {
    ...sessionStore[idx],
    notes: newNote,
    corrections: [...(sessionStore[idx].corrections || []), correction],
  };
  return sessionStore[idx];
}
