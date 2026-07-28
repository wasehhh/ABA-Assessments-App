import { supabase } from '../lib/supabase';
import { Assessment, AssessmentScore, ContentPackData, Target } from '../types';
import { auditService } from './audit';
import { canEditAssessmentScores } from '../utils/assessmentScoreEditRules';
import {
  findPackTarget,
} from '../utils/matrixDisplayHelpers';
import {
  isScoreAllowedByEffectiveScoring,
  resolveEffectiveScoring,
} from '../utils/effectiveScoring';
import { coerceScoreFromDb } from '../utils/scoreInterpretation';

function assertScoreAllowedForTarget(
  score: number | null,
  target: Target | undefined,
  pack: ContentPackData | null | undefined
): void {
  if (score === null) {
    return;
  }
  if (!target || !pack) {
    throw new Error('Unable to validate score against the assessment scale.');
  }

  const effective = resolveEffectiveScoring(target, pack);
  if (!isScoreAllowedByEffectiveScoring(score, effective)) {
    throw new Error(
      `Score ${score} is not allowed for this target. Allowed values: ${effective.allowedValues.join(', ')}.`
    );
  }
}

function normalizeAssessmentScoreRow(row: AssessmentScore): AssessmentScore {
  return {
    ...row,
    score: coerceScoreFromDb(row.score),
  };
}

