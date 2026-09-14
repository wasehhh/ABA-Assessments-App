import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getSessions,
  getLearners,
  getTrialsBySession,
  correctSessionNote,
} from '@/services';
import type { Session, Learner, TrialRecord } from '@/types';
import { Loading, EmptyState } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { formatDateTime, durationBetween } from '@/lib/date';
import { aggregateSessionTrials } from '@/lib/mastery';
import { Pencil, Check, X, AlertCircle } from 'lucide-react';

export function SupervisorReview() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [trialCounts, setTrialCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const ss = await getSessions();
    const sorted = ss
      .filter((s) => s.status === 'completed')
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 20);
    setSessions(sorted);
    const ls = await getLearners();
    setLearners(ls);
    const counts: Record<string, number> = {};
    for (const s of sorted) {
      const ts = await getTrialsBySession(s.id);
      counts[s.id] = ts.length;
    }
    setTrialCounts(counts);
    setLoading(false);
  };

  const handleCorrect = async (sessionId: string) => {
    await correctSessionNote(sessionId, editValue, 'Sarah Thompson, BCBA');
    setEditingId(null);
    setEditValue('');
    await load();
  };

  if (loading) return <Loading />;

  const learnerMap = new Map(learners.map((l) => [l.id, l]));

  return (
    <div>
      <PageHeader
        title="Supervisor Review"
        subtitle="Review recent session data. Corrections are logged to the audit trail."
      />

      {/* Audit trail note */}
      <div className="mb-6 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <p className="text-xs text-blue-800">
          As a supervisor, you can correct session notes. Each correction records the original value,
          new value, who made the change, and when — visible to anyone viewing the session.
        </p>
      </div>

      {sessions.length === 0 ? (
        <EmptyState title="No completed sessions to review" />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const learner = learnerMap.get(s.learnerId);
            const trialCount = trialCounts[s.id] ?? 0;
            const isEditing = editingId === s.id;
            const hasCorrections = s.corrections && s.corrections.length > 0;

            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/sessions/${s.id}`}
                        className="font-medium text-gray-900 hover:text-accent-600"
                      >
                        {learner?.name ?? 'Unknown'}
                      </Link>
                      {hasCorrections && (
                        <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                          <AlertCircle className="h-3 w-3" />
                          Corrected
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDateTime(s.startedAt)} · {s.therapistName}
                      {s.endedAt && ` · ${durationBetween(s.startedAt, s.endedAt)}`}
                      {` · ${trialCount} trials`}
                    </p>
                  </div>
                </div>

                {/* Session notes with correction capability */}
                <div className="mt-3 rounded-md bg-gray-50 p-3">
                  {isEditing ? (
                    <div>
                      <textarea
                        className="input min-h-[80px]"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleCorrect(s.id)}
                          className="btn-primary text-xs"
                        >
                          <Check className="h-3 w-3" /> Save Correction
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditValue('');
                          }}
                          className="btn-ghost text-xs"
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-700">{s.notes || 'No notes.'}</p>
                      <button
                        onClick={() => {
                          setEditingId(s.id);
                          setEditValue(s.notes);
                        }}
                        className="ml-3 shrink-0 text-gray-400 hover:text-accent-600"
                        title="Correct notes"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Correction history */}
                {hasCorrections && (
                  <div className="mt-3 space-y-2">
                    {s.corrections!.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-md border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs"
                      >
                        <p className="font-medium text-amber-700">
                          Corrected by {c.correctedBy} on {formatDateTime(c.correctedAt)}
                        </p>
                        <p className="mt-1 text-gray-500">
                          <span className="line-through opacity-60">{c.oldValue}</span>
                        </p>
                        <p className="text-gray-700">{c.newValue}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
