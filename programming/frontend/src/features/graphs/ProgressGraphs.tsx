import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getLearners,
  getPrograms,
  getTargets,
  getDataPointsByTarget,
} from '@/services';
import type { Learner, Program, Target, DataPoint } from '@/types';
import { Loading, EmptyState } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { parseMasteryRule, calculateTrend } from '@/lib/mastery';
import { formatDateShort } from '@/lib/date';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';

const PHASE_COLORS: Record<string, string> = {
  baseline: '#e5e7eb',
  intervention: '#dbeafe',
  mastery: '#d1fae5',
  generalization: '#fef3c7',
};

export function ProgressGraphs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedLearnerId = searchParams.get('learnerId') ?? '';
  const selectedProgramId = searchParams.get('programId') ?? '';
  const selectedTargetId = searchParams.get('targetId') ?? '';

  useEffect(() => {
    (async () => {
      const ls = await getLearners();
      setLearners(ls);
      const ps = await getPrograms();
      setPrograms(ps);
      const ts = await getTargets();
      setTargets(ts);
      // Load all data points
      for (const t of ts) {
        const dps = await getDataPointsByTarget(t.id);
        setDataPoints((prev) => [...prev, ...dps]);
      }
      setLoading(false);
    })();
  }, []);

  // Filter programs by selected learner
  const filteredPrograms = useMemo(
    () => (selectedLearnerId ? programs.filter((p) => p.learnerId === selectedLearnerId) : programs),
    [programs, selectedLearnerId],
  );

  // Filter targets by selected program
  const filteredTargets = useMemo(
    () => (selectedProgramId ? targets.filter((t) => t.programId === selectedProgramId) : targets),
    [targets, selectedProgramId],
  );

  // Auto-select first target when program changes
  useEffect(() => {
    if (selectedProgramId && filteredTargets.length > 0 && !selectedTargetId) {
      setSearchParams((prev) => {
        prev.set('targetId', filteredTargets[0].id);
        return prev;
      });
    }
  }, [selectedProgramId, filteredTargets, selectedTargetId, setSearchParams]);

  // Get the selected target's data
  const selectedTarget = targets.find((t) => t.id === selectedTargetId);
  const selectedProgram = programs.find((p) => p.id === selectedTarget?.programId);
  const selectedLearner = learners.find((l) => l.id === selectedProgram?.learnerId);

  const targetData = useMemo(
    () =>
      dataPoints
        .filter((d) => d.targetId === selectedTargetId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [dataPoints, selectedTargetId],
  );

  // Build chart data with phase transitions
  const chartData = useMemo(() => {
    return targetData.map((d) => ({
      date: formatDateShort(d.date),
      value: d.value,
      phase: d.phase,
      rawDate: d.date,
    }));
  }, [targetData]);

  // Detect phase changes for vertical markers
  const phaseChanges = useMemo(() => {
    const changes: { date: string; phase: string; index: number }[] = [];
    for (let i = 1; i < targetData.length; i++) {
      if (targetData[i].phase !== targetData[i - 1].phase) {
        changes.push({
          date: formatDateShort(targetData[i].date),
          phase: targetData[i].phase,
          index: i,
        });
      }
    }
    return changes;
  }, [targetData]);

  // Mastery threshold from program
  const masteryThreshold = selectedProgram
    ? parseMasteryRule(selectedProgram.masteryRule).threshold
    : 80;

  // Trend
  const trend = useMemo(() => calculateTrend(targetData.map((d) => d.value)), [targetData]);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Progress Graphs"
        subtitle="Clinical data per target with mastery criterion and phase markers."
      />

      {/* Filters */}
      <div className="card mb-6 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Learner</label>
            <select
              className="input"
              value={selectedLearnerId}
              onChange={(e) => {
                setSearchParams((prev) => {
                  prev.set('learnerId', e.target.value);
                  prev.delete('programId');
                  prev.delete('targetId');
                  return prev;
                });
              }}
            >
              <option value="">All learners</option>
              {learners.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Program</label>
            <select
              className="input"
              value={selectedProgramId}
              onChange={(e) => {
                setSearchParams((prev) => {
                  prev.set('programId', e.target.value);
                  prev.delete('targetId');
                  return prev;
                });
              }}
            >
              <option value="">All programs</option>
              {filteredPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Target</label>
            <select
              className="input"
              value={selectedTargetId}
              onChange={(e) => {
                setSearchParams((prev) => {
                  prev.set('targetId', e.target.value);
                  return prev;
                });
              }}
            >
              <option value="">Select a target…</option>
              {filteredTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedTarget ? (
        <EmptyState
          title="Select a target"
          message="Choose a learner, program, and target to view progress data."
        />
      ) : targetData.length === 0 ? (
        <EmptyState
          title="No data points"
          message="This target has no recorded session data yet."
        />
      ) : (
        <div className="card p-6">
          {/* Graph header */}
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedTarget.name}</h2>
              <p className="text-sm text-gray-500">
                {selectedLearner?.name} · {selectedProgram?.title}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Mastery rule: {selectedProgram?.masteryRule} · Trend:{' '}
                {trend > 0.5 ? '↗ improving' : trend < -0.5 ? '↘ declining' : '→ stable'}
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              {Object.entries(PHASE_COLORS).map(([phase, color]) => (
                <div key={phase} className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded" style={{ background: color }} />
                  <span className="text-gray-500">{phase}</span>
                </div>
              ))}
            </div>
          </div>

          {/* The graph */}
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

                {/* Phase background areas */}
                {targetData.map((d, i) => {
                  if (i === 0 || d.phase !== targetData[i - 1].phase) {
                    // Find end of this phase
                    let endIdx = i;
                    while (endIdx < targetData.length - 1 && targetData[endIdx + 1].phase === d.phase) {
                      endIdx++;
                    }
                    const startX = i === 0 ? 0 : i - 0.5;
                    const endX = endIdx === targetData.length - 1 ? targetData.length - 1 : endIdx + 0.5;
                    return (
                      <ReferenceArea
                        key={`phase-${i}`}
                        x1={chartData[Math.round(startX)]?.date}
                        x2={chartData[Math.round(endX)]?.date}
                        fill={PHASE_COLORS[d.phase] ?? '#f9fafb'}
                        fillOpacity={0.5}
                      />
                    );
                  }
                  return null;
                })}

                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  label={{
                    value: '% Independent',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: '#6b7280' },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                  }}
                  formatter={(value) => [`${value}%`, 'Independent']}
                />

                {/* Mastery criterion line */}
                <ReferenceLine
                  y={masteryThreshold}
                  stroke="#16a34a"
                  strokeDasharray="6 3"
                  label={{
                    value: `Mastery (${masteryThreshold}%)`,
                    position: 'right',
                    fill: '#16a34a',
                    fontSize: 10,
                  }}
                />

                {/* Phase change vertical markers */}
                {phaseChanges.map((change) => (
                  <ReferenceLine
                    key={`change-${change.index}`}
                    x={change.date}
                    stroke="#9ca3af"
                    strokeDasharray="3 3"
                    label={{
                      value: change.phase,
                      position: 'top',
                      fill: '#6b7280',
                      fontSize: 10,
                    }}
                  />
                ))}

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0c8ef0"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#0c8ef0' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Data table */}
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Data Points</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Phase</th>
                    <th className="py-2 pr-4 font-medium">% Independent</th>
                    <th className="py-2 pr-4 font-medium">Session</th>
                  </tr>
                </thead>
                <tbody>
                  {targetData.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50">
                      <td className="py-2 pr-4 text-gray-700">{formatDateShort(d.date)}</td>
                      <td className="py-2 pr-4">
                        <span
                          className="rounded px-1.5 py-0.5 text-xs"
                          style={{
                            background: PHASE_COLORS[d.phase] ?? '#f3f4f6',
                            color: '#374151',
                          }}
                        >
                          {d.phase}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-medium text-gray-900">{d.value}%</td>
                      <td className="py-2 pr-4 text-xs text-gray-400">{d.sessionId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
