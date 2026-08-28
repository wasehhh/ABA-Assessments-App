import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentPackData } from '../types';
import { auditService } from './audit';
import { assessmentService } from './assessments';

const mockFrom = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('./audit', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

const TARGET_ID = 'T1';
const ASSESSMENT_ID = 'assess-1';
const CYCLE_ID = 'cycle-1';
const CLIENT_ID = 'client-1';
const DOMAIN_ID = 'A';
const ASSESSOR_ID = 'user-1';
const ORG_ID = 'org-1';
const EXISTING_SCORE_ID = 'score-existing';

const pack: ContentPackData = {
  pack_id: 'pack-1',
  org_id: ORG_ID,
  title: 'Pack',
  description: '',
  version: '1.0',
  domains: [
    {
      domain_id: DOMAIN_ID,
      title: 'Domain A',
      targets: [
        {
          target_id: TARGET_ID,
          title: 'Target',
          success_criteria: '',
          materials: '',
          scoring: {
            type: 'numeric',
            scale: [0, 1, 2],
            scale_labels: {},
            no_opportunity_allowed: true,
          },
        },
      ],
    },
  ],
};

const createParams = {
  assessmentId: ASSESSMENT_ID,
  cycleId: CYCLE_ID,
  clientId: CLIENT_ID,
  targetId: TARGET_ID,
  domainId: DOMAIN_ID,
  score: 1,
  note: 'corrected',
  assessorId: ASSESSOR_ID,
  orgId: ORG_ID,
};

const updatedScoreRow = {
  id: EXISTING_SCORE_ID,
  assessment_id: ASSESSMENT_ID,
  assessment_cycle_id: CYCLE_ID,
  client_id: CLIENT_ID,
  pack_snapshot_id: ASSESSMENT_ID,
  target_id: TARGET_ID,
  domain_id: DOMAIN_ID,
  score: 1,
  note: 'corrected',
  metadata: undefined,
  evidence_files: [],
  assessor_user_id: ASSESSOR_ID,
  scored_at: '2026-08-27T00:00:00.000Z',
  created_at: '2026-08-27T00:00:00.000Z',
  updated_at: '2026-08-27T00:00:00.000Z',
};

type QueryResult = { data: unknown; error: unknown };

let scoresMaybeSingleQueue: QueryResult[];
let scoresSelectSingleQueue: QueryResult[];
let scoresInsertResult: QueryResult;
let scoresUpdateResult: QueryResult;
let insertCalls: unknown[];
let updateCalls: unknown[];

function assessmentOk(): QueryResult {
  return { data: { status: 'in_progress', pack_snapshot: pack }, error: null };
}

function cycleOk(): QueryResult {
  return { data: { status: 'in_progress' }, error: null };
}

function profileOk(): QueryResult {
  return { data: { role: 'therapist' }, error: null };
}

function makeChain(table: string) {
  let op: 'select' | 'insert' | 'update' = 'select';
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.insert = vi.fn((payload: unknown) => {
    op = 'insert';
    insertCalls.push(payload);
    return chain;
  });
  chain.update = vi.fn((payload: unknown) => {
    op = 'update';
    updateCalls.push(payload);
    return chain;
  });
  chain.maybeSingle = vi.fn(async () => {
    if (table !== 'assessment_scores') {
      throw new Error(`unexpected maybeSingle on ${table}`);
    }
    const next = scoresMaybeSingleQueue.shift();
    if (!next) {
      throw new Error('no assessment_scores maybeSingle result queued');
    }
    return next;
  });
  chain.single = vi.fn(async () => {
    if (table === 'assessments') return assessmentOk();
    if (table === 'assessment_cycles') return cycleOk();
    if (table === 'user_profiles') return profileOk();
    if (table === 'assessment_scores') {
      if (op === 'insert') return scoresInsertResult;
      if (op === 'update') return scoresUpdateResult;
      const next = scoresSelectSingleQueue.shift();
      if (!next) {
        throw new Error('no assessment_scores select.single result queued');
      }
      return next;
    }
    throw new Error(`unexpected table ${table}`);
  });
  return chain;
}

describe('createScore unique-violation recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scoresMaybeSingleQueue = [];
    scoresSelectSingleQueue = [];
    scoresInsertResult = { data: null, error: null };
    scoresUpdateResult = { data: null, error: null };
    insertCalls = [];
    updateCalls = [];
    mockFrom.mockImplementation((table: string) => makeChain(table));
    vi.mocked(auditService.log).mockResolvedValue(undefined as never);
  });

  it('insert path not recovering from a unique violation', async () => {
    scoresMaybeSingleQueue.push(
      { data: null, error: null },
      { data: { id: EXISTING_SCORE_ID }, error: null }
    );
    scoresInsertResult = {
      data: null,
      error: {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "assessment_scores_cycle_target_unique"',
      },
    };
    scoresSelectSingleQueue.push({
      data: {
        assessment_id: ASSESSMENT_ID,
        assessment_cycle_id: CYCLE_ID,
        target_id: TARGET_ID,
      },
      error: null,
    });
    scoresUpdateResult = { data: updatedScoreRow, error: null };

    const result = await assessmentService.createScore(createParams);

    expect(result).toEqual(updatedScoreRow);
    expect(insertCalls).toHaveLength(1);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({
      score: 1,
      note: 'corrected',
      assessor_user_id: ASSESSOR_ID,
    });
  });

  it('recovery logging a CREATE rather than an update', async () => {
    scoresMaybeSingleQueue.push(
      { data: null, error: null },
      { data: { id: EXISTING_SCORE_ID }, error: null }
    );
    scoresInsertResult = {
      data: null,
      error: {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "assessment_scores_cycle_target_unique"',
      },
    };
    scoresSelectSingleQueue.push({
      data: {
        assessment_id: ASSESSMENT_ID,
        assessment_cycle_id: CYCLE_ID,
        target_id: TARGET_ID,
      },
      error: null,
    });
    scoresUpdateResult = { data: updatedScoreRow, error: null };

    await assessmentService.createScore(createParams);

    expect(auditService.log).toHaveBeenCalledTimes(1);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entity_type: 'assessment_score',
        entity_id: EXISTING_SCORE_ID,
      })
    );
    expect(vi.mocked(auditService.log).mock.calls.some((call) => call[0]?.action === 'CREATE')).toBe(
      false
    );
  });

  it('a non-uniqueness error being swallowed by the recovery', async () => {
    const permissionError = {
      code: '42501',
      message: 'permission denied for table assessment_scores',
    };
    scoresMaybeSingleQueue.push({ data: null, error: null });
    scoresInsertResult = { data: null, error: permissionError };

    await expect(assessmentService.createScore(createParams)).rejects.toEqual(permissionError);

    expect(updateCalls).toHaveLength(0);
    expect(auditService.log).not.toHaveBeenCalled();
    expect(scoresMaybeSingleQueue).toHaveLength(0);
  });
});
