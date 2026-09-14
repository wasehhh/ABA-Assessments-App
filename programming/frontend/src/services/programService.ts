import type { Program, Target, AssessmentLink } from '@/types';
import { programs } from '@/data/programs';
import { targets } from '@/data/targets';
import { assessmentLinks } from '@/data/assessmentLinks';

const delay = (ms: number = 100) => new Promise((r) => setTimeout(r, ms));

export async function getPrograms(): Promise<Program[]> {
  await delay();
  return [...programs];
}

export async function getProgram(id: string): Promise<Program | undefined> {
  await delay();
  return programs.find((p) => p.id === id);
}

export async function getProgramsByLearner(learnerId: string): Promise<Program[]> {
  await delay();
  return programs.filter((p) => p.learnerId === learnerId);
}

export async function getTargets(): Promise<Target[]> {
  await delay();
  return [...targets];
}

export async function getTarget(id: string): Promise<Target | undefined> {
  await delay();
  return targets.find((t) => t.id === id);
}

export async function getTargetsByProgram(programId: string): Promise<Target[]> {
  await delay();
  return targets
    .filter((t) => t.programId === programId)
    .sort((a, b) => a.order - b.order);
}

export async function getActiveTargetsByLearner(learnerId: string): Promise<Target[]> {
  await delay();
  const learnerPrograms = programs.filter(
    (p) => p.learnerId === learnerId && p.status === 'active',
  );
  const programIds = new Set(learnerPrograms.map((p) => p.id));
  return targets.filter((t) => programIds.has(t.programId) && t.status === 'active');
}

export async function getAssessmentLinks(): Promise<AssessmentLink[]> {
  await delay();
  return [...assessmentLinks];
}

export async function getAssessmentLink(id: string): Promise<AssessmentLink | undefined> {
  await delay();
  return assessmentLinks.find((a) => a.id === id);
}

export async function getAssessmentLinkByProgram(programId: string): Promise<AssessmentLink | undefined> {
  await delay();
  return assessmentLinks.find((a) => a.programId === programId);
}

export async function getAssessmentLinksByLearner(learnerId: string): Promise<AssessmentLink[]> {
  await delay();
  const learnerPrograms = programs.filter((p) => p.learnerId === learnerId);
  const programIds = new Set(learnerPrograms.map((p) => p.id));
  return assessmentLinks.filter((a) => programIds.has(a.programId));
}
