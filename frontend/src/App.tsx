import { useEffect, useState, useRef, type ComponentType } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AssessmentBuilderNavigationGuardProvider, useAssessmentBuilderNavigationGuard } from './context/AssessmentBuilderNavigationGuard';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { ContentPacks } from './pages/ContentPacks';
import { PackBuilder } from './pages/PackBuilder';
import { resolvePacksLocation } from './pages/packBuilderRoutes';
import { Assessments } from './pages/Assessments';
import { AssessmentMatrix } from './pages/AssessmentMatrix';
import { Users } from './pages/Users';
import { FinalizedAssessmentReport } from './pages/FinalizedAssessmentReport';
import { ReportAuthoring } from './pages/ReportAuthoring';
import { AssessmentLearnerMap } from './pages/AssessmentLearnerMap';
import { AssessmentLearnerMapExport } from './pages/AssessmentLearnerMapExport';
import { AssessmentSnapshot } from './pages/AssessmentSnapshot';
import { AssessmentSnapshotExport } from './pages/AssessmentSnapshotExport';
import { Settings } from './pages/Settings';
import { AuditLog } from './pages/AuditLog';
import { OrgSettings } from './pages/OrgSettings';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';

function DevLearnerMapRouteLoader() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    void import('./pages/dev/LearnerMapPreview').then((mod) => {
      setPreview(() => mod.LearnerMapPreview);
    });
  }, []);

  if (!Preview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading preview...</div>
      </div>
    );
  }

  return <Preview />;
}

function DevLearnerMapExportRouteLoader() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    void import('./pages/dev/LearnerMapExportPreview').then((mod) => {
      setPreview(() => mod.LearnerMapExportPreview);
    });
  }, []);

  if (!Preview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading export preview...</div>
      </div>
    );
  }

  return <Preview />;
}

function DevAssessmentSnapshotRouteLoader() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    void import('./pages/dev/AssessmentSnapshotPreview').then((mod) => {
      setPreview(() => mod.AssessmentSnapshotPreview);
    });
  }, []);

  if (!Preview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading assessment snapshot preview...</div>
      </div>
    );
  }

  return <Preview />;
}

function AppRouter() {
  const { user, loading, error } = useAuth();
  const navigationGuard = useAssessmentBuilderNavigationGuard();
  const [route, setRoute] = useState(window.location.hash || '#/login');
  const routeRef = useRef(route);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash || '#/login';
      if (
        navigationGuard.isBlocking &&
        newHash !== routeRef.current
      ) {
        window.history.replaceState(null, '', routeRef.current || '#/dashboard');
        navigationGuard.requestNavigation(newHash);
        return;
      }
      routeRef.current = newHash;
      setRoute(newHash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [navigationGuard]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }
    if (!loading && !user && route !== '#/login') {
      if (navigationGuard.isBlocking) {
        navigationGuard.requestNavigation('#/login');
        return;
      }
      window.location.hash = '#/login';
    }
  }, [user, loading, route, navigationGuard]);

  if (import.meta.env.DEV && route.split('?')[0] === '#/dev/learner-map') {
    return <DevLearnerMapRouteLoader />;
  }

  if (import.meta.env.DEV && route.split('?')[0] === '#/dev/learner-map-export') {
    return <DevLearnerMapExportRouteLoader />;
  }

  if (import.meta.env.DEV && route.split('?')[0] === '#/dev/assessment-snapshot') {
    return <DevAssessmentSnapshotRouteLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-600">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-2 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">System Verification Failed</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="bg-gray-50 rounded p-4 text-sm text-gray-500 font-mono overflow-x-auto">
            Please check your .env file and database configuration.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading application...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const baseRoute = route.split('?')[0];

  const reportEditMatch = baseRoute.match(/^#\/assessment\/([^\/]+)\/report\/edit$/);
  if (reportEditMatch) {
    return (
      <Layout>
        <ReportAuthoring assessmentId={reportEditMatch[1]} />
      </Layout>
    );
  }

  const finalizedReportMatch = baseRoute.match(/^#\/assessment\/([^\/]+)\/report\/finalized$/);
  if (finalizedReportMatch) {
    return <FinalizedAssessmentReport assessmentId={finalizedReportMatch[1]} />;
  }

  const learnerMapExportMatch = baseRoute.match(/^#\/assessment\/([^\/]+)\/learner-map\/export$/);
  if (learnerMapExportMatch) {
    return <AssessmentLearnerMapExport assessmentId={learnerMapExportMatch[1]} />;
  }

  const learnerMapMatch = baseRoute.match(/^#\/assessment\/([^\/]+)\/learner-map$/);
  if (learnerMapMatch) {
    return (
      <Layout>
        <AssessmentLearnerMap assessmentId={learnerMapMatch[1]} />
      </Layout>
    );
  }

  const snapshotExportMatch = baseRoute.match(/^#\/assessment\/([^\/]+)\/snapshot\/export$/);
  if (snapshotExportMatch) {
    return <AssessmentSnapshotExport assessmentId={snapshotExportMatch[1]} />;
  }

  const snapshotMatch = baseRoute.match(/^#\/assessment\/([^\/]+)\/snapshot$/);
  if (snapshotMatch) {
    return (
      <Layout>
        <AssessmentSnapshot assessmentId={snapshotMatch[1]} />
      </Layout>
    );
  }

  const assessmentMatch = baseRoute.match(/^#\/assessment\/([^\/]+)$/);
  if (assessmentMatch) {
    return (
      <Layout>
        <AssessmentMatrix assessmentId={assessmentMatch[1]} />
      </Layout>
    );
  }

  const clientMatch = route.match(/#\/client\/([^\/]+)/);
  if (clientMatch) {
    return (
      <Layout>
        <ClientDetail clientId={clientMatch[1]} />
      </Layout>
    );
  }

  const renderPage = () => {
    const baseRoute = route.split('?')[0];
    const packsLocation = resolvePacksLocation(baseRoute);
    if (packsLocation.kind === 'builder-new') {
      return <PackBuilder />;
    }
    if (packsLocation.kind === 'builder-edit') {
      return <PackBuilder packId={packsLocation.packId} />;
    }
    switch (baseRoute) {
      case '#/dashboard':
        return <Dashboard />;
      case '#/clients':
        return <Clients />;
      case '#/packs':
        return <ContentPacks />;
      case '#/assessments':
        return <Assessments />;
      case '#/users':
        return <Users />;
      case '#/settings':
        return <Settings />;
      case '#/privacy':
        return <Privacy />;
      case '#/terms':
        return <Terms />;
      case '#/org-settings':
        return <OrgSettings />;
      case '#/audit-log':
        return <AuditLog />;
      default:
        return <Dashboard />;
    }
  };

  return <Layout>{renderPage()}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <AssessmentBuilderNavigationGuardProvider>
        <AppRouter />
      </AssessmentBuilderNavigationGuardProvider>
    </AuthProvider>
  );
}

export default App;
