import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAssessmentBuilderNavigationGuard } from '../context/AssessmentBuilderNavigationGuard';
import { packService } from '../services/packs';
import { ContentPack } from '../types';
import { Upload, Plus, RefreshCcw, Trash2, AlertTriangle } from 'lucide-react';
import { AssessmentBuilder } from '../components/AssessmentBuilder';
import {
    collectPackOversizedWarnings,
    OVERSIZED_WARNING_ADVICE,
} from '../utils/assessmentPackAuthoring';
import { prepareContentPackForUpload } from '../utils/assessmentPackCanonical';
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

export function ContentPacks() {
  const { user, profile } = useAuth();
  // Allow all users to access builder features for demo/MVP
  const isAdmin = ['admin', 'senior_therapist'].includes(profile?.role || '');

  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', file: null as File | null });
  const [error, setError] = useState('');
  const [loadState, setLoadState] = useState<DataLoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [archiveTarget, setArchiveTarget] = useState<{ id: string, name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingPack, setEditingPack] = useState<ContentPack | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [builderDirty, setBuilderDirty] = useState(false);
  const navigationGuard = useAssessmentBuilderNavigationGuard();

  const handleBuilderSessionChange = useCallback((state: { isDirty: boolean }) => {
    setBuilderDirty(state.isDirty);
  }, []);

  useEffect(() => {
    navigationGuard.setBlocking(showBuilder && builderDirty);
  }, [showBuilder, builderDirty, navigationGuard]);

  const requestBuilderSessionAction = (action: () => void) => {
    navigationGuard.requestLocalAction(action);
  };

  const loadPacks = async () => {
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
      load: () => packService.getByOrg(profile.org_id, statusFilter),
    });

    if (result.kind === 'stale') {
      return;
    }

    if (result.kind === 'error') {
      setPacks([]);
      setLoadError(
        'We could not load content packs. Your packs are still saved — try again.'
      );
      setLoadState('error');
      return;
    }

    setPacks(result.data);
    setLoadState('loaded');
  };

  useEffect(() => {
    loadPacks();
  }, [profile?.org_id, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setImportWarnings([]);
    if (!profile?.org_id || !user?.id || !form.file) return;

    try {
      const text = await form.file.text();
      let packData: ContentPack['pack_data'];
      const warnings: string[] = [];

      if (form.file.name.endsWith('.json')) {
        packData = JSON.parse(text);
      } else if (form.file.name.endsWith('.csv')) {
        packData = packService.parseCSV(text, form.title, form.description);
        warnings.push(
          ...collectPackOversizedWarnings(packData).map(
            (warning) =>
              `${warning.domainTitle}: ${warning.targetCount} targets (${warning.level}). ${OVERSIZED_WARNING_ADVICE}`
          )
        );
      } else {
        setError('File must be JSON or CSV');
        return;
      }

      // CSV parse already migrates; JSON (and any path) still renormalizes here (OQ-B3-6/7/8).
      const prepared = prepareContentPackForUpload(packData);
      packData = prepared.pack;
      warnings.push(...prepared.warnings);
      setImportWarnings(warnings);

      packData.org_id = profile.org_id;
      await packService.upload(profile.org_id, form.title, form.description, packData, user.id);
      setForm({ title: '', description: '', file: null });
      setShowForm(false);
      const updated = await packService.getByOrg(profile.org_id);
      setPacks(updated);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBuilderSave = async (packData: any) => {
    if (!profile?.org_id || !user?.id) return;

    try {
      await packService.upload(profile.org_id, packData.title, packData.description, packData, user.id);
      setShowBuilder(false);
      setBuilderDirty(false);
      const updated = await packService.getByOrg(profile.org_id);
      setPacks(updated);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loadState === 'loading') {
    return <DataLoadSpinner label="Loading content packs…" />;
  }

  if (loadState === 'error') {
    return (
      <DataLoadErrorPanel
        title="Content packs could not be loaded"
        message={loadError ?? ''}
        onRetry={() => void loadPacks()}
        retryLabel="Retry loading content packs"
      />
    );
  }

  const handleEdit = (pack: ContentPack) => {
    requestBuilderSessionAction(() => {
      setEditingPack(pack);
      setShowBuilder(true);
      setShowForm(false);
    });
  };

  const openNewBuilder = () => {
    requestBuilderSessionAction(() => {
      setShowBuilder(true);
      setShowForm(false);
      setEditingPack(null);
    });
  };

  const openUploadForm = () => {
    requestBuilderSessionAction(() => {
      setShowForm(!showForm);
      setShowBuilder(false);
      setEditingPack(null);
    });
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await packService.archive(archiveTarget.id);
      loadPacks();
      setArchiveTarget(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await packService.delete(deleteTarget.id);
      setPacks(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      if (msg.includes('foreign key constraint')) {
        setDeleteError('Cannot delete pack.\n\nThis content pack is used in existing assessments. You must delete those assessments before you can delete the pack.');
      } else {
        setDeleteError('Cannot delete pack: ' + msg);
      }
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Packs</h1>
          <p className="text-gray-600 mt-1">Assessment material templates</p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
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
            <button
              onClick={openNewBuilder}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Build Custom
            </button>
            <button
              onClick={openUploadForm}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <Upload className="w-5 h-5" />
              Upload Pack
            </button>
          </div>
        )}
      </div>

      {showBuilder && isAdmin && (
        <AssessmentBuilder
          initialData={editingPack ? { ...editingPack.pack_data, title: editingPack.title, description: editingPack.description } : undefined}
          onSessionChange={handleBuilderSessionChange}
          onSave={async (data) => {
            if (editingPack) {
              await packService.update(editingPack.id, {
                title: data.title,
                description: data.description,
                pack_data: { ...data, version: editingPack.version } // Keep version or bump? For now keep.
              });
              loadPacks();
              setShowBuilder(false);
              setEditingPack(null);
              setBuilderDirty(false);
            } else {
              handleBuilderSave(data);
            }
          }}
          onCancel={() => {
            setShowBuilder(false);
            setEditingPack(null);
            setBuilderDirty(false);
          }}
        />
      )}

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
          {importWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">Import warning (non-blocking)</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {importWarnings.map((warning, index) => (
                      <li key={`${index}-${warning.slice(0, 40)}`}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pack Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content Pack File (JSON or CSV)</label>
            <input
              type="file"
              accept=".json,.csv"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              Upload Pack
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Archive Confirmation Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Archive Pack?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to archive <strong>{archiveTarget.name}</strong>?
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Permanently Delete Pack?</h3>
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

      {packs.length === 0 ? (
        <DataLoadEmptyState>
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-gray-500">No {statusFilter} packs found.</p>
          </div>
        </DataLoadEmptyState>
      ) : (
        <DataLoadContent>
          <div className="grid gap-4">
            {packs.map((pack) => (
          <div key={pack.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between group">
            <div>
              <h3 className="font-semibold text-gray-900">{pack.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{pack.description}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>v{pack.version}</span>
                <span>{pack.pack_data?.domains?.length || 0} domains</span>
                <span>
                  {pack.pack_data?.domains?.reduce((sum, d) => sum + (d.targets?.length || 0), 0) || 0} targets
                </span>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(pack)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Edit Pack"
                >
                  Edit
                </button>
                {statusFilter === 'active' && (
                  <button
                    onClick={() => setArchiveTarget({ id: pack.id, name: pack.title })}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Archive Pack"
                  >
                    Archive
                  </button>
                )}
                {statusFilter === 'archived' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await packService.update(pack.id, { status: 'active' });
                        loadPacks();
                      }}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      title="Restore Pack"
                    >
                      <RefreshCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: pack.id, name: pack.title })}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Permanently Delete Pack"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
            ))}
          </div>
        </DataLoadContent>
      )}
    </div>
  );
}
