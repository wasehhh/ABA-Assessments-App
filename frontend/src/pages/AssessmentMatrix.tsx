
import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { assessmentService } from '../services/assessments';
import { analyticsService } from '../services/analytics';
import { buildDomainProfiles } from '../services/domainProfile';
import { clientService } from '../services/clients';
import { Save, ArrowLeft, Calendar, FileText, Download, CheckCircle, Activity, BarChart2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { auditService } from '../services/audit';
import { AssessmentOverview } from '../components/assessment/AssessmentOverview';
import { DomainScoreboard } from '../components/assessment/DomainScoreboard';
import { TargetDetailModal } from '../components/assessment/TargetDetailModal';
import { canEditAssessmentScores } from '../utils/assessmentScoreEditRules';

function cannotSubmitAssessmentState(assessment: { status: string }, viewingCycle: { status: string } | undefined) {
  const cycleLocked = viewingCycle ? viewingCycle.status !== 'in_progress' : false;
  return cycleLocked || assessment.status === 'submitted' || assessment.status === 'approved';
}

interface Props {
  assessmentId: string;
}

export function AssessmentMatrix({ assessmentId }: Props) {
  const { user, profile } = useAuth();

  // Data State
  const [assessment, setAssessment] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [currentCycle, setCurrentCycle] = useState<any>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [compareCycleId, setCompareCycleId] = useState<string | null>(null);
  const [client, setClient] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [previousScores, setPreviousScores] = useState<any[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // View State (Replaces Legacy Grid Mode)
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [activeTargetIndex, setActiveTargetIndex] = useState(0); // Kept for modal navigation if needed
  const [showTargetInfo, setShowTargetInfo] = useState(false);
  const [showConfirmCycle, setShowConfirmCycle] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Workflow State
  const [unscoredCount, setUnscoredCount] = useState(0);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab State (likely deprecated in new design but kept for header)
  const [activeTab, setActiveTab] = useState<'scoring' | 'analysis'>('scoring');

  const loadDataRequestRef = useRef(0);
  const loadCycleScoresRequestRef = useRef(0);

  // Computed Stats
  const domainStats = useMemo(() => {
    if (!assessment?.pack_snapshot) return [];
    return analyticsService.calculateDomainStats(assessment.pack_snapshot, scores);
  }, [assessment?.pack_snapshot, scores]);

  const cycleStats = useMemo(() => {
    return analyticsService.calculateCycleStats(domainStats);
  }, [domainStats]);

  const acquisitionList = useMemo(() => {
    if (!assessment?.pack_snapshot) return [];
    return analyticsService.calculateAcquisition(assessment.pack_snapshot, scores, previousScores);
  }, [assessment?.pack_snapshot, scores, previousScores]);

  const domainProfiles = useMemo(() => {
    if (!assessment?.pack_snapshot) return [];
    return buildDomainProfiles(assessment.pack_snapshot, scores, previousScores);
  }, [assessment?.pack_snapshot, scores, previousScores]);

  // --- Effects ---

  useEffect(() => {
    const handleClickOutside = () => setShowExportMenu(false);
    document.addEventListener('click', handleClickOutside);

    // Audit Log: View Assessment
    if (profile?.org_id && user?.id) {
      auditService.log({
        org_id: profile.org_id,
        user_id: user.id,
        action: 'VIEW',
        entity_type: 'assessment',
        entity_id: assessmentId,
        details: { source: 'matrix_load' }
      });
    }

    return () => document.removeEventListener('click', handleClickOutside);
  }, [assessmentId, profile?.org_id, user?.id]);

  useEffect(() => {
    loadData();
  }, [assessmentId]);

  // Load scores when cycle changes
  useEffect(() => {
    if (!selectedCycleId || !assessment) return;
    loadCycleScores();
  }, [selectedCycleId, compareCycleId, assessmentId]);

  // --- Data Loading ---

  const loadData = async () => {
    const requestId = ++loadDataRequestRef.current;
    try {
      if (!assessmentId) return;
      setLoading(true);
      setError(null);

      const [assessmentData, history] = await Promise.all([
        assessmentService.getById(assessmentId),
        assessmentService.getCycles(assessmentId)
      ]);

      if (requestId !== loadDataRequestRef.current) return;

      if (assessmentData) {
        setAssessment(assessmentData);
        setCycles(history);

        const active = history.find((c: any) => c.status === 'in_progress') || history[0];
        setCurrentCycle(active);
        setSelectedCycleId(active?.id);

        if (assessmentData.client_id && !assessmentData.client) {
          const clientData = await clientService.getById(assessmentData.client_id);
          if (requestId !== loadDataRequestRef.current) return;
          setClient(clientData);
        } else if (assessmentData.client) {
          setClient(assessmentData.client);
        }
      }
    } catch (err: any) {
      if (requestId !== loadDataRequestRef.current) return;
      console.error('Error loading assessment:', err);
      setError(err.message || 'Failed to load assessment');
    } finally {
      if (requestId === loadDataRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const loadCycleScores = async () => {
    const requestId = ++loadCycleScoresRequestRef.current;
    const cycleId = selectedCycleId;
    const compareId = compareCycleId;
    const cycleList = cycles;

    try {
      if (!cycleId) return;
      const cycleScores = await assessmentService.getScores(assessmentId, cycleId);
      if (requestId !== loadCycleScoresRequestRef.current) return;
      setScores(cycleScores);

      let targetCompareId = compareId;
      if (!targetCompareId || targetCompareId === cycleId) {
        const sortedCycles = [...cycleList].sort((a, b) => b.cycle_number - a.cycle_number);
        const currentIndex = sortedCycles.findIndex(c => c.id === cycleId);
        const prevCycle = sortedCycles[currentIndex + 1];
        if (prevCycle) targetCompareId = prevCycle.id;
      }

      if (targetCompareId) {
        const ghosts = await assessmentService.getScores(assessmentId, targetCompareId);
        if (requestId !== loadCycleScoresRequestRef.current) return;
        setPreviousScores(ghosts);
      } else {
        if (requestId !== loadCycleScoresRequestRef.current) return;
        setPreviousScores([]);
      }
    } catch (error) {
      if (requestId !== loadCycleScoresRequestRef.current) return;
      console.error('Error loading cycle scores:', error);
    }
  };

  // --- Handlers ---

  const handleStartNewCycle = () => {
    if (!profile?.org_id || !user?.id) return;
    setShowConfirmCycle(true);
  };

  const executeStartNewCycle = async () => {
    if (!profile?.org_id || !user?.id) return;
    try {
      setLoading(true);
      await assessmentService.startNewCycle(assessmentId, profile.org_id, user.id);
      window.location.reload();
    } catch (err: any) {
      setErrorAlert('Failed to start new cycle: ' + err.message);
      setLoading(false);
      setShowConfirmCycle(false);
    }
  };

  const handleSelectDomain = (domainId: string) => {
    setActiveDomainId(domainId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToOverview = () => {
    setActiveDomainId(null);
  };

  const handleMatrixExport = async (format: 'long' | 'matrix') => {
    setShowExportMenu(false);
    try {
      await assessmentService.exportToCSV(assessmentId, format);
    } catch (err) {
      console.error('Export failed:', err);
      setErrorAlert('Failed to export CSV');
    }
  };

  const handleViewDetail = (targetId: string) => {
    if (!assessment || !activeDomainId) return;
    const domain = assessment.pack_snapshot.domains.find((d: any) => d.domain_id === activeDomainId);
    const index = domain.targets.findIndex((t: any) => t.target_id === targetId);
    if (index >= 0) {
      setActiveTargetIndex(index);
      setShowTargetInfo(true);
    }
  };

  const activeDomainTargets = useMemo(() => {
    if (!assessment?.pack_snapshot?.domains || !activeDomainId) return [];
    const domain = assessment.pack_snapshot.domains.find((d: any) => d.domain_id === activeDomainId);
    return domain?.targets ?? [];
  }, [assessment?.pack_snapshot?.domains, activeDomainId]);

  const handleNavigateTarget = (direction: 'prev' | 'next') => {
    const maxIndex = activeDomainTargets.length - 1;
    if (maxIndex < 0) return;
    if (direction === 'prev' && activeTargetIndex > 0) {
      setActiveTargetIndex(activeTargetIndex - 1);
    }
    if (direction === 'next' && activeTargetIndex < maxIndex) {
      setActiveTargetIndex(activeTargetIndex + 1);
    }
  };

  const handleScoreUpdate = async (targetId: string, val: number) => {
    await updateScore(targetId, val, null);
  };

  const resolveDomainIdForTarget = (targetId: string): string => {
    if (!assessment?.pack_snapshot?.domains) return activeDomainId || '';
    for (const domain of assessment.pack_snapshot.domains) {
      if (domain.targets.some((t: { target_id: string }) => t.target_id === targetId)) {
        return domain.domain_id;
      }
    }
    return activeDomainId || '';
  };

  const updateScore = async (targetId: string, val: number | null, note: string | null) => {
    if (!user?.id || !profile?.org_id || !assessment) return;

    const viewingCycle = cycles.find((c) => c.id === selectedCycleId);
    if (!canEditAssessmentScores(profile.role, assessment.status, viewingCycle?.status)) return;

    const priorScores = scores;
    const newScores = [...scores];
    const index = newScores.findIndex(s => s.target_id === targetId);

    if (index >= 0) {
      const newVal = (newScores[index].score === val && val !== null) ? null : val;
      newScores[index] = {
        ...newScores[index],
        score: newVal,
        note: note !== null ? note : newScores[index].note,
        updated_at: new Date().toISOString(),
        assessor_user_id: user.id,
      };
    } else {
      newScores.push({
        target_id: targetId,
        score: val,
        domain_id: resolveDomainIdForTarget(targetId),
        updated_at: new Date().toISOString(),
        assessor_user_id: user.id,
      });
    }

    setScores(newScores);
    setSaveStatus('saving');

    try {
      const scoreRecord = newScores.find(s => s.target_id === targetId);
      if (!scoreRecord) {
        setScores(priorScores);
        setSaveStatus('error');
        setErrorAlert('Could not save score: target record missing from local state.');
        return;
      }

      let persisted: any;
      if (scoreRecord.id) {
        persisted = await assessmentService.updateScore(
          scoreRecord.id,
          scoreRecord.score,
          scoreRecord.note,
          user.id,
          profile.org_id
        );
      } else {
        if (!selectedCycleId) {
          setScores(priorScores);
          setSaveStatus('error');
          setErrorAlert('Could not save score: no active assessment cycle is selected.');
          return;
        }
        persisted = await assessmentService.createScore({
          assessmentId,
          cycleId: selectedCycleId,
          clientId: assessment.client_id,
          targetId,
          domainId: resolveDomainIdForTarget(targetId),
          score: scoreRecord.score,
          note: scoreRecord.note,
          assessorId: user.id,
          orgId: profile.org_id,
        });
      }

      setScores((prev) => {
        const idx = prev.findIndex((s) => s.target_id === targetId);
        const next = [...prev];
        if (idx >= 0) {
          next[idx] = persisted;
        } else {
          next.push(persisted);
        }
        return next;
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      console.error(err);
      setScores(priorScores);
      setSaveStatus('error');
      setErrorAlert(`Failed to save score: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleNavigateDomain = (direction: 'next' | 'prev') => {
    if (!assessment?.pack_snapshot?.domains || !activeDomainId) return;

    const domains = assessment.pack_snapshot.domains;
    const currentIndex = domains.findIndex((d: any) => d.domain_id === activeDomainId);

    if (currentIndex === -1) return;

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    // Bounds check
    if (nextIndex >= 0 && nextIndex < domains.length) {
      setActiveDomainId(domains[nextIndex].domain_id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getDomainIndex = () => {
    if (!assessment?.pack_snapshot?.domains || !activeDomainId) return -1;
    return assessment.pack_snapshot.domains.findIndex((d: any) => d.domain_id === activeDomainId);
  };

  const domainIndex = getDomainIndex();
  const isFirstDomain = domainIndex === 0;
  const isLastDomain = assessment?.pack_snapshot?.domains ? domainIndex === assessment.pack_snapshot.domains.length - 1 : false;

  const handleSubmit = async () => {
    if (!assessment) return;
    const viewingCycleForSubmit = cycles.find((c) => c.id === selectedCycleId);
    if (cannotSubmitAssessmentState(assessment, viewingCycleForSubmit) || profile?.role === 'viewer' || isSubmitting) {
      return;
    }

    // Calculate unscored count
    let total = 0;
    let scored = 0;
    if (assessment?.pack_snapshot?.domains) {
      assessment.pack_snapshot.domains.forEach((d: any) => {
        d.targets.forEach((t: any) => {
          total++;
          const s = scores.find(sc => sc.target_id === t.target_id);
          if (s && s.score !== null) scored++;
        });
      });
    }
    setUnscoredCount(total - scored);
    setShowSubmitConfirm(true);
  };

  const handleApprove = () => {
    setShowApproveConfirm(true);
  };

  const executeApprove = async () => {
    if (!profile?.org_id || !user?.id) return;
    try {
      await assessmentService.finalize(assessmentId, profile.org_id, user.id);
      setAssessment({ ...assessment, status: 'approved' });
      setShowApproveConfirm(false);
      // Reload to update lock state properly
      window.location.reload();
    } catch (err: any) {
      setErrorAlert('Failed to finalize assessment: ' + err.message);
      setShowApproveConfirm(false);
    }
  };

  // --- Render ---

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  );

  if (error || !assessment) return (
    <div className="flex items-center justify-center min-h-screen text-red-600">
      {error || 'Assessment not found'}
    </div>
  );

  const viewingCycle = cycles.find((c) => c.id === selectedCycleId);
  const isCycleLocked = viewingCycle ? viewingCycle.status !== 'in_progress' : false;
  const scoresEditable = canEditAssessmentScores(profile?.role, assessment.status, viewingCycle?.status);
  const cannotSubmitAssessment = cannotSubmitAssessmentState(assessment, viewingCycle);
  const showSubmitAssessmentButton =
    !cannotSubmitAssessment &&
    (assessment.status === 'in_progress' || assessment.status === 'draft') &&
    profile?.role !== 'viewer';

  const cycleNumberForHeader = viewingCycle?.cycle_number ?? currentCycle?.cycle_number;
  let matrixWorkflowLabel: string;
  let matrixWorkflowBadgeClass: string;
  if (assessment.status === 'approved') {
    matrixWorkflowLabel = 'Locked (approved)';
    matrixWorkflowBadgeClass = 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
  } else if (isCycleLocked) {
    matrixWorkflowLabel = 'Locked (this cycle)';
    matrixWorkflowBadgeClass = 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
  } else if (assessment.status === 'submitted') {
    if (scoresEditable) {
      matrixWorkflowLabel = 'In review (editable)';
      matrixWorkflowBadgeClass = 'bg-amber-50 text-amber-900 ring-1 ring-amber-200';
    } else {
      matrixWorkflowLabel = 'Awaiting review';
      matrixWorkflowBadgeClass = 'bg-amber-50 text-amber-900 ring-1 ring-amber-200';
    }
  } else if (scoresEditable) {
    matrixWorkflowLabel = 'Editable';
    matrixWorkflowBadgeClass = 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
  } else {
    matrixWorkflowLabel = 'View only';
    matrixWorkflowBadgeClass = 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-16 flex items-start justify-between gap-4 py-2 md:items-center">
            {/* Left: Title & Nav */}
            <div className="flex items-start gap-4 min-w-0 md:items-center">
              <button
                onClick={() => window.location.hash = '#/assessments'}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="truncate">{client?.first_name} {client?.last_name}</span>
                  <span className="hidden sm:inline text-gray-300">|</span>
                  <span className="hidden sm:inline font-normal text-gray-600 truncate max-w-[min(24rem,45vw)]">{assessment.pack_snapshot.title}</span>
                </h1>
                <p className="text-[11px] text-gray-500 sm:hidden truncate mt-0.5">{assessment.pack_snapshot.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-1">
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold text-gray-800 bg-gray-100 ring-1 ring-gray-200">
                    <Calendar className="w-3 h-3 shrink-0" />
                    Cycle {cycleNumberForHeader ?? '—'}
                  </span>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 font-semibold ${matrixWorkflowBadgeClass}`}>
                    {matrixWorkflowLabel}
                  </span>
                  {saveStatus === 'saving' && <span className="text-blue-600 font-medium animate-pulse">Saving...</span>}
                  {saveStatus === 'saved' && <span className="text-green-600 font-medium flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Saved</span>}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Compare Mode */}
              <div className="hidden md:flex items-center gap-2 mr-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Compare With Another Cycle</span>
                <select
                  value={compareCycleId || ''}
                  onChange={(e) => setCompareCycleId(e.target.value === '' ? null : e.target.value)}
                  className="text-xs border-gray-300 rounded focus:ring-emerald-500 py-1"
                >
                  <option value="">None</option>
                  {cycles.filter(c => c.id !== currentCycle?.id).map(cycle => (
                    <option key={cycle.id} value={cycle.id}>Cycle {cycle.cycle_number}</option>
                  ))}
                </select>
              </div>

              {showSubmitAssessmentButton && (
                <button
                  onClick={handleSubmit}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Submit
                </button>
              )}

              {assessment.status === 'submitted' && ['admin', 'senior_therapist'].includes(profile?.role || '') && (
                <button
                  onClick={handleApprove}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              )}

              {['admin', 'senior_therapist'].includes(profile?.role || '') && (
                <button
                  onClick={handleStartNewCycle}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors border border-emerald-200"
                >
                  <Activity className="w-4 h-4" />
                  New Cycle
                </button>
              )}

              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                >
                  <Download className="w-5 h-5" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => {
                        window.open(`#/assessment/${assessmentId}/report`, '_blank');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50 hover:text-emerald-600 border-b border-gray-100"
                    >
                      View Printable Report
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMatrixExport('matrix');
                      }}
                      className="w-full text-left px-4 py-3 text-gray-800 hover:bg-emerald-50/60 border-b border-gray-100"
                    >
                      <span className="block text-sm font-semibold text-gray-900">Export Matrix CSV</span>
                      <span className="block text-xs font-semibold text-emerald-800 mt-1">Includes all cycles</span>
                      <span className="block text-[11px] text-gray-600 mt-1 leading-snug">
                        Full assessment history — not only the cycle on screen.
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMatrixExport('long');
                      }}
                      className="w-full text-left px-4 py-3 text-gray-800 hover:bg-emerald-50/60"
                    >
                      <span className="block text-sm font-semibold text-gray-900">Export Analytics CSV</span>
                      <span className="block text-xs font-semibold text-emerald-800 mt-1">Includes all cycles</span>
                      <span className="block text-[11px] text-gray-600 mt-1 leading-snug">
                        Full assessment history — not only the cycle on screen.
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {errorAlert && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center justify-between">
            <span>{errorAlert}</span>
            <button onClick={() => setErrorAlert(null)} className="text-red-500 hover:text-red-700">Dismiss</button>
          </div>
        )}

        {!activeDomainId ? (
          /* LAYER 1: OVERVIEW */
          <AssessmentOverview
            domainStats={domainStats}
            domainProfiles={domainProfiles}
            cycleStats={cycleStats}
            acquisitionCount={acquisitionList.length}
            onSelectDomain={handleSelectDomain}
          />
        ) : (
          /* LAYER 2: SCOREBOARD */
          <DomainScoreboard
            domainId={activeDomainId}
            domainTitle={domainStats.find(d => d.domainId === activeDomainId)?.title || ''}
            targets={assessment.pack_snapshot.domains.find((d: any) => d.domain_id === activeDomainId)?.targets || []}
            scores={scores}
            previousScores={previousScores}
            onScoreUpdate={handleScoreUpdate}
            onViewDetail={handleViewDetail}
            onBack={handleBackToOverview}

            // New Navigation Props
            onNavigateDomain={handleNavigateDomain}
            isFirstDomain={isFirstDomain}
            isLastDomain={isLastDomain}
            onSubmit={handleSubmit}
            scoresEditable={scoresEditable}
            showFooterSubmit={showSubmitAssessmentButton}
          />
        )}
      </main>

      {/* LAYER 3: DETAIL MODAL */}
      {showTargetInfo && activeDomainId && activeDomainTargets[activeTargetIndex] && (
        <TargetDetailModal
          target={activeDomainTargets[activeTargetIndex]}
          currentScore={
            scores.find((s) => s.target_id === activeDomainTargets[activeTargetIndex].target_id) || null
          }
          targetPositionLabel={`Target ${activeTargetIndex + 1} of ${activeDomainTargets.length}`}
          canNavigatePrev={activeTargetIndex > 0}
          canNavigateNext={activeTargetIndex < activeDomainTargets.length - 1}
          scoresEditable={scoresEditable}
          onClose={() => setShowTargetInfo(false)}
          notesReadOnly={!scoresEditable}
          onScoreUpdate={(val) => handleScoreUpdate(activeDomainTargets[activeTargetIndex].target_id, val)}
          onNavigateTarget={handleNavigateTarget}
          onSaveNote={(note) => {
            const targetId = activeDomainTargets[activeTargetIndex].target_id;
            const current = scores.find((s) => s.target_id === targetId);
            updateScore(targetId, current?.score ?? null, note);
          }}
        />
      )}

      {/* Legacy/New Modals */}
      <ConfirmDialog
        isOpen={showConfirmCycle}
        title="Start New Assessment Cycle"
        message="This will archive the current scores and start a fresh cycle. Previous data will be preserved for specific comparison. Are you sure?"
        confirmText="Start Cycle"
        onConfirm={executeStartNewCycle}
        onCancel={() => setShowConfirmCycle(false)}
      />

      <ConfirmDialog
        isOpen={showSubmitConfirm}
        title="Submit Assessment"
        message={unscoredCount > 0
          ? `Warning: You have ${unscoredCount} unscored targets. Submitting will lock this cycle. Are you sure you want to proceed?`
          : "Are you sure you want to submit this assessment? This will lock the cycle for review."}
        confirmText={unscoredCount > 0 ? 'Submit with Unscored Targets' : 'Submit'}
        onConfirm={async () => {
          if (!profile?.org_id || !user?.id) return;
          try {
            setIsSubmitting(true);
            await assessmentService.submit(assessmentId, profile.org_id, user.id);
            setAssessment({ ...assessment, status: 'submitted' });
            setShowSubmitConfirm(false);
            setShowSuccessModal(true);
          } catch (err: any) {
            setErrorAlert('Submission failed: ' + err.message);
          } finally {
            setIsSubmitting(false);
          }
        }}
        onCancel={() => setShowSubmitConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showApproveConfirm}
        title="Approve Assessment"
        message="Are you sure you want to approve this assessment? This will finalize the results and allow a new cycle to begin."
        confirmText="Approve & Finalize"
        confirmationKeyword="APPROVE"
        onConfirm={executeApprove}
        onCancel={() => setShowApproveConfirm(false)}
      />

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Assessment submitted</h3>
            <p className="text-gray-600 mb-4 text-left text-sm leading-relaxed">
              Your work is saved. This assessment is now <strong>awaiting review</strong> and appears under the{' '}
              <strong>Submitted</strong> tab on the Assessments page.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                window.location.hash = '#/assessments?tab=submitted';
              }}
              className="w-full mb-3 py-2 text-sm font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Go to Submitted assessments
            </button>
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
