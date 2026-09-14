import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  getLearner,
  getProgramsByLearner,
  getActiveTargetsByLearner,
  getTargetsByProgram,
  createSession,
  getSession,
  getTrialsBySessionAndTarget,
  addTrial,
  endSession,
} from '@/services';
import type {
  Learner,
  Program,
  Target,
  Session,
  TrialRecord,
  TrialResult,
  PromptLevel,
} from '@/types';
import { Loading, EmptyState } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { BackLink } from '@/components/BackLink';
import { TargetStatusBadge } from '@/components/StatusBadge';
import { PROMPT_LEVEL_ORDER, promptLevelColor } from '@/lib/promptLevels';
import { aggregateSessionTrials } from '@/lib/mastery';
import { formatTime, durationBetween } from '@/lib/date';
import { Check, X, Hand, ChevronLeft, ChevronRight, Square, ClipboardList } from 'lucide-react';

type SaveState = 'idle' | 'saving' | 'saved';

export function SessionRunner() {
  const { sessionId: existingSessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const learnerId = searchParams.get('learnerId') ?? '';

  const [learner, setLearner] = useState<Learner | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [activeTargets, setActiveTargets] = useState<Target[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // Trials recorded this session, keyed by targetId
  const [trialsByTarget, setTrialsByTarget] = useState<Record<string, TrialRecord[]>>({});

  // Currently selected target
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // Default prompt level for new trials (per target)
  const [promptByTarget, setPromptByTarget] = useState<Record<string, PromptLevel>>({});

  // Session notes
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      if (existingSessionId) {
        // Resuming or viewing an existing session
        const s = await getSession(existingSessionId);
        setSession(s ?? null);
        if (s) {
          const l = await getLearner(s.learnerId);
          setLearner(l ?? null);
          const ps = await getProgramsByLearner(s.learnerId);
          setPrograms(ps.filter((p) => p.status === 'active'));
          const ts = await getActiveTargetsByLearner(s.learnerId);
          setActiveTargets(ts);
          setNotes(s.notes);
          // Load existing trials
          const tbt: Record<string, TrialRecord[]> = {};
          for (const t of ts) {
            tbt[t.id] = await getTrialsBySessionAndTarget(s.id, t.id);
          }
          setTrialsByTarget(tbt);
          if (ts.length > 0) setSelectedTargetId(ts[0].id);
        }
      } else if (learnerId) {
        const l = await getLearner(learnerId);
        setLearner(l ?? null);
        const ps = await getProgramsByLearner(learnerId);
        setPrograms(ps.filter((p) => p.status === 'active'));
        const ts = await getActiveTargetsByLearner(learnerId);
        setActiveTargets(ts);
        // Initialize prompt levels from target defaults
        const pbp: Record<string, PromptLevel> = {};
        ts.forEach((t) => (pbp[t.id] = t.promptLevel));
        setPromptByTarget(pbp);
        if (ts.length > 0) setSelectedTargetId(ts[0].id);
      }
      setLoading(false);
    })();
  }, [learnerId, existingSessionId]);

  // Start session on first interaction if not yet started
  const ensureSession = useCallback(async (): Promise<string> => {
    if (session) return session.id;
    const newSession = await createSession({
      learnerId,
      therapistName: 'Current Therapist, RBT',
      startedAt: new Date().toISOString(),
      endedAt: null,
      status: 'in-progress',
      notes: '',
    });
    setSession(newSession);
    return newSession.id;
  }, [session, learnerId]);

  const recordTrial = useCallback(
    async (result: TrialResult, promptLevel: PromptLevel | null) => {
      if (!selectedTargetId) return;
      const sid = await ensureSession();
      setSaveState('saving');
      const trial = await addTrial({
        sessionId: sid,
        targetId: selectedTargetId,
        result,
        promptLevelUsed: promptLevel,
      });
      setTrialsByTarget((prev) => ({
        ...prev,
        [selectedTargetId]: [...(prev[selectedTargetId] ?? []), trial],
      }));
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    },
    [selectedTargetId, ensureSession],
  );

  const handleEndSession = async () => {
    const sid = await ensureSession();
    await endSession(sid, notes);
    if (learner) {
      navigate(`/learners/${learner.id}`);
    } else {
      navigate('/');
    }
  };

  if (loading) return <Loading />;
  if (!learner) return <EmptyState title="Learner not found" />;

  const selectedTarget = activeTargets.find((t) => t.id === selectedTargetId);
  const selectedProgram = programs.find((p) => p.id === selectedTarget?.programId);
  const currentPrompt = selectedTarget
    ? promptByTarget[selectedTarget.id] ?? selectedTarget.promptLevel
    : 'Independent';

  // Group active targets by program
  const targetsByProgram = activeTargets.reduce<Record<string, Target[]>>((acc, t) => {
    (acc[t.programId] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Session header bar */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <BackLink to={`/learners/${learner.id}`} label={learner.name} />
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-700">Session Runner</span>
            {session && (
              <span className="text-xs text-gray-400">
                Started {formatTime(session.startedAt)}
                {session.endedAt && ` · ${durationBetween(session.startedAt, session.endedAt)}`}
              </span>
            )}
          </div>

          {/* Always-visible save indicator */}
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            <button onClick={handleEndSession} className="btn-primary">
              <Square className="h-4 w-4" /> End Session
            </button>
          </div>
        </div>
      </div>

      {activeTargets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            title="No active targets"
            message="This learner has no active programs with active targets."
          />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:flex-row">
          {/* Left: target list */}
          <div className="lg:w-64 lg:shrink-0">
            <h2 className="mb-2 text-xs font-semibold uppercase text-gray-400">Active Targets</h2>
            <div className="space-y-1">
              {programs
                .filter((p) => p.status === 'active' && targetsByProgram[p.id])
                .map((program) => (
                  <div key={program.id} className="mb-3">
                    <p className="mb-1 truncate text-xs font-medium text-gray-500">
                      {program.title}
                    </p>
                    {targetsByProgram[program.id].map((target) => {
                      const trialCount = (trialsByTarget[target.id] ?? []).length;
                      const isSelected = target.id === selectedTargetId;
                      return (
                        <button
                          key={target.id}
                          onClick={() => setSelectedTargetId(target.id)}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-accent-50 border border-accent-200'
                              : 'hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          <span className={`text-sm ${isSelected ? 'font-medium text-accent-700' : 'text-gray-700'}`}>
                            {target.name}
                          </span>
                          {trialCount > 0 && (
                            <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">
                              {trialCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>

          {/* Center: trial recording — large tap targets */}
          <div className="flex flex-1 flex-col">
            {selectedTarget && selectedProgram ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{selectedTarget.name}</h2>
                    <TargetStatusBadge status={selectedTarget.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{selectedTarget.definition}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Program: {selectedProgram.title} · {selectedProgram.dataType}
                  </p>
                </div>

                {/* Prompt level selector */}
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-400">
                    Prompt Level Used
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProgram.promptScheme.map((level) => (
                      <button
                        key={level}
                        onClick={() =>
                          setPromptByTarget((prev) => ({
                            ...prev,
                            [selectedTarget.id]: level,
                          }))
                        }
                        className={`rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                          currentPrompt === level
                            ? `${promptLevelColor(level)} border-current`
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Large trial buttons — one tap per trial */}
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    onClick={() => recordTrial('correct', currentPrompt === 'Independent' ? 'Independent' : 'Independent')}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-green-200 bg-green-50 py-8 transition-all active:scale-95 hover:bg-green-100"
                  >
                    <Check className="h-10 w-10 text-green-600" />
                    <span className="mt-2 text-base font-semibold text-green-700">Correct</span>
                    <span className="text-xs text-green-600">Independent</span>
                  </button>

                  <button
                    onClick={() => recordTrial('prompted', currentPrompt)}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-amber-200 bg-amber-50 py-8 transition-all active:scale-95 hover:bg-amber-100"
                  >
                    <Hand className="h-10 w-10 text-amber-600" />
                    <span className="mt-2 text-base font-semibold text-amber-700">Prompted</span>
                    <span className="text-xs text-amber-600">{currentPrompt}</span>
                  </button>

                  <button
                    onClick={() => recordTrial('incorrect', currentPrompt === 'Independent' ? null : currentPrompt)}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-red-200 bg-red-50 py-8 transition-all active:scale-95 hover:bg-red-100"
                  >
                    <X className="h-10 w-10 text-red-600" />
                    <span className="mt-2 text-base font-semibold text-red-700">Incorrect</span>
                    <span className="text-xs text-red-600">No response</span>
                  </button>
                </div>

                {/* Trial log for this target */}
                <TrialLog
                  trials={trialsByTarget[selectedTarget.id] ?? []}
                  promptScheme={selectedProgram.promptScheme}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-gray-400">Select a target to begin recording.</p>
              </div>
            )}
          </div>

          {/* Right: session summary + notes */}
          <div className="lg:w-72 lg:shrink-0">
            <div className="card mb-3 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Session Summary</h3>
              <SessionSummary
                trialsByTarget={trialsByTarget}
                targets={activeTargets}
              />
            </div>

            <div className="card p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Session Notes</h3>
              <textarea
                className="input min-h-[120px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observations, behavior notes, transitions…"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {state === 'idle' && (
        <>
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <span className="text-gray-400">Ready</span>
        </>
      )}
      {state === 'saving' && (
        <>
          <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          <span className="text-amber-600">Saving…</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-green-600">Saved</span>
        </>
      )}
    </div>
  );
}

function TrialLog({
  trials,
  promptScheme,
}: {
  trials: TrialRecord[];
  promptScheme: PromptLevel[];
}) {
  if (trials.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 py-6 text-center">
        <p className="text-sm text-gray-400">No trials recorded yet for this target.</p>
      </div>
    );
  }

  const summary = aggregateSessionTrials(trials);

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-sm">
        <span className="text-gray-500">
          {summary.total} trials · {summary.percentage}% independent
        </span>
        <span className="text-green-600">{summary.independentCorrect} correct</span>
        <span className="text-amber-600">{summary.prompted} prompted</span>
        <span className="text-red-600">{summary.incorrect} incorrect</span>
      </div>
      <div className="card max-h-48 divide-y divide-gray-100 overflow-y-auto">
        {[...trials].reverse().map((trial) => (
          <div key={trial.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              {trial.result === 'correct' && <Check className="h-4 w-4 text-green-600" />}
              {trial.result === 'prompted' && <Hand className="h-4 w-4 text-amber-600" />}
              {trial.result === 'incorrect' && <X className="h-4 w-4 text-red-600" />}
              <span className="text-gray-700">{trial.result}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {trial.promptLevelUsed && (
                <span className={`rounded px-1.5 py-0.5 ${promptLevelColor(trial.promptLevelUsed)}`}>
                  {trial.promptLevelUsed}
                </span>
              )}
              <span>{formatTime(trial.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionSummary({
  trialsByTarget,
  targets,
}: {
  trialsByTarget: Record<string, TrialRecord[]>;
  targets: Target[];
}) {
  const totalTrials = Object.values(trialsByTarget).reduce((sum, ts) => sum + ts.length, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Total trials</span>
        <span className="font-medium text-gray-900">{totalTrials}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Active targets</span>
        <span className="font-medium text-gray-900">{targets.length}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Targets with data</span>
        <span className="font-medium text-gray-900">
          {Object.values(trialsByTarget).filter((ts) => ts.length > 0).length}
        </span>
      </div>
    </div>
  );
}
