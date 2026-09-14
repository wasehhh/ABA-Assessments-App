import type { Learner } from '@/types';
import { learners } from '@/data/learners';

const delay = (ms: number = 100) => new Promise((r) => setTimeout(r, ms));

export async function getLearners(): Promise<Learner[]> {
  await delay();
  return [...learners];
}

export async function getLearner(id: string): Promise<Learner | undefined> {
  await delay();
  return learners.find((l) => l.id === id);
}
