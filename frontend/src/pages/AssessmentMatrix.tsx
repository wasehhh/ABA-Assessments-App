
import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { assessmentService } from '../services/assessments';
import { buildDomainProfiles } from '../services/domainProfile';
import { clientService } from '../services/clients';
import { ChevronLeft, Calendar, CheckCircle } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { auditService } from '../services/audit';
import { AssessmentOverview } from '../components/assessment/AssessmentOverview';
import { DomainScoreboard } from '../components/assessment/DomainScoreboard';
import { TargetDetailModal } from '../components/assessment/TargetDetailModal';
import { MatrixContextRow } from '../components/assessment/MatrixContextRow';
import { MatrixHeaderMoreMenu } from '../components/assessment/MatrixHeaderMoreMenu';
import { canEditAssessmentScores } from '../utils/assessmentScoreEditRules';
import { getStructureLabels } from '../utils/assessmentPackStructure';
import {
    findMatrixSecondaryGroupTitle,
    flattenMatrixDisplayTargets,
} from '../utils/matrixDisplayHelpers';
import {
  buildAssessmentSnapshotRouteHash,
  getAssessmentSnapshotAvailability,
} from '../services/assessmentSnapshotAvailability';
import {
  countUnscoredTargets,
  evaluateSubmitGate,
  fetchCycleScoresBundle,
  formatSubmitConfirmMessage,
  matrixScoresEntryAllowed,
  PendingSaveTracker,
  resolveSubmitControlState,
  type ComparisonScoresLoadState,
  type CycleScoresLoadState,
} from './assessmentMatrixSaveHonesty';
import {
  AssessmentMatrixApproveControl,
  AssessmentMatrixScoresMainPanel,
  AssessmentMatrixSubmitControl,
} from './AssessmentMatrixHonestySurface';
import {
  buildFinalizedReportRouteHash,
  buildReportAuthoringRouteHash,
  shouldShowFinalizedReportEntry,
  shouldShowReportAuthoringEntry,
} from './assessmentMatrixReportEntry';
import {
  matrixHeaderShowsApprove,
  resolveMatrixHeaderMode,
  shouldShowNewCycleAction,
} from './assessmentMatrixHeaderModes';
import { reportAuthoringService } from '../services/reportAuthoring';

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
  const [persistedScores, setPersistedScores] = useState<any[]>([]);
  const [previousScores, setPreviousScores] = useState<any[]>([]);
  const [pendingSaveCount, setPendingSaveCount] = useState(0);
  const [failedSaveTargetIds, setFailedSaveTargetIds] = useState<string[]>([]);
  const [cycleScoresLoadState, setCycleScoresLoadState] =
    useState<CycleScoresLoadState>('loading');
  const [cycleScoresLoadError, setCycleScoresLoadError] = useState<string | null>(null);
  const [comparisonScoresLoadState, setComparisonScoresLoadState] =
    useState<ComparisonScoresLoadState>('loading');
  const [comparisonScoresLoadError, setComparisonScoresLoadError] = useState<string | null>(
    null
  );

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // View State
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [activeTargetIndex, setActiveTargetIndex] = useState(0); // Kept for modal navigation if needed
  const [showTargetInfo, setShowTargetInfo] = useState(false);
  const [showConfirmCycle, setShowConfirmCycle] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [hasFinalizedReport, setHasFinalizedReport] = useState(false);

  // Workflow State
  const [unscoredCount, setUnscoredCount] = useState(0);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDataRequestRef = useRef(0);
  const loadCycleScoresRequestRef = useRef(0);
  const pendingSaveTrackerRef = useRef(new PendingSaveTracker());

  const domainProfiles = useMemo(() => {
    if (!assessment?.pack_snapshot) return [];
    return buildDomainProfiles(assessment.pack_snapshot, scores, previousScores);
  }, [assessment?.pack_snapshot, scores, previousScores]);

  const structureLabels = useMemo(() => {
    if (!assessment?.pack_snapshot) {
      return getStructureLabels({
        pack_id: '',
        org_id: '',
        title: '',
        description: '',
        version: '',
        domains: [],
      });
    }
    return getStructureLabels(assessment.pack_snapshot);
  }, [assessment?.pack_snapshot]);

  const activeDomain = useMemo(() => {
    if (!assessment?.pack_snapshot?.domains || !activeDomainId) return null;
    return (
      assessment.pack_snapshot.domains.find(
        (domain: { domain_id: string }) => domain.domain_id === activeDomainId
      ) ?? null
    );
  }, [assessment?.pack_snapshot?.domains, activeDomainId]);

  // --- Effects ---

  useEffect(() => {
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
  }, [assessmentId, profile?.org_id, user?.id]);

  useEffect(() => {
    loadData();
    setActiveDomainId(null);
  }, [assessmentId]);

  // Load scores when cycle changes
  useEffect(() => {
    if (!selectedCycleId || !assessment) return;
    loadCycleScores();
  }, [selectedCycleId, compareCycleId, assessmentId]);

  useEffect(() => {
    if (!selectedCycleId || assessment?.status !== 'approved') {
      setHasFinalizedReport(false);
      return;
    }

    let cancelled = false;
    void reportAuthoringService
      .getCurrentFinalizedVersion(assessmentId, selectedCycleId)
      .then((row) => {
        if (!cancelled) {
          setHasFinalizedReport(Boolean(row?.embedded_computed));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasFinalizedReport(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assessmentId, selectedCycleId, assessment?.status]);

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

    if (!cycleId) return;

    setCycleScoresLoadState('loading');
    setCycleScoresLoadError(null);
    setComparisonScoresLoadState('loading');
    setComparisonScoresLoadError(null);

    const result = await fetchCycleScoresBundle({
      requestId,
      getCurrentRequestId: () => loadCycleScoresRequestRef.current,
      cycleId,
      compareCycleId: compareId,
      cycles: cycleList,
      getScores: (id) => assessmentService.getScores(assessmentId, id),
    });

    if (result.kind === 'stale') {
      return;
    }

    if (result.kind === 'primary_error') {
      setScores([]);
      setPersistedScores([]);
      setPreviousScores([]);
      setFailedSaveTargetIds([]);
      setCycleScoresLoadState('error');
      setCycleScoresLoadError(result.cycleScoresLoadError);
      setComparisonScoresLoadState('none');
      return;
    }

    setScores(result.scores);
    setPersistedScores(result.scores);
    setFailedSaveTargetIds([]);
    setCycleScoresLoadState('loaded');
    setPreviousScores(result.previousScores);
    setComparisonScoresLoadState(result.comparisonScoresLoadState);
    setComparisonScoresLoadError(result.comparisonScoresLoadError);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMatrixExport = async (format: 'long' | 'matrix') => {
    try {
      await assessmentService.exportToCSV(assessmentId, format);
    } catch (err) {
      console.error('Export failed:', err);
      setErrorAlert('Failed to export CSV');
    }
  };

  const handleViewDetail = (targetId: string) => {
    if (!activeDomain) return;
    const index = flattenMatrixDisplayTargets(activeDomain).findIndex(
      (target) => target.target_id === targetId
    );
    if (index >= 0) {
      setActiveTargetIndex(index);
      setShowTargetInfo(true);
    }
  };

  const activeDomainTargets = useMemo(() => {
    if (!activeDomain) return [];
    return flattenMatrixDisplayTargets(activeDomain);
  }, [activeDomain]);

  const activeTargetSecondaryGroupTitle = useMemo(() => {
    if (!activeDomain || !activeDomainTargets[activeTargetIndex]) return undefined;
    return findMatrixSecondaryGroupTitle(
      activeDomain,
      activeDomainTargets[activeTargetIndex].target_id
    );
  }, [activeDomain, activeDomainTargets, activeTargetIndex]);

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
    const saveToken = pendingSaveTrackerRef.current.begin();
    setPendingSaveCount(pendingSaveTrackerRef.current.count);

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
      setPersistedScores((prev) => {
        const idx = prev.findIndex((s) => s.target_id === targetId);
        const next = [...prev];
        if (idx >= 0) {
          next[idx] = persisted;
        } else {
          next.push(persisted);
        }
        return next;
      });
      setFailedSaveTargetIds((prev) => prev.filter((id) => id !== targetId));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      console.error(err);
      setScores(priorScores);
      setSaveStatus('error');
      setFailedSaveTargetIds((prev) =>
        prev.includes(targetId) ? prev : [...prev, targetId]
      );
      setErrorAlert(`Failed to save score for ${targetId}: ${err?.message || 'Unknown error'}`);
    } finally {
      const remaining = pendingSaveTrackerRef.current.end(saveToken);
      setPendingSaveCount(remaining);
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
    const submitGate = evaluateSubmitGate({
      pendingSaveCount,
      failedSaveTargetIds,
      isSubmitting,
      cannotSubmitAssessment: cannotSubmitAssessmentState(assessment, viewingCycleForSubmit),
      isViewer: profile?.role === 'viewer',
      cycleScoresLoadState,
    });
    if (!submitGate.allowed) {
      if (submitGate.reason) {
        setErrorAlert(submitGate.reason);
      }
      return;
    }

    const unscored = countUnscoredTargets(assessment.pack_snapshot, persistedScores);
    setUnscoredCount(unscored);
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
  const scoresEditable = canEditAssessmentScores(profile?.role, assessment.status, viewingCycle?.status);
  const scoresEntryAllowed = matrixScoresEntryAllowed(cycleScoresLoadState);
  const effectiveScoresEditable = scoresEditable && scoresEntryAllowed;
  const cannotSubmitAssessment = cannotSubmitAssessmentState(assessment, viewingCycle);
  const headerMode = resolveMatrixHeaderMode({
    assessmentStatus: assessment.status,
    cycleStatus: viewingCycle?.status,
    role: profile?.role,
    scoresLoadState: cycleScoresLoadState,
    pendingSaveCount,
    failedSaveTargetIds,
  });
  const showSubmitAssessmentButton =
    !cannotSubmitAssessment &&
    (assessment.status === 'in_progress' || assessment.status === 'draft') &&
    profile?.role !== 'viewer';
  const submitGateInput = {
    pendingSaveCount,
    failedSaveTargetIds,
    isSubmitting,
    cannotSubmitAssessment,
    isViewer: profile?.role === 'viewer',
    cycleScoresLoadState,
  };
  const submitControl = resolveSubmitControlState({
    ...submitGateInput,
    showSubmitAssessmentButton,
  });
  const submitControlDisabled = submitControl.disabled;
  const submitDisabledReason = submitControl.reason;
  const snapshotAvailability = getAssessmentSnapshotAvailability({
    assessment,
    cycleCount: cycles.length,
  });
  const showAssessmentSnapshotEntry = snapshotAvailability.available;
  const showReportAuthoringEntry =
    shouldShowReportAuthoringEntry(assessment.status, profile?.role) && Boolean(selectedCycleId);
  const showFinalizedReportEntry =
    shouldShowFinalizedReportEntry(assessment.status, profile?.role, hasFinalizedReport) &&
    Boolean(selectedCycleId);
  const showApproveInStrip = matrixHeaderShowsApprove(headerMode);
  const showNewCycleInMore = shouldShowNewCycleAction(assessment.status, profile?.role);

  const cycleNumberForHeader = viewingCycle?.cycle_number ?? currentCycle?.cycle_number;
  let matrixWorkflowLabel: string;
  let matrixWorkflowBadgeClass: string;
  if (headerMode === 'M7') {
    matrixWorkflowLabel = 'Locked (approved)';
    matrixWorkflowBadgeClass = 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
  } else if (headerMode === 'M4') {
    matrixWorkflowLabel = 'Locked (this cycle)';
    matrixWorkflowBadgeClass = 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
  } else if (headerMode === 'M6') {
    matrixWorkflowLabel = scoresEditable ? 'In review (editable)' : 'In review';
    matrixWorkflowBadgeClass = 'bg-amber-50 text-amber-900 ring-1 ring-amber-200';
  } else if (headerMode === 'M5') {
    matrixWorkflowLabel = 'Awaiting review';
    matrixWorkflowBadgeClass = 'bg-amber-50 text-amber-900 ring-1 ring-amber-200';
  } else if (scoresEditable) {
    matrixWorkflowLabel = 'Editable';
    matrixWorkflowBadgeClass = 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
  } else {
    matrixWorkflowLabel = 'View only';
    matrixWorkflowBadgeClass = 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Primary strip — sticky. At most one filled accent commit control for the current actor. */}
      <header
        className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm"
        data-matrix-header-primary-strip
        data-matrix-header-mode={headerMode}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-3 py-1.5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => window.location.hash = '#/assessments'}
                className="inline-flex min-h-11 items-center gap-1 -ml-2 rounded-lg px-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                aria-label="Back to Assessments"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
                <span className="hidden text-sm font-medium sm:inline">Assessments</span>
              </button>
              <div className="min-w-0">
                <h1 className="flex flex-wrap items-center gap-x-2 gap-y-0.5 truncate text-lg font-bold text-gray-900">
                  <span className="truncate">{client?.first_name} {client?.last_name}</span>
                  <span className="hidden text-gray-300 sm:inline">|</span>
                  <span className="hidden max-w-[min(24rem,40vw)] truncate font-normal text-gray-600 sm:inline">{assessment.pack_snapshot.title}</span>
                </h1>
                <p className="mt-0.5 truncate text-[11px] text-gray-500 sm:hidden">{assessment.pack_snapshot.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-semibold text-gray-800 ring-1 ring-gray-200">
                    <Calendar className="h-3 w-3 shrink-0" />
                    Cycle {cycleNumberForHeader ?? '—'}
                  </span>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 font-semibold ${matrixWorkflowBadgeClass}`}>
                    {matrixWorkflowLabel}
                  </span>
                  {saveStatus === 'saving' && (
                    <span className="animate-pulse font-medium text-blue-600">
                      Saving{pendingSaveCount > 1 ? ` (${pendingSaveCount})` : ''}...
                    </span>
                  )}
                  {saveStatus === 'saved' && <span className="flex items-center gap-0.5 font-medium text-green-600"><CheckCircle className="h-3 w-3" /> Saved</span>}
                  {saveStatus === 'error' && (
                    <span className="font-medium text-red-600">Save failed — check alert</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <AssessmentMatrixSubmitControl
                showSubmitAssessmentButton={showSubmitAssessmentButton}
                submitControlDisabled={submitControlDisabled}
                submitDisabledReason={submitDisabledReason}
                onSubmit={handleSubmit}
              />
              <AssessmentMatrixApproveControl
                showApproveAssessmentButton={showApproveInStrip}
                onApprove={handleApprove}
              />
              <MatrixHeaderMoreMenu
                showNewCycle={showNewCycleInMore}
                onNewCycle={handleStartNewCycle}
                showSnapshot={showAssessmentSnapshotEntry}
                onSnapshot={() => {
                  window.location.hash = buildAssessmentSnapshotRouteHash(assessmentId);
                }}
                showWriteReport={showReportAuthoringEntry}
                onWriteReport={() => {
                  window.location.hash = buildReportAuthoringRouteHash(
                    assessmentId,
                    selectedCycleId!
                  );
                }}
                showCommunicationReport={showFinalizedReportEntry}
                onCommunicationReport={() => {
                  window.location.hash = buildFinalizedReportRouteHash(
                    assessmentId,
                    selectedCycleId!
                  );
                }}
                onExportMatrix={() => void handleMatrixExport('matrix')}
                onExportAnalytics={() => void handleMatrixExport('long')}
                onLearnerMap={() => {
                  window.location.hash = `#/assessment/${assessmentId}/learner-map`;
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <MatrixContextRow
        cycles={cycles}
        viewingCycleId={selectedCycleId}
        compareCycleId={compareCycleId}
        onCompareCycleChange={setCompareCycleId}
        comparisonError={
          comparisonScoresLoadState === 'error' ? comparisonScoresLoadError : null
        }
        submitDisabledReason={submitDisabledReason}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {errorAlert && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center justify-between">
            <span>{errorAlert}</span>
            <button onClick={() => setErrorAlert(null)} className="text-red-500 hover:text-red-700">Dismiss</button>
          </div>
        )}

        <AssessmentMatrixScoresMainPanel
          cycleScoresLoadState={cycleScoresLoadState}
          cycleScoresLoadError={cycleScoresLoadError}
          onRetryLoad={() => void loadCycleScores()}
          activeDomainId={activeDomainId}
          overview={
            <AssessmentOverview
              domainProfiles={domainProfiles}
              structureLabels={structureLabels}
              onSelectDomain={handleSelectDomain}
            />
          }
          scoreboard={
            activeDomain && assessment?.pack_snapshot ? (
              <DomainScoreboard
                domain={activeDomain}
                pack={assessment.pack_snapshot}
                structureLabels={structureLabels}
                scores={scores}
                previousScores={previousScores}
                onScoreUpdate={handleScoreUpdate}
                onViewDetail={handleViewDetail}
                onBack={handleBackToOverview}
                onNavigateDomain={handleNavigateDomain}
                isFirstDomain={isFirstDomain}
                isLastDomain={isLastDomain}
                scoresEditable={effectiveScoresEditable}
              />
            ) : null
          }
        />
      </main>

      {/* LAYER 3: DETAIL MODAL */}
      {showTargetInfo && activeDomainTargets[activeTargetIndex] && assessment?.pack_snapshot && (
        <TargetDetailModal
          target={activeDomainTargets[activeTargetIndex]}
          pack={assessment.pack_snapshot}
          structureLabels={structureLabels}
          currentScore={
            scores.find((s) => s.target_id === activeDomainTargets[activeTargetIndex].target_id) || null
          }
          targetPositionLabel={`${structureLabels.target} ${activeTargetIndex + 1} of ${activeDomainTargets.length}`}
          secondaryGroupTitle={activeTargetSecondaryGroupTitle}
          canNavigatePrev={activeTargetIndex > 0}
          canNavigateNext={activeTargetIndex < activeDomainTargets.length - 1}
          scoresEditable={effectiveScoresEditable}
          onClose={() => setShowTargetInfo(false)}
          notesReadOnly={!effectiveScoresEditable}
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
        message={formatSubmitConfirmMessage(unscoredCount, structureLabels.target)}
        confirmText={unscoredCount > 0 ? 'Submit with Unscored Targets' : 'Submit'}
        onConfirm={async () => {
          if (!profile?.org_id || !user?.id) return;
          const submitGate = evaluateSubmitGate({
            pendingSaveCount,
            failedSaveTargetIds,
            isSubmitting,
            cannotSubmitAssessment,
            isViewer: profile?.role === 'viewer',
            cycleScoresLoadState,
          });
          if (!submitGate.allowed) {
            setShowSubmitConfirm(false);
            if (submitGate.reason) {
              setErrorAlert(submitGate.reason);
            }
            return;
          }
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
