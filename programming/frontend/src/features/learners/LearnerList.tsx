import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLearners, getProgramsByLearner } from '@/services';
import type { Learner, Program } from '@/types';
import { LearnerStatusBadge } from '@/components/StatusBadge';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { ageFromDOB, formatDate } from '@/lib/date';
import { ChevronRight } from 'lucide-react';

export function LearnerList() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [programCounts, setProgramCounts] = useState<Record<string, Program[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ls = await getLearners();
      setLearners(ls);
      const counts: Record<string, Program[]> = {};
      for (const l of ls) {
        counts[l.id] = await getProgramsByLearner(l.id);
      }
      setProgramCounts(counts);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Learners" subtitle="Select a learner to view programs and session history." />
      <div className="grid gap-3">
        {learners.map((learner) => {
          const programs = programCounts[learner.id] ?? [];
          const activeCount = programs.filter((p) => p.status === 'active').length;
          return (
            <Link
              key={learner.id}
              to={`/learners/${learner.id}`}
              className="card flex items-center justify-between p-4 hover:border-accent-300 hover:bg-accent-50/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                  {learner.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{learner.name}</span>
                    <LearnerStatusBadge status={learner.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {ageFromDOB(learner.dateOfBirth)} · DOB {formatDate(learner.dateOfBirth)} ·{' '}
                    {activeCount} active program{activeCount !== 1 ? 's' : ''} ·{' '}
                    {programs.length} total
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
