import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { assessmentService } from '../services/assessments';
import { clientService } from '../services/clients';
import { ArrowLeft, Calendar, FileText, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatAssessmentStatusLabel } from '../utils/assessmentStatusLabel';
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

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
      setAssessmentsLoadError(
        'We could not load assessments for this client. The client record loaded, but the assessment list is unavailable — try again.'
      );
      setAssessmentsLoadState('error');
      return;
    }

    setAssessments(result.data.filter((a) => a.client_id === clientId));
    setAssessmentsLoadState('loaded');
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

  const handleDeleteClick = (assessmentId: string) => {
    setDeleteId(assessmentId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    if (!profile?.org_id || !user?.id) return;

    setDeleting(deleteId);
    try {
      await assessmentService.delete(deleteId, profile.org_id, user.id);
      setAssessments(assessments.filter(a => a.id !== deleteId));
    } catch (error) {
      console.error('Error deleting assessment:', error);
      setErrorAlert('Failed to delete assessment');
    } finally {
      setDeleting(null);
      setDeleteId(null);
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

  return (
    <div className="space-y-6">
      <button
        onClick={() => window.location.hash = '#/clients'}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
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
          <button
            onClick={() => window.location.hash = `#/assessments?client=${clientId}`}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            New Assessment
          </button>
        </div>

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
                No assessments yet. Create one to get started.
              </div>
            </DataLoadEmptyState>
          ) : (
            <DataLoadContent>
              <div className="space-y-3">
                {assessments.map((assessment) => (
                  <div key={assessment.id} className="flex gap-2">
                    <button
                      onClick={() => window.location.hash = `#/assessment/${assessment.id}`}
                      className="flex-1 text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {assessment.pack_snapshot.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Created: {new Date(assessment.created_at).toLocaleDateString()}
                          </p>
                          {assessment.submitted_at && (
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
                    {assessment.status === 'draft' && (
                      <button
                        onClick={() => handleDeleteClick(assessment.id)}
                        disabled={deleting === assessment.id}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition border border-red-200 disabled:opacity-50"
                        title="Delete draft"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </DataLoadContent>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Draft Assessment"
        message="Are you sure you want to delete this draft assessment? This action cannot be undone."
        confirmText="Delete Assessment"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
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
