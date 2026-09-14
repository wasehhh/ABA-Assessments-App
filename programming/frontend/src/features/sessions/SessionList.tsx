import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSessions, getLearners } from '@/services';
import type { Session, Learner } from '@/types';
import { Loading, EmptyState } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { formatDateTime, durationBetween } from '@/lib/date';
import { ClipboardList, Plus } from 'lucide-react';

export function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ss = await getSessions();
      setSessions(ss.sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
      const ls = await getLearners();
      setLearners(ls);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading />;

  const learnerMap = new Map(learners.map((l) => [l.id, l]));

  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle="All therapy sessions across learners."
        actions={
          <Link to="/" className="btn-secondary">
            <Plus className="h-4 w-4" /> Start Session
          </Link>
        }
      />
      {sessions.length === 0 ? (
        <EmptyState title="No sessions yet" message="Start a session from a learner's page." />
      ) : (
        <div className="card divide-y divide-gray-100">
          {sessions.map((s) => {
            const learner = learnerMap.get(s.learnerId);
            return (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {learner?.name ?? 'Unknown'} — {formatDateTime(s.startedAt)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.therapistName}
                      {s.endedAt && ` · ${durationBetween(s.startedAt, s.endedAt)}`}
                      {s.corrections && s.corrections.length > 0 && (
                        <span className="ml-2 text-amber-600">· corrected</span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{s.status}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
