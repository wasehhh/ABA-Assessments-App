export type UserRole = 'admin' | 'senior_therapist' | 'therapist' | 'viewer';
export type AssessmentStatus = 'draft' | 'in_progress' | 'submitted' | 'approved';

export interface UserProfile {
  id: string;
  org_id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Client {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  created_by: string | null;
  created_at: string;
  status: 'active' | 'archived';
}

export type ScoringType = 'numeric' | 'checkbox' | 'yesno' | 'text';

/** Configurable UI names for pack structure levels. Absent → Alpha defaults. */
export interface StructureLabels {
  /** e.g. "Domain", "Level", "Module", "Age Band" */
  primary_group: string;
  /** e.g. "Domain", "Program", "Skill Area" */
  secondary_group?: string;
  /** e.g. "Target", "Milestone", "Item" */
  target: string;
}

/** Named reusable scoring scale at pack level. */
export interface ScoringScaleDefinition {
  scale_id: string;
  title: string;
  type: ScoringType;
  scale?: number[];
  scale_labels?: Record<number, string>;
  task_steps?: string[];
  no_opportunity_allowed?: boolean;
}

/**
 * Pack scoring mode (PR B1).
 * - uniform: all targets inherit pack default; overrides disallowed
 * - custom: targets may inherit or store sparse overrides
 */
export type PackScoringMode = 'uniform' | 'custom';

/**
 * Pack-level default scoring (inherited configuration).
 * Same attribute family as target scoring / named scales.
 */
export interface PackDefaultScoring {
  type: ScoringType;
  scale_id?: string;
  scale?: number[];
  scale_labels?: Record<number, string>;
  task_steps?: string[];
  no_opportunity_allowed?: boolean;
}

/** Optional catalog entry for secondary groups within a primary group (domain). */
export interface SecondaryGroupCatalogEntry {
  secondary_group_id: string;
  title: string;
  description?: string;
}

export interface TargetScoring {
  type: ScoringType;
  /** Optional reference into ContentPackData.scoring_scales */
  scale_id?: string;
  scale?: number[];
  scale_labels?: Record<number, string>;
  task_steps?: string[]; // Named steps for Task Analysis (was checkbox_count)
  no_opportunity_allowed: boolean;
}

export interface Target {
  target_id: string;
  title: string;
  /** What skill/competency this target is assessing (not the mastery criteria). */
  description?: string;
  success_criteria: string;
  materials: string;
  examples?: string;
  instructions?: string;
  notes?: string;
  /** Optional secondary group membership within parent domain. */
  secondary_group_id?: string;
  /**
   * Authored scoring override.
   * Absent on canonical Inherited targets; present on Override / legacy dense targets.
   */
  scoring?: TargetScoring;
}

export interface Domain {
  domain_id: string;
  title: string;
  /** Optional prose about the skill domain (e.g. from CSV `domain_description`). */
  description?: string;
  /** Optional explicit order/titles for secondary groups in this primary group. */
  secondary_groups?: SecondaryGroupCatalogEntry[];
  targets: Target[];
}

export interface ContentPackData {
  pack_id: string;
  org_id: string;
  title: string;
  description: string;
  version: string;
  structure_labels?: StructureLabels;
  /** PR B1: uniform | custom. Absent on legacy dense packs/snapshots. */
  scoring_mode?: PackScoringMode;
  /** PR B1: pack default scoring for inheritance. Absent on legacy dense packs/snapshots. */
  default_scoring?: PackDefaultScoring;
  scoring_scales?: ScoringScaleDefinition[];
  domains: Domain[];
}

export interface ContentPack {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  version: string;
  pack_data: ContentPackData;
  licence_proof_url: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
  status: 'active' | 'archived';
}

export interface Assessment {
  id: string;
  org_id: string;
  client_id: string;
  content_pack_id: string;
  pack_snapshot: ContentPackData;
  created_by: string | null;
  assigned_to: string | null;
  assessment_date: string | null;
  status: AssessmentStatus;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  // Joined fields
  client?: Client;
  pack?: ContentPack;
  scores?: AssessmentScore[];
}

export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  created_at: string;
}

export interface AssessmentCycle {
  id: string;
  assessment_id: string;
  org_id: string;
  cycle_number: number;
  status: 'in_progress' | 'locked';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface AssessmentScore {
  id: string;
  assessment_id: string;
  assessment_cycle_id: string | null; // Linked to a specific cycle
  client_id: string;
  pack_snapshot_id: string;
  target_id: string;
  domain_id: string;
  score: number | null;
  note: string | null;
  metadata?: any; // Detailed results (e.g. task analysis steps)
  evidence_files: any[];
  assessor_user_id: string | null;
  scored_at: string;
  created_at: string;
  updated_at: string;
}


