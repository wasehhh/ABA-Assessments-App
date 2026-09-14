import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getSession,
  getLearner,
  getTrialsBySession,
  getProgramsByLearner,
  getTargetsByProgram,
} from '@/services';
import type { Session, Learner, TrialRecord, Program, Target } from '@/types';
import { Loading, EmptyState } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { BackLink } from '@/components/BackLink';
import { formatDateTime, durationBetween } from '@/lib/date';
import { promptLevelColor } from '@/lib/promptLevels';
import { aggregateSessionTrials } from '@/lib/mastery';
import { Check, X, Hand, Pencil } from 'lucide-react';

export function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [trials, setTrials] = useState<TrialRecord[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [targetsByProgram, setTargetsByProgram] = useState<Record<string, Target[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const s = await getSession(sessionId);
      setSession(s ?? null);
      if (s) {
        const l = await getLearner(s.learnerId);
        setLearner(l ?? null);
        const ts = await getTrialsBySession(s.id);
        setTrials(ts);
        const ps = await getProgramsByLearner(s.learnerId);
        setPrograms(ps);
        const tbp: Record<string, Target[]> = {};
        for (const p of ps) {
          tbp[p.id] = await getTargetsByProgram(p.id);
        }
        setTargetsByProgram(tbp);
      }
      setLoading(false);
    })();
  }, [sessionId]);

  if (loading) return <Loading />;
  if (!session) return <EmptyState title="Session not found" />;

  // Group trials by target
  const trialsByTarget = trials.reduce<Record<string, TrialRecord[]>>((acc, t) => {
    (acc[t.targetId] ??= []).push(t);
    return acc;
  }, {});

  // Find all targets that have trials
  const allTargets = Object.values(targetsByProgram).flat();
  const targetMap = new Map(allTargets.map((t) => [t.id, t]));

  return (
    <div>
      <PageHeader
        title={learner ? `${learner.name} — Session` : 'Session'}
        subtitle={formatDateTime(session.startedAt)}
        back={
          learner ? (
            <BackLink to={`/learners/${learner.id}`} label={learner.name} />
          ) : (
            <BackLink to="/sessions" label="Sessions" />
          )
        }
        actions={
          <Link to={`/sessions/${session.id}/run`} className="btn-secondary">
            <Pencil className="h-4 w-4" /> Resume
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-3">
          <p className="text-xs text-gray-400">Therapist</p>
          <p className="text-sm font-medium text-gray-900">{session.therapistName}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-400">Duration</p>
          <p className="text-sm font-medium text-gray-900">
            {session.endedAt ? durationBetween(session.startedAt, session.endedAt) : 'In progress'}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-400">Total Trials</p>
          <p className="text-sm font-medium text-gray-900">{trials.length}</p>
        </div>
      </div>

      {/* Audit trail */}
      {session.corrections && session.corrections.length > 0 && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-800">Correction History</h3>
          {session.corrections.map((c) => (
            <div key={c.id} className="text-xs text-amber-700">
              <p>
                <span className="font-medium">{c.correctedBy}</span> corrected{' '}
                <span className="font-mono">{c.field}</span> on{' '}
                {formatDateTime(c.correctedAt)}
              </p>
              <p className="mt-1">
                <span className="line-through opacity-60">{c.oldValue}</span> →{' '}
                <span>{c.newValue}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Session notes */}
      {session.notes && (
        <div className="card mb-6 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Notes</h3>
          <p className="text-sm text-gray-700">{session.notes}</p>
        </div>
      )}

      {/* Trial data per target */}
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Trial Data</h2>
      {trials.length === 0 ? (
        <EmptyState title="No trials recorded" />
      ) : (
        <div className="space-y-4">
          {Object.entries(trialsByTarget).map(([targetId, targetTrials]) => {
            const target = targetMap.get(targetId);
            const summary = aggregateSessionTrials(targetTrials);
            if (!target) return null;
            return (
              <div key={targetId} className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{target.name}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {summary.total} trials · {summary.percentage}% independent
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {targetTrials.map((t) => (
                    <div
                      key={t.id}
                      className="flex h-8 w-8 items-center justify-center rounded text-xs"
                      title={`${t.result}${t.promptLevelUsed ? ` · ${t.promptLevelUsed}` : ''}`}
                    >
                      {t.result === 'correct' && (
                        <Check className="h-5 w-5 text-green-600" />
                      )}
                      {t.result === 'prompted' && (
                        <Hand className="h-5 w-5 text-amber-600" />
                      )}
                      {t.result === 'incorrect' && (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
