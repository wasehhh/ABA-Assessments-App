import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  assessmentService,
  canDeleteAssessment,
  countRecordedScores,
  formatAssessmentListDateLine,
  formatAssessmentListPackLine,
  loadCurrentCycleProgressFigure,
  recordedScoresDestroyedSentence,
  type CurrentCycleProgressFigure,
} from '../services/assessments';
import { clientService } from '../services/clients';
import { ArrowLeft, Calendar, FileText, Plus } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatAssessmentStatusLabel, shouldShowSubmissionDate } from '../utils/assessmentStatusLabel';
import { Assessment, Client } from '../types';
import {
  DataLoadEmptyState,
  DataLoadErrorPanel,
  DataLoadContent,
  DataLoadSecondaryError,
  DataLoadSpinner,
} from '../components/DataLoadSurface';
import {
  executeProtectedLoad,
  type DataLoadState,
} from '../utils/dataLoadHonesty';

interface Props {
  clientId: string;
}

export function ClientDetail({ clientId }: Props) {
  const { user, profile } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [clientLoadState, setClientLoadState] = useState<DataLoadState>('loading');
  const [clientLoadError, setClientLoadError] = useState<string | null>(null);
  const [assessmentsLoadState, setAssessmentsLoadState] = useState<DataLoadState>('loading');
  const [assessmentsLoadError, setAssessmentsLoadError] = useState<string | null>(null);
  const clientLoadRequestRef = useRef(0);
  const assessmentsLoadRequestRef = useRef(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    status: Assessment['status'];
    name: string;
    scoreCount: number | null;
  } | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [progressById, setProgressById] = useState<
    Record<string, CurrentCycleProgressFigure | null>
  >({});
  const progressLoadRequestRef = useRef(0);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', dateOfBirth: '' });
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadClient = async () => {
    const requestId = ++clientLoadRequestRef.current;
    setClientLoadState('loading');
    setClientLoadError(null);

    const result = await executeProtectedLoad({
      requestId,
      getCurrentRequestId: () => clientLoadRequestRef.current,
      load: () => clientService.getById(clientId),
    });

    if (result.kind === 'stale') {
      return;
    }

    if (result.kind === 'error') {
      setClient(null);
      setClientLoadError(
        'We could not load this client\'s record. Your records are still saved — check your connection and try again.'
      );
      setClientLoadState('error');
      return;
    }

    if (!result.data) {
      setClient(null);
      setClientLoadState('loaded');
      return;
    }

    setClient(result.data);
    setClientLoadState('loaded');
  };

  const loadAssessments = async () => {
    if (!profile?.org_id) {
      setAssessmentsLoadState('loaded');
      return;
    }

    const requestId = ++assessmentsLoadRequestRef.current;
    setAssessmentsLoadState('loading');
    setAssessmentsLoadError(null);

    const result = await executeProtectedLoad({
      requestId,
      getCurrentRequestId: () => assessmentsLoadRequestRef.current,
      load: () => assessmentService.getByOrg(profile.org_id),
    });

    if (result.kind === 'stale') {
      return;
    }

    if (result.kind === 'error') {
      setAssessments([]);
      setProgressById({});
      setAssessmentsLoadError(
        'We could not load assessments for this client. The client record loaded, but the assessment list is unavailable — try again.'
      );
      setAssessmentsLoadState('error');
      return;
    }

    const forClient = result.data.filter((a) => a.client_id === clientId);
    setAssessments(forClient);
    setAssessmentsLoadState('loaded');
    void loadListProgress(forClient);
  };

  const loadListProgress = async (list: Assessment[]) => {
    const requestId = ++progressLoadRequestRef.current;
    const pairs = await Promise.all(
      list.map(async (assessment) => {
        try {
          const figure = await loadCurrentCycleProgressFigure(
            assessment.id,
            assessment.pack_snapshot
          );
          return [assessment.id, figure] as const;
        } catch {
          return [assessment.id, null] as const;
        }
      })
    );
    if (requestId !== progressLoadRequestRef.current) {
      return;
    }
    setProgressById(Object.fromEntries(pairs));
  };

  useEffect(() => {
    void loadClient();
  }, [clientId]);

  useEffect(() => {
    if (clientLoadState === 'loaded' && client) {
      void loadAssessments();
    }
  }, [clientId, profile?.org_id, clientLoadState, client?.id]);

  if (clientLoadState === 'loading') {
    return <DataLoadSpinner label="Loading client…" />;
  }

  if (clientLoadState === 'error') {
    return (
      <DataLoadErrorPanel
        title="Client record could not be loaded"
        message={clientLoadError ?? ''}
        onRetry={() => void loadClient()}
        retryLabel="Retry loading client"
      />
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12" data-load-not-found>
        Client not found
      </div>
    );
  }

  const handleDeleteClick = async (assessment: Assessment) => {
    const name = assessment.pack_snapshot.title;
    if (assessment.status === 'in_progress') {
      try {
        const scores = await assessmentService.getScores(assessment.id);
        setDeleteTarget({
          id: assessment.id,
          status: assessment.status,
          name,
          scoreCount: countRecordedScores(scores),
        });
      } catch (error) {
        console.error('Error loading recorded scores:', error);
        setErrorAlert('Failed to load recorded scores for this assessment.');
      }
      return;
    }
    setDeleteTarget({
      id: assessment.id,
      status: assessment.status,
      name,
      scoreCount: null,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (!profile?.org_id || !user?.id) return;

    setDeleting(deleteTarget.id);
    try {
      await assessmentService.delete(deleteTarget.id, profile.org_id, user.id);
      setAssessments(assessments.filter(a => a.id !== deleteTarget.id));
    } catch (error) {
      console.error('Error deleting assessment:', error);
      setErrorAlert('Failed to delete assessment');
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'submitted': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const canManageClient = ['admin', 'senior_therapist'].includes(profile?.role || '');

  const openEditForm = () => {
    setEditForm({
      firstName: client.first_name,
      lastName: client.last_name,
      dateOfBirth: client.date_of_birth
        ? new Date(client.date_of_birth).toISOString().split('T')[0]
        : '',
    });
    setSaveError(null);
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      const updated = await clientService.update(clientId, {
        first_name: editForm.firstName,
        last_name: editForm.lastName,
        date_of_birth: editForm.dateOfBirth,
      });
      setClient(updated);
      setShowEditForm(false);
    } catch (err) {
      console.error('Error updating client:', err);
      const detail = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setSaveError(`The client was not updated. ${detail} Please try again.`);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => window.location.hash = '#/clients'}
        className="flex items-center gap-2 text-gray-600 hover:text-emerald-700 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {client.first_name} {client.last_name}
            </h1>
            {client.date_of_birth && (
              <p className="text-gray-600 mt-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                DOB: {new Date(client.date_of_birth).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {canManageClient ? (
              <button
                type="button"
                onClick={openEditForm}
                className="text-gray-600 hover:text-emerald-700 font-medium"
                data-client-edit
              >
                Edit
              </button>
            ) : null}
            {canManageClient && client.status === 'active' ? (
              <button
                onClick={() => window.location.hash = `#/assessments?client=${clientId}`}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition"
                data-filled-create
              >
                <Plus className="w-5 h-5" />
                New Assessment
              </button>
            ) : null}
          </div>
        </div>

        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start justify-between gap-4 mb-6">
            <span>{saveError}</span>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="shrink-0 font-medium text-red-700 hover:text-red-900 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {showEditForm && (
          <form onSubmit={handleEditSubmit} className="mb-6 bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Edit Client</h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setSaveError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={editForm.dateOfBirth}
                onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setSaveError(null);
                }}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Assessments
          </h2>

          {assessmentsLoadState === 'loading' ? (
            <DataLoadSpinner label="Loading assessments…" className="py-8" />
          ) : assessmentsLoadState === 'error' ? (
            <DataLoadSecondaryError
              message={assessmentsLoadError ?? ''}
              onRetry={() => void loadAssessments()}
              retryLabel="Retry loading assessments"
            />
          ) : assessments.length === 0 ? (
            <DataLoadEmptyState>
              <div className="text-center py-8 text-gray-500">
                {client.status === 'active' && canManageClient
                  ? 'No assessments yet. Create one to get started.'
                  : 'No assessments.'}
              </div>
            </DataLoadEmptyState>
          ) : (
            <DataLoadContent>
              <div className="space-y-3">
                {assessments.map((assessment) => (
                  <div key={assessment.id} className="flex gap-2">
                    <button
                      onClick={() => window.location.hash = `#/assessment/${assessment.id}`}
                      className="flex-1 text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      data-row-primary-action
                      aria-label={`Open ${assessment.pack_snapshot.title}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {formatAssessmentListPackLine({
                              title: assessment.pack_snapshot.title,
                              version: assessment.pack_snapshot.version,
                            })}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatAssessmentListDateLine(assessment)}
                          </p>
                          {progressById[assessment.id] ? (
                            <p className="text-sm text-gray-600" data-cycle-progress>
                              {progressById[assessment.id]?.label}
                            </p>
                          ) : null}
                          {shouldShowSubmissionDate(assessment.status, assessment.submitted_at) && (
                            <p className="text-sm text-gray-600">
                              Submitted: {new Date(assessment.submitted_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                            {formatAssessmentStatusLabel(assessment.status)}
                          </span>
                          <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
                        </div>
                      </div>
                    </button>
                    {canDeleteAssessment(assessment.status, profile?.role) ? (
                      <button
                        type="button"
                        onClick={() => void handleDeleteClick(assessment)}
                        disabled={deleting === assessment.id}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition border border-red-200 disabled:opacity-50"
                        data-row-delete
                        aria-label={`Delete ${assessment.pack_snapshot.title} assessment`}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </DataLoadContent>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={deleteTarget?.status === 'in_progress' ? 'Delete Assessment' : 'Delete Draft Assessment'}
        message={
          deleteTarget?.status === 'in_progress' && deleteTarget.scoreCount != null
            ? `Are you sure you want to delete the assessment for ${client.first_name} ${client.last_name} - ${deleteTarget.name}? ${recordedScoresDestroyedSentence(deleteTarget.scoreCount)} This action cannot be undone.`
            : 'Are you sure you want to delete this draft assessment? This action cannot be undone.'
        }
        confirmText="Delete Assessment"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!errorAlert}
        title="Error"
        message={errorAlert || ''}
        confirmText="OK"
        variant="alert"
        onConfirm={() => setErrorAlert(null)}
      />
    </div>
  );
}
