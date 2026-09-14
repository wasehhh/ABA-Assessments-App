import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getLearner,
  getProgramsByLearner,
  getAssessmentLinksByLearner,
  getTargetsByProgram,
  getSessionsByLearner,
} from '@/services';
import type { Learner, Program, AssessmentLink, Target, Session } from '@/types';
import { LearnerStatusBadge, ProgramStatusBadge } from '@/components/StatusBadge';
import { Loading, EmptyState } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { BackLink } from '@/components/BackLink';
import { ageFromDOB, formatDate, formatDateTime, durationBetween } from '@/lib/date';
import { Plus, ClipboardList } from 'lucide-react';

const STATUS_ORDER: Record<string, number> = {
  active: 0,
  'on-hold': 1,
  draft: 2,
  completed: 3,
};

export function LearnerDetail() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const [learner, setLearner] = useState<Learner | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [assessmentLinks, setAssessmentLinks] = useState<AssessmentLink[]>([]);
  const [targetsByProgram, setTargetsByProgram] = useState<Record<string, Target[]>>({});
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!learnerId) return;
    (async () => {
      const l = await getLearner(learnerId);
      setLearner(l ?? null);
      const ps = await getProgramsByLearner(learnerId);
      setPrograms(ps);
      const al = await getAssessmentLinksByLearner(learnerId);
      setAssessmentLinks(al);
      const tbp: Record<string, Target[]> = {};
      for (const p of ps) {
        tbp[p.id] = await getTargetsByProgram(p.id);
      }
      setTargetsByProgram(tbp);
      const ss = await getSessionsByLearner(learnerId);
      setSessions(ss);
      setLoading(false);
    })();
  }, [learnerId]);

  if (loading) return <Loading />;
  if (!learner) return <EmptyState title="Learner not found" />;

  const sortedPrograms = [...programs].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99),
  );

  // Group programs by status
  const grouped = sortedPrograms.reduce<Record<string, Program[]>>((acc, p) => {
    (acc[p.status] ??= []).push(p);
    return acc;
  }, {});

  // Assessment bridge: which assessment items have programs, which don't
  const linkedProgramIds = new Set(assessmentLinks.map((a) => a.programId));

  return (
    <div>
      <PageHeader
        title={learner.name}
        subtitle={`${ageFromDOB(learner.dateOfBirth)} · DOB ${formatDate(learner.dateOfBirth)}`}
        back={<BackLink to="/" label="Learners" />}
        actions={
          <>
            <Link to={`/programs/new?learnerId=${learner.id}`} className="btn-secondary">
              <Plus className="h-4 w-4" /> New Program
            </Link>
            <Link to={`/sessions/new?learnerId=${learner.id}`} className="btn-primary">
              <ClipboardList className="h-4 w-4" /> Start Session
            </Link>
          </>
        }
      />

      <div className="mb-2 flex items-center gap-2">
        <LearnerStatusBadge status={learner.status} />
      </div>

      {/* Assessment bridge panel */}
      <div className="card mb-6 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Assessment Bridge</h2>
        <p className="mb-3 text-xs text-gray-500">
          Programs linked to assessment items. This app references assessments only — it does not own them.
        </p>
        {assessmentLinks.length === 0 ? (
          <p className="text-sm text-gray-400">No assessment links for this learner.</p>
        ) : (
          <div className="space-y-2">
            {assessmentLinks.map((al) => {
              const program = programs.find((p) => p.id === al.programId);
              return (
                <div
                  key={al.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {al.assessmentName} — {al.itemCode}
                      </span>
                      <span className="rounded bg-accent-50 px-1.5 py-0.5 text-xs text-accent-700">
                        {al.scoreAtLink}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{al.itemDescription}</p>
                  </div>
                  <div className="text-right">
                    {program ? (
                      <Link
                        to={`/programs/${program.id}`}
                        className="text-xs font-medium text-accent-600 hover:underline"
                      >
                        {program.title}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">Program not found</span>
                    )}
                    <p className="text-xs text-gray-400">Linked {formatDate(al.linkedDate)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Programs grouped by status */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([status, ps]) => (
          <div key={status}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <ProgramStatusBadge status={status} />
              <span className="text-gray-400">({ps.length})</span>
            </h2>
            <div className="grid gap-3">
              {ps.map((program) => {
                const pTargets = targetsByProgram[program.id] ?? [];
                const hasAssessment = linkedProgramIds.has(program.id);
                return (
                  <Link
                    key={program.id}
                    to={`/programs/${program.id}`}
                    className="card p-4 hover:border-accent-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{program.title}</span>
                          {hasAssessment && (
                            <span className="rounded bg-accent-50 px-1.5 py-0.5 text-xs text-accent-700">
                              Assessment linked
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {program.dataType} · {pTargets.length} target
                          {pTargets.length !== 1 ? 's' : ''}
                          {pTargets.filter((t) => t.status === 'active').length > 0 &&
                            ` · ${pTargets.filter((t) => t.status === 'active').length} active`}
                          {pTargets.filter((t) => t.status === 'mastered').length > 0 &&
                            ` · ${pTargets.filter((t) => t.status === 'mastered').length} mastered`}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions recorded.</p>
        ) : (
          <div className="card divide-y divide-gray-100">
            {sessions.slice(0, 8).map((s) => (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDateTime(s.startedAt)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.therapistName}
                    {s.endedAt && ` · ${durationBetween(s.startedAt, s.endedAt)}`}
                    {s.corrections && s.corrections.length > 0 && (
                      <span className="ml-2 text-amber-600">· corrected</span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{s.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
