import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { getLearners, getProgram, getTargetsByProgram, getLearner } from '@/services';
import type {
  Program,
  Target,
  DataType,
  PromptLevel,
  Learner,
  ProgramStatus,
  TargetStatus,
} from '@/types';
import { Loading, EmptyState } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { BackLink } from '@/components/BackLink';
import { PROMPT_LEVEL_ORDER, promptLevelColor } from '@/lib/promptLevels';
import { ChevronLeft, Plus, Trash2, Check } from 'lucide-react';

const STEPS = ['Program Details', 'Targets', 'Review'] as const;

const DATA_TYPES: DataType[] = [
  'trial-by-trial',
  'frequency',
  'duration',
  'percentage/probe',
  'task-analysis',
];

// Measurement options that change based on dataType
const dataTypeMeasurements: Record<DataType, string[]> = {
  'trial-by-trial': ['Per-trial result (correct/incorrect/prompted)', 'Prompt level per trial'],
  frequency: ['Count per session', 'Timestamp each occurrence'],
  duration: ['Total duration (seconds)', 'Start/stop timing'],
  'percentage/probe': ['Probe trials scored correct/incorrect', 'Percentage of correct probes'],
  'task-analysis': ['Steps completed independently', 'Per-step scoring'],
};

export function ProgramBuilder() {
  const { programId } = useParams<{ programId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(programId);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [learners, setLearners] = useState<Learner[]>([]);

  // Program form state
  const [form, setForm] = useState({
    learnerId: searchParams.get('learnerId') ?? '',
    title: '',
    rationale: '',
    goal: '',
    instructions: '',
    dataType: 'trial-by-trial' as DataType,
    promptScheme: [...PROMPT_LEVEL_ORDER] as PromptLevel[],
    masteryRule: '80% independent across 3 consecutive sessions',
    status: 'draft' as ProgramStatus,
    notes: '',
    assessmentLinkId: null as string | null,
  });

  // Targets
  const [targets, setTargets] = useState<Target[]>([]);

  useEffect(() => {
    (async () => {
      const ls = await getLearners();
      setLearners(ls);
      if (isEdit && programId) {
        const p = await getProgram(programId);
        if (p) {
          setForm({
            learnerId: p.learnerId,
            title: p.title,
            rationale: p.rationale,
            goal: p.goal,
            instructions: p.instructions,
            dataType: p.dataType,
            promptScheme: p.promptScheme,
            masteryRule: p.masteryRule,
            status: p.status,
            notes: p.notes,
            assessmentLinkId: p.assessmentLinkId,
          });
          const ts = await getTargetsByProgram(programId);
          setTargets(ts);
        }
      }
      setLoading(false);
    })();
  }, [programId, isEdit]);

  if (loading) return <Loading />;

  const learner = learners.find((l) => l.id === form.learnerId);

  const togglePromptLevel = (level: PromptLevel) => {
    setForm((f) => {
      const has = f.promptScheme.includes(level);
      const scheme = has
        ? f.promptScheme.filter((l) => l !== level)
        : [...f.promptScheme, level];
      // Re-sort by standard order
      scheme.sort(
        (a, b) => PROMPT_LEVEL_ORDER.indexOf(a) - PROMPT_LEVEL_ORDER.indexOf(b),
      );
      return { ...f, promptScheme: scheme };
    });
  };

  const addTarget = () => {
    setTargets((ts) => [
      ...ts,
      {
        id: `tgt-new-${Date.now()}`,
        programId: programId ?? 'temp',
        name: '',
        definition: '',
        status: 'active' as TargetStatus,
        order: ts.length + 1,
        examples: [],
        materials: [],
        promptLevel: 'Independent',
      },
    ]);
  };

  const updateTarget = (idx: number, updates: Partial<Target>) => {
    setTargets((ts) => ts.map((t, i) => (i === idx ? { ...t, ...updates } : t)));
  };

  const removeTarget = (idx: number) => {
    setTargets((ts) => ts.filter((_, i) => i !== idx).map((t, i) => ({ ...t, order: i + 1 })));
  };

  const canProceed = step === 0
    ? form.learnerId && form.title && form.goal
    : step === 1
    ? true
    : true;

  const handleSave = () => {
    // Prototype: no persistence — navigate back
    const redirectId = programId ?? 'new';
    if (learner) {
      navigate(`/learners/${learner.id}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Program' : 'New Program'}
        subtitle={learner ? `for ${learner.name}` : undefined}
        back={
          learner ? (
            <BackLink to={`/learners/${learner.id}`} label={learner.name} />
          ) : (
            <BackLink to="/" label="Learners" />
          )
        }
      />

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i < step
                  ? 'bg-green-100 text-green-700'
                  : i === step
                  ? 'bg-accent-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-sm ${
                i === step ? 'font-medium text-gray-900' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 text-gray-300">—</span>}
          </div>
        ))}
      </div>

      {/* Step 0: Program Details */}
      {step === 0 && (
        <div className="card max-w-3xl space-y-4 p-5">
          <div>
            <label className="label">Learner</label>
            <select
              className="input"
              value={form.learnerId}
              onChange={(e) => setForm({ ...form, learnerId: e.target.value })}
              disabled={isEdit}
            >
              <option value="">Select a learner…</option>
              {learners.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Program Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Manding — Requesting Preferred Items"
            />
          </div>

          <div>
            <label className="label">Rationale</label>
            <textarea
              className="input min-h-[80px]"
              value={form.rationale}
              onChange={(e) => setForm({ ...form, rationale: e.target.value })}
              placeholder="Why this program exists and what it addresses…"
            />
          </div>

          <div>
            <label className="label">Goal</label>
            <textarea
              className="input min-h-[60px]"
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="The target outcome for this program…"
            />
          </div>

          <div>
            <label className="label">Instructions</label>
            <textarea
              className="input min-h-[100px]"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="Step-by-step instructions for running this program…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Data Type</label>
              <select
                className="input"
                value={form.dataType}
                onChange={(e) => setForm({ ...form, dataType: e.target.value as DataType })}
              >
                {DATA_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
              {/* Measurement options change based on dataType */}
              <div className="mt-2 rounded-md bg-gray-50 p-2">
                <p className="text-xs font-medium text-gray-500">Measurement for this type:</p>
                <ul className="mt-1 space-y-0.5">
                  {dataTypeMeasurements[form.dataType].map((m) => (
                    <li key={m} className="text-xs text-gray-600">
                      · {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProgramStatus })}
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="on-hold">on-hold</option>
                <option value="completed">completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Prompt Scheme (most-to-least intrusive)</label>
            <div className="flex flex-wrap gap-2">
              {PROMPT_LEVEL_ORDER.map((level) => {
                const selected = form.promptScheme.includes(level);
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => togglePromptLevel(level)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? `border-transparent ${promptLevelColor(level)}`
                        : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Selected: {form.promptScheme.join(' → ')}
            </p>
          </div>

          <div>
            <label className="label">Mastery Rule</label>
            <input
              className="input"
              value={form.masteryRule}
              onChange={(e) => setForm({ ...form, masteryRule: e.target.value })}
              placeholder="e.g. 80% independent across 3 consecutive sessions"
            />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input min-h-[60px]"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Step 1: Targets */}
      {step === 1 && (
        <div className="max-w-3xl space-y-3">
          {targets.length === 0 && (
            <EmptyState
              title="No targets yet"
              message="Add the discrete skills you'll teach within this program."
              action={
                <button onClick={addTarget} className="btn-primary">
                  <Plus className="h-4 w-4" /> Add Target
                </button>
              }
            />
          )}
          {targets.map((target, idx) => (
            <div key={target.id} className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Target #{idx + 1}</span>
                <button
                  onClick={() => removeTarget(idx)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="label">Name</label>
                  <input
                    className="input"
                    value={target.name}
                    onChange={(e) => updateTarget(idx, { name: e.target.value })}
                    placeholder="e.g. Mand — juice"
                  />
                </div>
                <div>
                  <label className="label">Definition</label>
                  <textarea
                    className="input min-h-[60px]"
                    value={target.definition}
                    onChange={(e) => updateTarget(idx, { definition: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Status</label>
                    <select
                      className="input"
                      value={target.status}
                      onChange={(e) =>
                        updateTarget(idx, { status: e.target.value as TargetStatus })
                      }
                    >
                      <option value="active">active</option>
                      <option value="on-hold">on-hold</option>
                      <option value="mastered">mastered</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Prompt Level</label>
                    <select
                      className="input"
                      value={target.promptLevel}
                      onChange={(e) =>
                        updateTarget(idx, { promptLevel: e.target.value as PromptLevel })
                      }
                    >
                      {PROMPT_LEVEL_ORDER.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Examples (comma-separated)</label>
                  <input
                    className="input"
                    value={target.examples.join(', ')}
                    onChange={(e) =>
                      updateTarget(idx, {
                        examples: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label">Materials (comma-separated)</label>
                  <input
                    className="input"
                    value={target.materials.join(', ')}
                    onChange={(e) =>
                      updateTarget(idx, {
                        materials: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          {targets.length > 0 && (
            <button onClick={addTarget} className="btn-secondary">
              <Plus className="h-4 w-4" /> Add Another Target
            </button>
          )}
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <div className="max-w-3xl space-y-4">
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Program Summary</h3>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-400">Learner</dt>
                <dd className="text-sm text-gray-700">
                  {learners.find((l) => l.id === form.learnerId)?.name ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Title</dt>
                <dd className="text-sm text-gray-700">{form.title || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Data Type</dt>
                <dd className="text-sm text-gray-700">{form.dataType}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Status</dt>
                <dd className="text-sm text-gray-700">{form.status}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-400">Mastery Rule</dt>
                <dd className="text-sm text-gray-700">{form.masteryRule}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-400">Prompt Scheme</dt>
                <dd className="text-sm text-gray-700">{form.promptScheme.join(' → ')}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Targets ({targets.length})
            </h3>
            {targets.length === 0 ? (
              <p className="text-sm text-gray-400">No targets defined.</p>
            ) : (
              <ol className="space-y-2">
                {targets.map((t, i) => (
                  <li key={t.id} className="text-sm text-gray-700">
                    {i + 1}. {t.name || '(unnamed)'} — {t.status} · {t.promptLevel}
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-800">
              Prototype note: programs are not persisted. This form demonstrates the builder flow.
              In production, saving will write to the database.
            </p>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : navigate(-1))}
          className="btn-ghost"
        >
          <ChevronLeft className="h-4 w-4" />
          {step > 0 ? 'Back' : 'Cancel'}
        </button>
        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="btn-primary"
            >
              Next
            </button>
          ) : (
            <button onClick={handleSave} className="btn-primary">
              <Check className="h-4 w-4" /> Save Program
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