export const assessmentService = {
  async create(
    orgId: string,
    clientId: string,
    packId: string,
    packSnapshot: ContentPackData,
    createdBy: string,
    assignedTo: string | null = null,
    assessmentDate: string | null = null
  ) {
    console.log('assessmentService.create: Starting...', { orgId, clientId, packId });

    // 1. Create Assessment Container
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessments')
      .insert([{
        org_id: orgId,
        client_id: clientId,
        content_pack_id: packId,
        pack_snapshot: packSnapshot,
        created_by: createdBy,
        assigned_to: assignedTo,
        assessment_date: assessmentDate,
        status: 'draft',
      }])
      .select()
      .single();

    if (assessmentError) throw assessmentError;
    const assessment = assessmentData as Assessment;

    // 2. Create Cycle 1 automatically
    const { data: cycleData, error: cycleError } = await supabase
      .from('assessment_cycles')
      .insert([{
        assessment_id: assessment.id,
        org_id: orgId,
        cycle_number: 1,
        status: 'in_progress',
        start_date: new Date().toISOString(),
      }])
      .select()
      .single();

    if (cycleError) throw cycleError;
    const cycleId = cycleData.id;

    // 3. Create Scores for Cycle 1
    const scoreInserts = [];
    for (const domain of packSnapshot.domains) {
      for (const target of domain.targets) {
        scoreInserts.push({
          assessment_id: assessment.id,
          assessment_cycle_id: cycleId, // Link to cycle
          client_id: clientId,
          pack_snapshot_id: assessment.id,
          target_id: target.target_id,
          domain_id: domain.domain_id,
          assessor_user_id: createdBy,
        });
      }
    }

    const { error: scoresError } = await supabase
      .from('assessment_scores')
      .insert(scoreInserts);

    if (scoresError) throw scoresError;

    await auditService.log({
      org_id: orgId,
      user_id: createdBy,
      action: 'CREATE',
      entity_type: 'assessment',
      entity_id: assessment.id,
      details: { client_id: clientId, pack_id: packId, cycle: 1 }
    });

    return assessment;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('assessments')
      .select('*, client:clients(first_name, last_name)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Assessment | null;
  },

  async getByClientAndPack(orgId: string, clientId: string, packId: string) {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('org_id', orgId)
      .eq('client_id', clientId)
      .eq('content_pack_id', packId)
      .maybeSingle();

    if (error) throw error;
    return data as Assessment | null;
  },

  async getByOrg(orgId: string, statusFilter: string = 'all') {
    let query = supabase
      .from('assessments')
      .select('*, client:clients(first_name, last_name), pack:content_packs(title, version)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (statusFilter === 'active') {
      // Active means draft or in_progress (if we had that status, but currently just draft?)
      // Actually assessment status is 'draft' | 'submitted' | 'approved'.
      // 'in_progress' is for cycles.
      // So 'active' likely means 'draft'.
      query = query.in('status', ['draft', 'in_progress']); // in_progress might be added later or mapped
    } else if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Assessment[];
  },

  async getScores(assessmentId: string, cycleId?: string) {
    console.log('assessmentService.getScores: Fetching scores for:', assessmentId, 'Cycle:', cycleId);
    let query = supabase
      .from('assessment_scores')
      .select('*, cycle:assessment_cycles(cycle_number, status)')
      .eq('assessment_id', assessmentId)
      .order('domain_id', { ascending: true });

    if (cycleId) {
      query = query.eq('assessment_cycle_id', cycleId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as AssessmentScore[]).map(normalizeAssessmentScoreRow);
  },

  async getPreviousScores(assessmentId: string, currentCycleNumber: number) {
    if (currentCycleNumber <= 1) return [];

    // Find the previous cycle ID first
    const { data: prevCycle } = await supabase
      .from('assessment_cycles')
      .select('id')
      .eq('assessment_id', assessmentId)
      .eq('cycle_number', currentCycleNumber - 1)
      .single();

    if (!prevCycle) return [];

    return this.getScores(assessmentId, prevCycle.id);
  },

  async getCycles(assessmentId: string) {
    const { data, error } = await supabase
      .from('assessment_cycles')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('cycle_number', { ascending: false });

    if (error) throw error;
    return data;
  },

  async ensureActiveCycle(assessmentId: string, orgId: string) {
    // Try to get the latest cycle
    const { data: cycles, error } = await supabase
      .from('assessment_cycles')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('cycle_number', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (cycles && cycles.length > 0) {
      return cycles[0]; // Return most recent cycle
    }

    // No cycle exists (legacy data?), create Cycle 1
    console.log('ensureActiveCycle: No cycle found, creating Cycle 1');
    const { data: newCycle, error: createError } = await supabase
      .from('assessment_cycles')
      .insert([{
        assessment_id: assessmentId,
        org_id: orgId,
        cycle_number: 1,
        status: 'in_progress',
        start_date: new Date().toISOString(),
      }])
      .select()
      .single();

    if (createError) throw createError;

    // We might need to backfill/link existing orphan scores here if this was a migration logic,
    // but for now we assume fresh data or that scores will be created lazily if missing? 
    // The Matrix page expects scores to exist.
    // Let's check if scores exist without cycle_id and link them?
    // For MVP, we'll assume if we created a cycle just now, we might need scores.

    return newCycle;
  },

  async startNewCycle(assessmentId: string, orgId: string, userId: string) {
    // 0. Gating: Ensure previous cycle is Approved
    const { data: assessmentData } = await supabase
      .from('assessments')
      .select('status')
      .eq('id', assessmentId)
      .single();

    if (assessmentData?.status !== 'approved') {
      throw new Error('Current assessment must be Approved by a Senior Therapist before starting a new cycle.');
    }

    // 1. Get current active cycle
    const current = await this.ensureActiveCycle(assessmentId, orgId);

    // 2. Lock current cycle
    await supabase
      .from('assessment_cycles')
      .update({ status: 'locked', end_date: new Date().toISOString() })
      .eq('id', current.id);

    // 3. Create new Cycle
    const nextNum = current.cycle_number + 1;
    const { data: newCycle, error: createError } = await supabase
      .from('assessment_cycles')
      .insert([{
        assessment_id: assessmentId,
        org_id: orgId,
        cycle_number: nextNum,
        status: 'in_progress',
        start_date: new Date().toISOString(),
      }])
      .select()
      .single();

    if (createError) throw createError;

    // 3.5 Reset Main Assessment Status to 'in_progress'
    // This moves it from "Approved" tab back to "Active" tab
    const { error: resetError } = await supabase
      .from('assessments')
      .update({
        status: 'in_progress',
        approved_by: null,
        approved_at: null
      })
      .eq('id', assessmentId);

    if (resetError) throw resetError;

    // 4. Initialize scores for new cycle (from scratch)
    // We need the pack data to know what targets to create scores for.
    const { data: assessment } = await supabase.from('assessments').select('pack_snapshot, client_id').eq('id', assessmentId).single();
    if (!assessment) throw new Error('Assessment not found');

    const scoreInserts = [];
    for (const domain of assessment.pack_snapshot.domains) {
      for (const target of domain.targets) {
        scoreInserts.push({
          assessment_id: assessmentId,
          assessment_cycle_id: newCycle.id,
          client_id: assessment.client_id,
          pack_snapshot_id: assessmentId, // Technically assessment.id but keeps schema
          target_id: target.target_id,
          domain_id: domain.domain_id,
          assessor_user_id: userId,
          score: null, // Start clean
        });
      }
    }

    const { error: scoresError } = await supabase
      .from('assessment_scores')
      .insert(scoreInserts);

    if (scoresError) throw scoresError;

    await auditService.log({
      org_id: orgId,
      user_id: userId,
      action: 'CYCLE_START',
      entity_type: 'assessment_cycle',
      entity_id: newCycle.id,
      details: { cycle: nextNum },
      new_data: { cycle: nextNum },
    });

    return newCycle;
  },

  async updateScore(
    scoreId: string,
    score: number | null,
    note: string | null,
    assessorId: string,
    orgId: string,
    metadata?: any
  ) {
    const { data: scoreRow, error: scoreRowError } = await supabase
      .from('assessment_scores')
      .select('assessment_id, assessment_cycle_id, target_id')
      .eq('id', scoreId)
      .single();

    if (scoreRowError) throw scoreRowError;
    if (!scoreRow?.assessment_cycle_id) {
      throw new Error('Score is not linked to an active cycle; updates are not allowed.');
    }

    const [aRes, cRes, pRes] = await Promise.all([
      supabase
        .from('assessments')
        .select('status, pack_snapshot')
        .eq('id', scoreRow.assessment_id)
        .single(),
      supabase.from('assessment_cycles').select('status').eq('id', scoreRow.assessment_cycle_id).single(),
      supabase.from('user_profiles').select('role').eq('id', assessorId).single(),
    ]);

    if (aRes.error) throw aRes.error;
    if (cRes.error) throw cRes.error;
    if (pRes.error) throw pRes.error;

    const role = pRes.data?.role as string | undefined;
    if (!canEditAssessmentScores(role, aRes.data?.status, cRes.data?.status)) {
      throw new Error('Score updates are not allowed for this assessment state or your role.');
    }

    const pack = aRes.data?.pack_snapshot as ContentPackData | null | undefined;
    const target = findPackTarget(pack, scoreRow.target_id);
    assertScoreAllowedForTarget(score, target, pack);

    const { data, error } = await supabase
      .from('assessment_scores')
      .update({
        score,
        note,
        metadata,
        assessor_user_id: assessorId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scoreId)
      .select()
      .single();
    if (error) throw error;

    if (orgId) {
      auditService.log({
        org_id: orgId,
        user_id: assessorId,
        action: 'UPDATE',
        entity_type: 'assessment_score',
        entity_id: scoreId,
        details: { score, note, type: 'score_update' },
      });
    }

    return normalizeAssessmentScoreRow(data as AssessmentScore);
  },

  /**
   * Creates a missing assessment_scores row for the active cycle/target.
   * If a row already exists server-side, updates it instead (idempotent save).
   */
  async createScore(params: {
    assessmentId: string;
    cycleId: string;
    clientId: string;
    targetId: string;
    domainId: string;
    score: number | null;
    note: string | null;
    assessorId: string;
    orgId: string;
    metadata?: any;
  }): Promise<AssessmentScore> {
    const {
      assessmentId,
      cycleId,
      clientId,
      targetId,
      domainId,
      score,
      note,
      assessorId,
      orgId,
      metadata,
    } = params;

    const [aRes, cRes, pRes] = await Promise.all([
      supabase
        .from('assessments')
        .select('status, pack_snapshot')
        .eq('id', assessmentId)
        .single(),
      supabase.from('assessment_cycles').select('status').eq('id', cycleId).single(),
      supabase.from('user_profiles').select('role').eq('id', assessorId).single(),
    ]);

    if (aRes.error) throw aRes.error;
    if (cRes.error) throw cRes.error;
    if (pRes.error) throw pRes.error;

    const role = pRes.data?.role as string | undefined;
    if (!canEditAssessmentScores(role, aRes.data?.status, cRes.data?.status)) {
      throw new Error('Score updates are not allowed for this assessment state or your role.');
    }

    const pack = aRes.data?.pack_snapshot as ContentPackData | null | undefined;
    const target = findPackTarget(pack, targetId);
    assertScoreAllowedForTarget(score, target, pack);

    const { data: existing, error: existingError } = await supabase
      .from('assessment_scores')
      .select('id')
      .eq('assessment_id', assessmentId)
      .eq('assessment_cycle_id', cycleId)
      .eq('target_id', targetId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.id) {
      return this.updateScore(existing.id, score, note, assessorId, orgId, metadata);
    }

    const { data, error } = await supabase
      .from('assessment_scores')
      .insert({
        assessment_id: assessmentId,
        assessment_cycle_id: cycleId,
        client_id: clientId,
        pack_snapshot_id: assessmentId,
        target_id: targetId,
        domain_id: domainId,
        score,
        note,
        metadata,
        assessor_user_id: assessorId,
      })
      .select()
      .single();

    if (error) throw error;

    if (orgId) {
      await auditService.log({
        org_id: orgId,
        user_id: assessorId,
        action: 'CREATE',
        entity_type: 'assessment_score',
        entity_id: data.id,
        details: { target_id: targetId, cycle_id: cycleId, score, note },
      });
    }

    return normalizeAssessmentScoreRow(data as AssessmentScore);
  },

  async submit(assessmentId: string, orgId: string, userId: string) {
    // Pre-flight check: Ensure assessment is active
    const { data: current } = await supabase
      .from('assessments')
      .select('status')
      .eq('id', assessmentId)
      .single();

    if (current?.status === 'submitted' || current?.status === 'approved') {
      throw new Error('Assessment is already submitted or approved.');
    }

    const { data, error } = await supabase
      .from('assessments')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', assessmentId)
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      org_id: orgId,
      user_id: userId,
      action: 'UPDATE',
      entity_type: 'assessment',
      entity_id: assessmentId,
      details: { status: 'submitted' },
      new_data: { status: 'submitted' },
    });

    // TODO: Lock current cycle?
    return data as Assessment;
  },

  async finalize(assessmentId: string, orgId: string, userId: string) {
    const { data, error } = await supabase
      .from('assessments')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', assessmentId)
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      org_id: orgId,
      user_id: userId,
      action: 'APPROVE',
      entity_type: 'assessment',
      entity_id: assessmentId,
      details: { status: 'approved' },
      new_data: { status: 'approved' },
    });

    // Lock cycle
    await supabase.from('assessment_cycles')
      .update({ status: 'locked', end_date: new Date().toISOString() })
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress'); // Lock active one

    return data as Assessment;
  },

  async delete(assessmentId: string, orgId: string, userId: string) {
    // Cascade delete handles scores and cycles usually, but good to be explicit/safe
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', assessmentId);

    if (error) throw error;

    await auditService.log({
      org_id: orgId,
      user_id: userId,
      action: 'DELETE',
      entity_type: 'assessment',
      entity_id: assessmentId,
      details: { status: 'deleted' },
      old_data: { status: 'deleted' },
    });
  },

  async exportToCSV(assessmentId: string, format: 'long' | 'matrix' = 'matrix') {
    // 1. Fetch Assessment & Pack Snapshot
    const { data: assessment, error: aError } = await supabase
      .from('assessments')
      .select('*, client:clients(first_name, last_name)')
      .eq('id', assessmentId)
      .single();

    if (aError) throw aError;
    if (!assessment) throw new Error('Assessment not found');

    // 2. Fetch All Scores (all cycles)
    const { data: scores, error: sError } = await supabase
      .from('assessment_scores')
      .select('*, cycle:assessment_cycles(cycle_number, status)')
      .eq('assessment_id', assessmentId);

    if (sError) throw sError;

    // 3. Delegate to Utility
    // Dynamic import to avoid circular deps if any, though utils should be fine.
    const { exportUtils } = await import('../utils/exportUtils');
    exportUtils.generateCSV(assessment as any, scores as any[], { format });
  },
};
