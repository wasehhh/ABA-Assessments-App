import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getProgram,
  getTargetsByProgram,
  getAssessmentLinkByProgram,
  getDataPointsByProgramTargets,
  getLearner,
} from '@/services';
import type { Program, Target, AssessmentLink, Learner, DataPoint } from '@/types';
import { ProgramStatusBadge, TargetStatusBadge } from '@/components/StatusBadge';
import { Loading, EmptyState } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { BackLink } from '@/components/BackLink';
import { formatDate } from '@/lib/date';
import { promptLevelColor } from '@/lib/promptLevels';
import { checkPercentageMastery } from '@/lib/mastery';
import { Pencil, BarChart3, Plus } from 'lucide-react';

export function ProgramDetail() {
  const { programId } = useParams<{ programId: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [assessmentLink, setAssessmentLink] = useState<AssessmentLink | null>(null);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!programId) return;
    (async () => {
      const p = await getProgram(programId);
      setProgram(p ?? null);
      if (p) {
        const l = await getLearner(p.learnerId);
        setLearner(l ?? null);
        const ts = await getTargetsByProgram(p.id);
        setTargets(ts);
        const al = await getAssessmentLinkByProgram(p.id);
        setAssessmentLink(al ?? null);
        const dps = await getDataPointsByProgramTargets(ts.map((t) => t.id));
        setDataPoints(dps);
      }
      setLoading(false);
    })();
  }, [programId]);

  if (loading) return <Loading />;
  if (!program) return <EmptyState title="Program not found" />;

  return (
    <div>
      <PageHeader
        title={program.title}
        subtitle={learner ? `${learner.name} · ${program.dataType}` : program.dataType}
        back={
          learner ? (
            <BackLink to={`/learners/${learner.id}`} label={learner.name} />
          ) : (
            <BackLink to="/" label="Learners" />
          )
        }
        actions={
          <>
            <Link to={`/programs/${program.id}/edit`} className="btn-secondary">
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <Link to={`/graphs?programId=${program.id}`} className="btn-secondary">
              <BarChart3 className="h-4 w-4" /> Graphs
            </Link>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <ProgramStatusBadge status={program.status} />
      </div>

      {/* Program fields */}
      <div className="card mb-6 p-5">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-gray-400">Rationale</dt>
            <dd className="mt-1 text-sm text-gray-700">{program.rationale}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-gray-400">Goal</dt>
            <dd className="mt-1 text-sm text-gray-700">{program.goal}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-gray-400">Instructions</dt>
            <dd className="mt-1 text-sm text-gray-700">{program.instructions}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-gray-400">Data Type</dt>
            <dd className="mt-1 text-sm text-gray-700">{program.dataType}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-gray-400">Mastery Rule</dt>
            <dd className="mt-1 text-sm text-gray-700">{program.masteryRule}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-gray-400">Prompt Scheme</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {program.promptScheme.map((level, i) => (
                <span
                  key={level}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${promptLevelColor(level)}`}
                >
                  {i + 1}. {level}
                </span>
              ))}
            </dd>
          </div>
          {program.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-gray-400">Notes</dt>
              <dd className="mt-1 text-sm text-gray-700">{program.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Assessment bridge panel */}
      <div className="card mb-6 border-l-4 border-l-accent-400 p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Assessment Evidence</h2>
        {assessmentLink ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-gray-400">Assessment</dt>
              <dd className="mt-1 text-sm text-gray-700">{assessmentLink.assessmentName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-gray-400">Item</dt>
              <dd className="mt-1 text-sm text-gray-700">
                {assessmentLink.itemCode} — {assessmentLink.itemDescription}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-gray-400">Score at Link</dt>
              <dd className="mt-1 text-sm text-gray-700">{assessmentLink.scoreAtLink}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-gray-400">Linked Date</dt>
              <dd className="mt-1 text-sm text-gray-700">{formatDate(assessmentLink.linkedDate)}</dd>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No assessment item linked to this program.
          </p>
        )}
      </div>

      {/* Targets */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Targets ({targets.length})
          </h2>
        </div>
        {targets.length === 0 ? (
          <EmptyState title="No targets yet" message="Edit this program to add targets." />
        ) : (
          <div className="card divide-y divide-gray-100">
            {targets.map((target) => {
              const targetData = dataPoints.filter((d) => d.targetId === target.id);
              const mastery = checkPercentageMastery(targetData, program.masteryRule);
              return (
                <div key={target.id} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400">
                          #{target.order}
                        </span>
                        <span className="font-medium text-gray-900">{target.name}</span>
                        <TargetStatusBadge status={target.status} />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{target.definition}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className={`rounded px-1.5 py-0.5 font-medium ${promptLevelColor(target.promptLevel)}`}>
                          {target.promptLevel}
                        </span>
                        {target.examples.length > 0 && (
                          <span>Examples: {target.examples.join(', ')}</span>
                        )}
                        {target.materials.length > 0 && (
                          <span>Materials: {target.materials.join(', ')}</span>
                        )}
                      </div>
                      {targetData.length > 0 && (
                        <div className="mt-2 text-xs text-gray-400">
                          {targetData.length} data points · last {targetData[targetData.length - 1]?.value}% ·{' '}
                          streak: {mastery.currentStreak}/{mastery.requiredSessions}
                          {mastery.met && (
                            <span className="ml-1 font-medium text-green-600">— mastery met</span>
                          )}
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/graphs?targetId=${target.id}`}
                      className="ml-4 text-xs font-medium text-accent-600 hover:underline"
                    >
                      View graph
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
