import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { assessmentService } from '../services/assessments';
import { clientService } from '../services/clients';
import { packService } from '../services/packs';
import { Users, FileText, CheckCircle, Package } from 'lucide-react';
import {
  DataLoadErrorPanel,
  DataLoadContent,
  DataLoadSpinner,
} from '../components/DataLoadSurface';
import {
  executeProtectedLoad,
  type DataLoadState,
} from '../utils/dataLoadHonesty';

export function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ clients: 0, assessments: 0, packs: 0, approved: 0 });
  const [loadState, setLoadState] = useState<DataLoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const loadDashboard = async () => {
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
      load: () =>
        Promise.all([
          clientService.getByOrg(profile.org_id),
          assessmentService.getByOrg(profile.org_id),
          packService.getByOrg(profile.org_id),
        ]),
    });

    if (result.kind === 'stale') {
      return;
    }

    if (result.kind === 'error') {
      setLoadError(
        'We could not load dashboard totals. Try again — your data has not changed.'
      );
      setLoadState('error');
      return;
    }

    const [clients, assessments, packs] = result.data;
    setStats({
      clients: clients.length,
      assessments: assessments.length,
      packs: packs.length,
      approved: assessments.filter((a) => a.status === 'approved').length,
    });
    setLoadState('loaded');
  };

  useEffect(() => {
    void loadDashboard();
  }, [profile?.org_id]);

  if (loadState === 'loading') {
    return <DataLoadSpinner label="Loading dashboard…" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {profile?.full_name}</p>
      </div>

      {loadState === 'error' ? (
        <DataLoadErrorPanel
          title="Dashboard could not be loaded"
          message={loadError ?? ''}
          onRetry={() => void loadDashboard()}
          retryLabel="Retry loading dashboard"
          className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
        />
      ) : (
        <DataLoadContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard icon={Users} title="Clients" value={stats.clients} color="teal" />
            <StatCard icon={FileText} title="Assessments" value={stats.assessments} color="green" />
            <StatCard icon={CheckCircle} title="Approved" value={stats.approved} color="emerald" />
            <StatCard icon={Package} title="Content Packs" value={stats.packs} color="orange" />
          </div>
        </DataLoadContent>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions role={profile?.role || 'viewer'} />
        <RecentActivity />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, color }: any) {
  const colors: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-600',
    green: 'bg-green-50 text-green-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`inline-block p-3 rounded-lg ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-gray-600 text-sm font-medium mt-3">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function QuickActions({ role }: { role: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="space-y-2">
        {['admin', 'senior_therapist', 'therapist'].includes(role) && (
          <button
            onClick={() => (window.location.hash = '#/clients')}
            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
          >
            <span className="font-medium text-gray-900">Manage Clients</span>
          </button>
        )}

        {['admin', 'senior_therapist', 'therapist'].includes(role) && (
          <button
            onClick={() => (window.location.hash = '#/assessments')}
            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
          >
            <span className="font-medium text-gray-900">Start Assessment</span>
          </button>
        )}

        {['admin', 'senior_therapist'].includes(role) && (
          <button
            onClick={() => (window.location.hash = '#/packs')}
            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
          >
            <span className="font-medium text-gray-900">Manage Content Packs</span>
          </button>
        )}

        {role === 'admin' && (
          <button
            onClick={() => (window.location.hash = '#/users')}
            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
          >
            <span className="font-medium text-gray-900">Manage Team</span>
          </button>
        )}
      </div>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      <p className="text-gray-500 text-sm">No recent activity</p>
    </div>
  );
}
