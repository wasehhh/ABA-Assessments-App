import { useState } from 'react';
import { Plus, Trash2, Download, Info } from 'lucide-react';

type ScoringType = 'numeric' | 'checkbox' | 'yesno' | 'text';

interface Target {
  target_id: string;
  title: string;
  description?: string;
  success_criteria: string;
  materials: string;
  examples?: string;
  instructions?: string;
  notes?: string;
  scoring: {
    type: ScoringType;
    scale?: number[];
    scale_labels?: Record<number, string>;
    checkbox_count?: number;
    no_opportunity_allowed: boolean;
  };
}

interface Domain {
  domain_id: string;
  title: string;
  description?: string;
  targets: Target[];
}

interface Props {
  onSave: (packData: any) => Promise<void>;
  onCancel: () => void;
  initialData?: any;
}


export function AssessmentBuilder({ onSave, onCancel, initialData }: Props) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [domains, setDomains] = useState<Domain[]>(initialData?.domains || []);
  const [defaultScale, setDefaultScale] = useState('0,1,2,3,4');
  const [globalScaleLabels, setGlobalScaleLabels] = useState<Record<number, string>>({});
  const [useGlobalScale, setUseGlobalScale] = useState(true);

  const addDomain = () => {
    // const newId = domains.length < 26 ? String.fromCharCode(65 + domains.length) : `D${domains.length + 1}`;
    setDomains([...domains, {
      domain_id: '',
      title: '',
      description: '',
      targets: []
    }]);
  };

  const removeDomain = (index: number) => {
    setDomains(domains.filter((_, i) => i !== index));
  };

  const updateDomain = (index: number, field: keyof Domain, value: any) => {
    const updated = [...domains];
    updated[index] = { ...updated[index], [field]: value };
    setDomains(updated);
  };

  const addTarget = (domainIndex: number) => {
    const domain = domains[domainIndex];
    const newTargetId = `${domain.domain_id}${domain.targets.length + 1}`;
    const updated = [...domains];

    const scale = defaultScale.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

    updated[domainIndex].targets.push({
      target_id: newTargetId,
      title: '',
      description: '',
      success_criteria: '',
      materials: '',
      examples: '',
      instructions: '',
      notes: '',
      scoring: {
        type: 'numeric',
        scale,
        scale_labels: {},
        no_opportunity_allowed: true
      }
    });
    setDomains(updated);
  };

  const removeTarget = (domainIndex: number, targetIndex: number) => {
    const updated = [...domains];
    updated[domainIndex].targets = updated[domainIndex].targets.filter((_, i) => i !== targetIndex);
    setDomains(updated);
  };

  const updateTarget = (domainIndex: number, targetIndex: number, field: keyof Target, value: any) => {
    const updated = [...domains];
    updated[domainIndex].targets[targetIndex] = {
      ...updated[domainIndex].targets[targetIndex],
      [field]: value
    };
    setDomains(updated);
  };

  const updateTargetScale = (domainIndex: number, targetIndex: number, scaleString: string) => {
    const scale = scaleString.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    const updated = [...domains];
    updated[domainIndex].targets[targetIndex].scoring = {
      ...updated[domainIndex].targets[targetIndex].scoring,
      scale
    };
    setDomains(updated);
  };

  const updateScoringType = (domainIndex: number, targetIndex: number, scoringType: ScoringType) => {
    const updated = [...domains];
    const target = updated[domainIndex].targets[targetIndex];

    target.scoring = {
      ...target.scoring,
      type: scoringType,
    };

    if (scoringType === 'checkbox') {
      target.scoring.task_steps = ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'];
      delete target.scoring.scale;
    } else if (scoringType === 'yesno' || scoringType === 'text') {
      delete target.scoring.scale;
      delete target.scoring.task_steps;
    } else {
      const scale = defaultScale.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      target.scoring.scale = scale;
      delete target.scoring.task_steps;
    }

    setDomains(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If using global scale, inject the labels into every target using logic
    let finalDomains = domains;
    if (useGlobalScale) {
      finalDomains = domains.map(d => ({
        ...d,
        targets: d.targets.map(t => ({
          ...t,
          scoring: {
            ...t.scoring,
            scale_labels: globalScaleLabels
          }
        }))
      }));
    }

    const packData = {
      pack_id: `custom_${Date.now()}`,
      title,
      description,
      version: '1.0',
      domains: finalDomains
    };
    await onSave(packData);
  };

  const downloadTemplate = () => {
    const csv = [
      'domain_id,domain_title,domain_description,target_id,title,description,success_criteria,materials,instructions,examples,notes',
      'A,"Cooperation, Reinforcer",Domain context optional,A1,Gross motor imitation,Looks at trainer; imitates posture,Independent for 8/10 trials,"Mirror, mat","Observe from beside learner; reinforce each trial",Eg: clap after model,Starter row',
      'A,,,A2,Attends reinforcer,Orients toward preferred stimuli,Orient within 3s for 80% probes,"Toys, reinforcers",Paired stimulus presentation,,',
      '# Quoted fields may contain commas. Empty domain_title on later rows reuses the title from the first row of that domain_id.',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assessment-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Build Custom Assessment</h2>
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm"
        >
          <Download className="w-4 h-4" />
          Download CSV Template
        </button>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-900">
          <p className="font-semibold mb-1">Assessment Builder</p>
          <p>Create custom assessments for therapy. Add domains, targets, and define your scoring system.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g., Custom ABA Assessment"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="Brief description of the assessment"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="useGlobalScale"
              checked={useGlobalScale}
              onChange={(e) => setUseGlobalScale(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="useGlobalScale" className="text-sm font-medium text-gray-700">
              Use same scoring scale for all targets
            </label>
          </div>
          {useGlobalScale && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Scoring Scale</label>
              <input
                type="text"
                value={defaultScale}
                onChange={(e) => setDefaultScale(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., 0,1,2,3,4 or 0,0.5,1 or 0,1,2"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated numbers for your scoring system</p>

              <div className="mt-4 space-y-2 pl-4 border-l-2 border-gray-100">
                <label className="block text-sm font-medium text-gray-700">Score Criteria Definitions</label>
                <p className="text-xs text-gray-500 mb-2">Define what each score means (e.g. 4 = Independent)</p>
                {defaultScale.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)).map((scoreValue) => (
                  <div key={scoreValue} className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700 w-8">{scoreValue} =</span>
                    <input
                      type="text"
                      value={globalScaleLabels[scoreValue] || ''}
                      onChange={(e) => setGlobalScaleLabels(prev => ({ ...prev, [scoreValue]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                      placeholder={`Definition for score ${scoreValue}`}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
          {!useGlobalScale && (
            <p className="text-sm text-gray-600">You can customize the scoring scale for each target individually below</p>
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Domains & Targets</h3>
          <button
            type="button"
            onClick={addDomain}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Domain
          </button>
        </div>

        <div className="space-y-6">
          {domains.map((domain, dIndex) => (
            <div key={dIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Domain ID</label>
                      <input
                        type="text"
                        value={domain.domain_id}
                        onChange={(e) => updateDomain(dIndex, 'domain_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="A"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Domain Title</label>
                      <input
                        type="text"
                        value={domain.title}
                        onChange={(e) => updateDomain(dIndex, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="e.g., Receptive Language"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Domain Description (Optional)</label>
                    <input
                      type="text"
                      value={domain.description || ''}
                      onChange={(e) => updateDomain(dIndex, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="Brief description of this skill domain"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeDomain(dIndex)}
                  className="text-red-600 hover:text-red-700 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="ml-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">Targets</h4>
                  <button
                    type="button"
                    onClick={() => addTarget(dIndex)}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    Add Target
                  </button>
                </div>

                {domain.targets.map((target, tIndex) => (
                  <div key={tIndex} className="bg-white rounded p-3 border border-gray-200">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Target ID</label>
                            <input
                              type="text"
                              value={target.target_id}
                              onChange={(e) => updateTarget(dIndex, tIndex, 'target_id', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="A1"
                              required
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-xs text-gray-600 mb-1">Target Title</label>
                            <input
                              type="text"
                              value={target.title}
                              onChange={(e) => updateTarget(dIndex, tIndex, 'title', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="e.g., Follows one-step instructions"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Description</label>
                          <input
                            type="text"
                            value={target.description || ''}
                            onChange={(e) => updateTarget(dIndex, tIndex, 'description', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="What skill or competency this target is assessing."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Success Criteria</label>
                          <input
                            type="text"
                            value={target.success_criteria}
                            onChange={(e) => updateTarget(dIndex, tIndex, 'success_criteria', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="e.g., 80% accuracy across 3 sessions"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Materials Needed</label>
                          <input
                            type="text"
                            value={target.materials}
                            onChange={(e) => updateTarget(dIndex, tIndex, 'materials', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="e.g., Picture cards, blocks"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Examples (Optional)</label>
                            <textarea
                              value={target.examples || ''}
                              onChange={(e) => updateTarget(dIndex, tIndex, 'examples', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="e.g., 'Touch car'"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Instructions (Optional)</label>
                            <textarea
                              value={target.instructions || ''}
                              onChange={(e) => updateTarget(dIndex, tIndex, 'instructions', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="e.g., Sit across from learner..."
                              rows={2}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Notes (Optional)</label>
                          <input
                            type="text"
                            value={target.notes || ''}
                            onChange={(e) => updateTarget(dIndex, tIndex, 'notes', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="Additional information or considerations"
                          />
                        </div>
                        {!useGlobalScale && (
                          <>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Scoring Type</label>
                              <select
                                value={target.scoring.type}
                                onChange={(e) => updateScoringType(dIndex, tIndex, e.target.value as ScoringType)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="numeric">Numeric Scale (e.g., 0-4)</option>
                                <option value="checkbox">Task Analysis (Chaining)</option>
                                <option value="yesno">Yes/No</option>
                                <option value="text">Text Input</option>
                              </select>
                            </div>
                            {target.scoring.type === 'numeric' && (
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Numeric Scale</label>
                                <input
                                  type="text"
                                  value={target.scoring.scale?.join(',') || ''}
                                  onChange={(e) => updateTargetScale(dIndex, tIndex, e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  placeholder="e.g., 0,1,2,3,4"
                                />
                                <p className="text-xs text-gray-500 mt-0.5">Comma-separated numbers</p>

                                <div className="mt-3 space-y-2">
                                  <label className="block text-xs text-gray-600 font-medium">Score Criteria Definitions (Optional)</label>
                                  {target.scoring.scale?.map((scoreValue) => (
                                    <div key={scoreValue} className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-gray-700 w-6">{scoreValue} =</span>
                                      <input
                                        type="text"
                                        value={target.scoring.scale_labels?.[scoreValue] || ''}
                                        onChange={(e) => {
                                          const updated = [...domains];
                                          const currentLabels = target.scoring.scale_labels || {};
                                          updated[dIndex].targets[tIndex].scoring.scale_labels = {
                                            ...currentLabels,
                                            [scoreValue]: e.target.value
                                          };
                                          setDomains(updated);
                                        }}
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                        placeholder={`Criteria for score ${scoreValue}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {target.scoring.type === 'checkbox' && (
                              <div className="space-y-3">
                                <label className="block text-xs text-gray-600 font-medium">Task Analysis Steps</label>
                                <p className="text-xs text-gray-500 mb-2">Define the specific steps in the chain (e.g. "Turn on water", "Wet hands")</p>

                                {(!target.scoring.task_steps || target.scoring.task_steps.length === 0) ? (
                                  // Initialize if empty
                                  (() => {
                                    const updated = [...domains];
                                    updated[dIndex].targets[tIndex].scoring.task_steps = [''];
                                    // We can't set state during render, so show a button to init or handle it in the parent selection logic
                                    // Better: handled in updateScoringType. For now, defensive UI:
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...domains];
                                          updated[dIndex].targets[tIndex].scoring.task_steps = ['Step 1'];
                                          setDomains(updated);
                                        }}
                                        className="text-xs text-emerald-600 underline"
                                      >
                                        Initialize Steps
                                      </button>
                                    );
                                  })()
                                ) : (
                                  <div className="space-y-2">
                                    {target.scoring.task_steps.map((step, sIndex) => (
                                      <div key={sIndex} className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 w-4">{sIndex + 1}.</span>
                                        <input
                                          type="text"
                                          value={step}
                                          onChange={(e) => {
                                            const updated = [...domains];
                                            // Ensure array exists
                                            if (!updated[dIndex].targets[tIndex].scoring.task_steps) {
                                              updated[dIndex].targets[tIndex].scoring.task_steps = [];
                                            }
                                            updated[dIndex].targets[tIndex].scoring.task_steps![sIndex] = e.target.value;
                                            setDomains(updated);
                                          }}
                                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                          placeholder={`Step ${sIndex + 1}`}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...domains];
                                            updated[dIndex].targets[tIndex].scoring.task_steps =
                                              updated[dIndex].targets[tIndex].scoring.task_steps!.filter((_, i) => i !== sIndex);
                                            setDomains(updated);
                                          }}
                                          className="text-gray-400 hover:text-red-600"
                                          disabled={target.scoring.task_steps!.length <= 1}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...domains];
                                        if (!updated[dIndex].targets[tIndex].scoring.task_steps) {
                                          updated[dIndex].targets[tIndex].scoring.task_steps = [];
                                        }
                                        updated[dIndex].targets[tIndex].scoring.task_steps!.push('');
                                        setDomains(updated);
                                      }}
                                      className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs mt-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add Step
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTarget(dIndex, tIndex)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {domains.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            Click "Add Domain" to start building your assessment
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={domains.length === 0}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2.5 rounded-lg font-medium"
        >
          Save Assessment Pack
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2.5 rounded-lg font-medium"
        >
          Cancel
        </button>
      </div>
    </form >
  );
}
