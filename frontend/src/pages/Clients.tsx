import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { clientService } from '../services/clients';
import { auditService } from '../services/audit';
import { Client } from '../types';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  DataLoadEmptyState,
  DataLoadErrorPanel,
  DataLoadContent,
  DataLoadSpinner,
} from '../components/DataLoadSurface';
import {
  executeProtectedLoad,
  type DataLoadState,
} from '../utils/dataLoadHonesty';

export function Clients() {
  const { user, profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', dateOfBirth: '' });
  const [loadState, setLoadState] = useState<DataLoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<{ id: string, name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
    if (profile?.org_id && user?.id) {
      auditService.log({
        org_id: profile.org_id,
        user_id: user.id,
        action: 'VIEW',
        entity_type: 'client',
        entity_id: null,
        details: { scope: 'client_list', filter: statusFilter },
      });
    }
  }, [profile?.org_id, statusFilter]);

  const loadClients = async () => {
    if (!profile?.org_id) {
      setLoadState('loaded');
      return;
    }

    const requestId = ++loadRequestRef.current;
    setLoadState('loading');
    setLoadError(null);

    const result = await executeProtectedLoad({
      requestId,
      getCurrentRequestId: () => loadRequestRef.current,
      load: () => clientService.getByOrg(profile.org_id, statusFilter),
    });

    if (result.kind === 'stale') {
      return;
    }

    if (result.kind === 'error') {
      setClients([]);
      setLoadError(
        'We could not load your client list. Your records are still saved — check your connection and try again.'
      );
      setLoadState('error');
      return;
    }

    setClients(result.data);
    setLoadState('loaded');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id || !user?.id) return;
    setSaveError(null);
    try {
      if (editingId) {
        await clientService.update(editingId, {
          first_name: form.firstName,
          last_name: form.lastName,
          date_of_birth: form.dateOfBirth
        });
        setEditingId(null);
      } else {
        await clientService.create(profile.org_id, form.firstName, form.lastName, form.dateOfBirth, user.id);
      }
      setForm({ firstName: '', lastName: '', dateOfBirth: '' });
      setShowForm(false);
      setSaveError(null);
      loadClients();
    } catch (err) {
      console.error('Error saving client:', err);
      const detail = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setSaveError(
        editingId
          ? `The client was not updated. ${detail} Please try again.`
          : `The client was not created. ${detail} Please check the information and try again.`
      );
    }
  };

  const handleEdit = (client: Client) => {
    setForm({
      firstName: client.first_name,
      lastName: client.last_name,
      dateOfBirth: client.date_of_birth ? new Date(client.date_of_birth).toISOString().split('T')[0] : ''
    });
    setSaveError(null);
    setEditingId(client.id);
    setShowForm(true);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await clientService.archive(archiveTarget.id);
      setArchiveError(null);
      loadClients();
      setArchiveTarget(null);
    } catch (err) {
      console.error('Error archiving client:', err);
      setArchiveTarget(null);
      setArchiveError(
        'We could not archive this client. The client is still active — try again.'
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await clientService.delete(deleteTarget.id);
      setClients(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      if (msg.includes('foreign key constraint')) {
        setDeleteError('Cannot delete client.\n\nThis client has existing assessments. You must delete their assessments before you can delete the client record.');
      } else {
        setDeleteError('Cannot delete client: ' + msg);
      }
      setDeleteTarget(null);
    }
  };

  if (loadState === 'loading') {
    return <DataLoadSpinner label="Loading clients…" />;
  }

  if (loadState === 'error') {
    return (
      <DataLoadErrorPanel
        title="Clients could not be loaded"
        message={loadError ?? ''}
        onRetry={() => void loadClients()}
        retryLabel="Retry loading clients"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage client records</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'archived' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Archived
            </button>
          </div>
          {statusFilter === 'active' && ['admin', 'senior_therapist'].includes(profile?.role || '') && (
            <button
              onClick={() => {
                setEditingId(null);
                setForm({ firstName: '', lastName: '', dateOfBirth: '' });
                setSaveError(null);
                setShowForm(!showForm);
              }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition"
              data-filled-create
            >
              <Plus className="w-5 h-5" />
              Add Client
            </button>
          )}
        </div>
      </div>

      {archiveError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start justify-between gap-4"
          data-action-error
        >
          <span>{archiveError}</span>
          <button
            type="button"
            onClick={() => setArchiveError(null)}
            className="shrink-0 font-medium text-red-700 hover:text-red-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start justify-between gap-4">
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

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 border-2 border-emerald-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-lg">{editingId ? 'Edit Client' : 'New Client'}</h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
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
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
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
              {editingId ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      )}

      {/* Archive Confirmation Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Archive Client?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to archive <strong>{archiveTarget.name}</strong>?
              This will hide them from the active list.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setArchiveTarget(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {deleteError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-red-600 mb-2">Reference Error</h3>
            <p className="text-gray-600 mb-6 whitespace-pre-line">
              {deleteError}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteError(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Permanently Delete Client?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to <strong>PERMANENTLY DELETE</strong> <strong>{deleteTarget.name}</strong>?
              <br /><br />
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {clients.length === 0 ? (
        <DataLoadEmptyState>
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-gray-500">No {statusFilter} clients found.</p>
            {statusFilter === 'active' && ['admin', 'senior_therapist'].includes(profile?.role || '') && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({ firstName: '', lastName: '', dateOfBirth: '' });
                  setSaveError(null);
                  setShowForm(true);
                }}
                className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Add Client
              </button>
            )}
          </div>
        </DataLoadEmptyState>
      ) : (
        <DataLoadContent>
          <div className="grid gap-4">
            {clients.map((client) => (
          <div
            key={client.id}
            className="bg-white rounded-lg shadow hover:shadow-md transition border border-transparent hover:border-emerald-200 p-4 flex items-center justify-between group"
          >
            <div
              className="flex-1 cursor-pointer"
              onClick={() => window.location.hash = `#/client/${client.id}`}
            >
              <h3 className="font-semibold text-gray-900 text-lg">{client.first_name} {client.last_name}</h3>
              {client.date_of_birth && (
                <p className="text-sm text-gray-500">
                  DOB: {new Date(client.date_of_birth).toLocaleDateString()}
                </p>
              )}
              <p className="text-sm text-gray-500" data-client-added>
                Added {new Date(client.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {['admin', 'senior_therapist'].includes(profile?.role || '') && (
                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleEdit(client); }}
                    className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    aria-label={`Edit ${client.first_name} ${client.last_name}`}
                  >
                    Edit
                  </button>
                  {statusFilter === 'active' && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setArchiveTarget({ id: client.id, name: `${client.first_name} ${client.last_name}` }); }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      aria-label={`Archive ${client.first_name} ${client.last_name}`}
                    >
                      Archive
                    </button>
                  )}
                </div>
              )}
              {statusFilter === 'archived' && (
                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  {['admin', 'senior_therapist'].includes(profile?.role || '') && (
                    <>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await clientService.update(client.id, { status: 'active' });
                          loadClients();
                        }}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        aria-label={`Restore ${client.first_name} ${client.last_name}`}
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: client.id, name: `${client.first_name} ${client.last_name}` });
                        }}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        aria-label={`Permanently delete ${client.first_name} ${client.last_name}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              )}
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <a
                href={`#/client/${client.id}`}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                data-row-primary-action
                aria-label={`View ${client.first_name} ${client.last_name}`}
              >
                View
              </a>
            </div>
          </div>
            ))}
          </div>
        </DataLoadContent>
      )}
    </div>
  );
}
