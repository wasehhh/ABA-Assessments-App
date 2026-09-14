// ── Core domain types for Evalis Programming ──

export type LearnerStatus = 'active' | 'paused' | 'discharged';

export interface Learner {
  id: string;
  name: string;
  dateOfBirth: string; // ISO date
  status: LearnerStatus;
}

export type ProgramStatus = 'draft' | 'active' | 'on-hold' | 'completed';
export type DataType =
  | 'trial-by-trial'
  | 'frequency'
  | 'duration'
  | 'percentage/probe'
  | 'task-analysis';

export type PromptLevel =
  | 'Full Physical'
  | 'Partial Physical'
  | 'Model'
  | 'Gestural'
  | 'Verbal'
  | 'Independent';

export interface Program {
  id: string;
  learnerId: string;
  title: string;
  rationale: string;
  goal: string;
  instructions: string;
  dataType: DataType;
  promptScheme: PromptLevel[];
  masteryRule: string;
  status: ProgramStatus;
  notes: string;
  assessmentLinkId: string | null;
}

export type TargetStatus = 'active' | 'on-hold' | 'mastered';

export interface Target {
  id: string;
  programId: string;
  name: string;
  definition: string;
  status: TargetStatus;
  order: number;
  examples: string[];
  materials: string[];
  promptLevel: PromptLevel;
}

export type SessionStatus = 'in-progress' | 'completed' | 'cancelled';

export interface Session {
  id: string;
  learnerId: string;
  therapistName: string;
  startedAt: string; // ISO datetime
  endedAt: string | null; // ISO datetime
  status: SessionStatus;
  notes: string;
  /** audit-trail stub: supervisor corrections */
  corrections?: SessionCorrection[];
}

export interface SessionCorrection {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  correctedBy: string;
  correctedAt: string;
}

export type TrialResult = 'correct' | 'incorrect' | 'prompted';

export interface TrialRecord {
  id: string;
  sessionId: string;
  targetId: string;
  timestamp: string; // ISO datetime
  result: TrialResult;
  promptLevelUsed: PromptLevel | null;
}

export type PhaseKind = 'baseline' | 'intervention' | 'mastery' | 'generalization';

export interface DataPoint {
  id: string;
  targetId: string;
  sessionId: string;
  date: string; // ISO date
  value: number;
  phase: PhaseKind;
}

export interface AssessmentLink {
  id: string;
  programId: string;
  assessmentName: string;
  itemCode: string;
  itemDescription: string;
  scoreAtLink: string;
  linkedDate: string; // ISO date
}

// ── Role ──
export type Role = 'therapist' | 'supervisor';
