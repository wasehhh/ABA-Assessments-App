import { useEffect, useState, type ComponentType } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { ContentPacks } from './pages/ContentPacks';
import { Assessments } from './pages/Assessments';
import { AssessmentMatrix } from './pages/AssessmentMatrix';
import { Users } from './pages/Users';
import { AssessmentReport } from './pages/AssessmentReport';
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

function AppRouter() {
  const { user, loading, error } = useAuth();
  const [route, setRoute] = useState(window.location.hash || '#/login');

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || '#/login');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }
    if (!loading && !user && route !== '#/login') {
      window.location.hash = '#/login';
    }
  }, [user, loading, route]);

  if (import.meta.env.DEV && route.split('?')[0] === '#/dev/learner-map') {
    return <DevLearnerMapRouteLoader />;
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

  const reportMatch = route.match(/#\/assessment\/([^\/]+)\/report/);
  if (reportMatch) {
    // Standalone layout for report
    return <AssessmentReport assessmentId={reportMatch[1]} />;
  }

  const assessmentMatch = route.match(/#\/assessment\/([^\/]+)/);
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
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
