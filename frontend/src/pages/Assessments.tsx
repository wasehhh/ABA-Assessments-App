import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { assessmentService } from '../services/assessments';
import { clientService } from '../services/clients';
import { packService } from '../services/packs';
import { userService } from '../services/users';
import { UserProfile, Assessment } from '../types';
import { Plus, FileText, Calendar, User, Trash2, Download } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatAssessmentStatusLabel } from '../utils/assessmentStatusLabel';

function isLikelyUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function createEmptyAssessmentForm() {
    return {
        clientId: '',
        packId: '',
        assignedTo: '',
        assessmentDate: new Date().toISOString().split('T')[0],
    };
}

export function Assessments() {
    const { user, profile } = useAuth();

    // List State
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [statusFilter, setStatusFilter] = useState<'active' | 'submitted' | 'approved'>('active');
    const [loading, setLoading] = useState(true);
    const [activeExportId, setActiveExportId] = useState<string | null>(null);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [packs, setPacks] = useState<any[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [form, setForm] = useState(() => createEmptyAssessmentForm());
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
    const [duplicateId, setDuplicateId] = useState<string | null>(null);
    const [errorAlert, setErrorAlert] = useState<string | null>(null);

    /** Set by hash `#/assessments?client=…`; consumed when form clients load */
    const pendingClientFromHashRef = useRef<string | null>(null);

    const clearCreateDraft = () => {
        setForm(createEmptyAssessmentForm());
        setError(null);
        setDuplicateId(null);
        setSubmitting(false);
    };

    const openCreateFormFromAssessmentsPage = () => {
        pendingClientFromHashRef.current = null;
        clearCreateDraft();
        setShowForm(true);
    };

    useEffect(() => {
        // Click outside to close menus
        const handleClickOutside = () => setActiveExportId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        const syncClientFromHash = () => {
            const fullHash = window.location.hash;
            const base = fullHash.split('?')[0];
            if (base !== '#/assessments') return;

            const queryString = fullHash.includes('?')
                ? fullHash.split('?').slice(1).join('?')
                : '';
            const params = new URLSearchParams(queryString);

            const tab = params.get('tab');
            if (tab === 'submitted' || tab === 'approved' || tab === 'active') {
                setStatusFilter(tab);
            }

            const rawClient = params.get('client');
            const trimmed = typeof rawClient === 'string' ? rawClient.trim() : '';

            if (!trimmed) {
                if (params.has('client')) {
                    window.location.hash = '#/assessments';
                }
                return;
            }

            if (!isLikelyUuid(trimmed)) {
                window.location.hash = '#/assessments';
                return;
            }

            clearCreateDraft();
            pendingClientFromHashRef.current = trimmed;
            setShowForm(true);
        };

        syncClientFromHash();
        window.addEventListener('hashchange', syncClientFromHash);
        return () => window.removeEventListener('hashchange', syncClientFromHash);
    }, []);

    useEffect(() => {
        loadAssessments();
        if (showForm) {
            loadFormData();
        }
    }, [profile?.org_id, statusFilter, showForm]);

    const loadAssessments = () => {
        if (!profile?.org_id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        assessmentService.getByOrg(profile.org_id, statusFilter).then((data) => {
            setAssessments(data);
            setLoading(false);
        });
    };

    const loadFormData = () => {
        if (!profile?.org_id) return;

        const deepLinkUuidAtStart = pendingClientFromHashRef.current;

        Promise.all([
            clientService.getByOrg(profile.org_id, 'active'),
            packService.getByOrg(profile.org_id, 'active'),
            userService.getByOrg(profile.org_id),
        ]).then(([c, p, u]) => {
            setClients(c);
            setPacks(p);
            setUsers(u);

            if (!deepLinkUuidAtStart) return;
            const stillWaiting =
                pendingClientFromHashRef.current === deepLinkUuidAtStart;
            if (!stillWaiting) return;

            pendingClientFromHashRef.current = null;

            if (c.some((cl: { id: string }) => cl.id === deepLinkUuidAtStart)) {
                setForm((prev) => ({
                    ...prev,
                    clientId: deepLinkUuidAtStart,
                }));
                window.location.hash = '#/assessments';
            } else {
                clearCreateDraft();
                pendingClientFromHashRef.current = null;
                setShowForm(false);
                window.location.hash = '#/assessments';
            }
        });
    };

    const closeCreateForm = () => {
        pendingClientFromHashRef.current = null;
        clearCreateDraft();
        setShowForm(false);
        if (window.location.hash.startsWith('#/assessments?')) {
            window.location.hash = '#/assessments';
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.org_id || !user?.id) return;

        setSubmitting(true);
        const pack = packs.find(p => p.id === form.packId);

        if (!pack) {
            setError('Pack not found');
            setSubmitting(false);
            return;
        }

        try {
            setError(null);
            setDuplicateId(null);

            // Check for existing assessment
            const existing = await assessmentService.getByClientAndPack(profile.org_id, form.clientId, form.packId);
            if (existing) {
                setError(`An assessment for this client and pack already exists (${formatAssessmentStatusLabel(existing.status)}).`);
                setDuplicateId(existing.id);
                setSubmitting(false);
                return;
            }

            const assessment = await assessmentService.create(
                profile.org_id,
                form.clientId,
                form.packId,
                pack.pack_data,
                user.id,
                form.assignedTo || null,
                form.assessmentDate || null
            );
            window.location.hash = `#/assessment/${assessment.id}`;
        } catch (error: any) {
            console.error('Error creating assessment:', error);
            setError(error.message || 'Failed to create assessment.');
            setSubmitting(false);
        }
    };

    const handleExport = async (e: React.MouseEvent, id: string, format: 'long' | 'matrix') => {
        e.stopPropagation();
        setActiveExportId(null);
        try {
            await assessmentService.exportToCSV(id, format);
        } catch (err: any) {
            console.error('Export failed:', err);
            setErrorAlert('Failed to export CSV');
        }
    };

    if (loading && !assessments.length && !showForm) return <div className="text-center py-12">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
                    <p className="text-gray-600 mt-1">Manage and track client assessments</p>
                    {!showForm && ['admin', 'senior_therapist', 'therapist', 'viewer'].includes(profile?.role || '') && (
                        <p className="text-sm text-gray-500 mt-2 max-w-3xl leading-snug">
                            Active: draft and in-progress work · Submitted: awaiting review · Approved: finalized
                        </p>
                    )}
                </div>
                {!showForm && (
                    <div className="flex gap-3">
                        {['admin', 'senior_therapist', 'therapist', 'viewer'].includes(profile?.role || '') && (
                            <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
                                <button
                                    onClick={() => setStatusFilter('active')}
                                    className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setStatusFilter('submitted')}
                                    className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'submitted' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Submitted
                                </button>
                                <button
                                    onClick={() => setStatusFilter('approved')}
                                    className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'approved' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Approved
                                </button>
                            </div>
                        )}
                        {['admin', 'senior_therapist'].includes(profile?.role || '') && (
                            <button
                                onClick={openCreateFormFromAssessmentsPage}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition"
                            >
                                <Plus className="w-5 h-5" />
                                New Assessment
                            </button>
                        )}
                    </div>
                )}
            </div>

            {showForm ? (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="text-xl font-bold text-gray-900">Create New Assessment</h2>
                        <button
                            onClick={closeCreateForm}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                <p className="text-red-800 font-semibold">Error Creating Assessment</p>
                                <p className="text-red-700 text-sm mt-1">{error}</p>
                                {duplicateId && (
                                    <button
                                        type="button"
                                        onClick={() => window.location.hash = `#/assessment/${duplicateId}`}
                                        className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-bold py-2 px-4 rounded inline-flex items-center"
                                    >
                                        Open Existing Assessment &rarr;
                                    </button>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleCreateSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Client</label>
                                    <select
                                        value={form.clientId}
                                        onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        required
                                    >
                                        <option value="">Choose a client...</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Content Pack</label>
                                    <select
                                        value={form.packId}
                                        onChange={(e) => setForm({ ...form, packId: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        required
                                    >
                                        <option value="">Choose a content pack...</option>
                                        {packs.map((p) => (
                                            <option key={p.id} value={p.id}>{p.title} (v{p.version})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign To (Therapist)</label>
                                    <select
                                        value={form.assignedTo}
                                        onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Date</label>
                                    <input
                                        type="date"
                                        value={form.assessmentDate}
                                        onChange={(e) => setForm({ ...form, assessmentDate: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={closeCreateForm}
                                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg font-medium shadow-sm"
                                >
                                    {submitting ? 'Creating...' : 'Create Assessment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {assessments.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-200">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">No {statusFilter} assessments found</h3>
                            <p className="text-gray-500 mt-1">Get started by creating a new assessment.</p>
                            {['admin', 'senior_therapist', 'therapist'].includes(profile?.role || '') && (
                                <button
                                    onClick={openCreateFormFromAssessmentsPage}
                                    className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
                                >
                                    Create New Assessment
                                </button>
                            )}
                        </div>
                    )}

                    {assessments.map((assessment: any) => (
                        <div
                            key={assessment.id}
                            className="bg-white rounded-lg shadow hover:shadow-md transition border border-transparent hover:border-emerald-200 p-5 cursor-pointer group relative"
                        >
                            <div
                                onClick={() => window.location.hash = `#/assessment/${assessment.id}`}
                                className="pr-12" // Add padding for delete button
                            >
                                <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                                    {assessment.client?.first_name} {assessment.client?.last_name}
                                    <span className="text-gray-400 font-normal text-sm mx-1 min-w-4">•</span>
                                    <span className="text-gray-600 font-medium text-base">{assessment.pack?.title}</span>
                                </h3>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>{new Date(assessment.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {assessment.assigned_to && (
                                        <div className="flex items-center gap-1">
                                            <User className="w-4 h-4" />
                                            <span>Assigned</span>
                                        </div>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${assessment.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        assessment.status === 'submitted' ? 'bg-orange-100 text-orange-700' :
                                            assessment.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {formatAssessmentStatusLabel(assessment.status)}
                                    </span>
                                </div>
                            </div>

                            <div className="absolute top-5 right-5 flex items-center gap-2">
                                {/* Export Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveExportId(activeExportId === assessment.id ? null : assessment.id);
                                        }}
                                        className="text-gray-400 hover:text-emerald-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                                        title="Export Assessment"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>

                                    {activeExportId === assessment.id && (
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                            <button
                                                onClick={(e) => handleExport(e, assessment.id, 'matrix')}
                                                className="block w-full text-left px-4 py-3 text-gray-800 hover:bg-emerald-50/60 border-b border-gray-100 last:border-b-0"
                                            >
                                                <span className="block text-sm font-semibold text-gray-900">Export Matrix CSV</span>
                                                <span className="block text-xs font-semibold text-emerald-800 mt-1">Includes all cycles</span>
                                                <span className="block text-[11px] text-gray-600 mt-1 leading-snug">
                                                    Full assessment history — not only the cycle on screen.
                                                </span>
                                            </button>
                                            <button
                                                onClick={(e) => handleExport(e, assessment.id, 'long')}
                                                className="block w-full text-left px-4 py-3 text-gray-800 hover:bg-emerald-50/60"
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

                                <div
                                    onClick={() => window.location.hash = `#/assessment/${assessment.id}`}
                                    className="text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center"
                                >
                                    Open →
                                </div>
                                {['admin', 'senior_therapist'].includes(profile?.role || '') && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteConfirm({
                                                id: assessment.id,
                                                name: `${assessment.client?.first_name} ${assessment.client?.last_name} - ${assessment.pack?.title}`
                                            });
                                        }}
                                        className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="Delete Assessment"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <ConfirmDialog
                isOpen={!!deleteConfirm}
                title="Delete Assessment"
                message={`Are you sure you want to delete the assessment for ${deleteConfirm?.name}? This action cannot be undone.`}
                confirmText="Delete Assessment"
                isDestructive={true}
                onConfirm={async () => {
                    if (!deleteConfirm || !profile?.org_id || !user?.id) return;
                    try {
                        await assessmentService.delete(deleteConfirm.id, profile.org_id, user.id);
                        setDeleteConfirm(null);
                        loadAssessments();
                    } catch (err: any) {
                        console.error('Error deleting assessment:', err);
                        setErrorAlert('Failed to delete assessment: ' + err.message);
                        setDeleteConfirm(null);
                    }
                }}
                onCancel={() => setDeleteConfirm(null)}
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
