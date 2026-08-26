import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    navigateWithOptionalGuard,
    useOptionalAssessmentBuilderNavigationGuard,
} from '../context/AssessmentBuilderNavigationGuard';
import { Clipboard, LayoutDashboard, Users, Package, FileText, Menu, X, Settings, Shield, Building2, ChevronDown } from 'lucide-react';

interface Props {
  children: ReactNode;
}

const drawerItemClass =
  'block w-full min-h-11 text-left px-3 py-2.5 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-50';

export function Layout({ children }: Props) {
  const { profile, signOut } = useAuth();
  const navigationGuard = useOptionalAssessmentBuilderNavigationGuard();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const handleClickOutside = () => setShowAccountMenu(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const navigate = (targetHash: string) => {
    navigateWithOptionalGuard(navigationGuard, targetHash);
  };

  const handleSignOut = async () => {
    const performSignOut = async () => {
      await signOut();
      window.location.hash = '#/login';
    };
    if (navigationGuard?.isBlocking) {
      navigationGuard.requestLocalAction(() => {
        void performSignOut();
      });
      return;
    }
    await performSignOut();
  };

  const closeDrawerAndNavigate = (targetHash: string) => {
    navigate(targetHash);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center shrink-0">
              <Clipboard className="w-8 h-8 text-emerald-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">Evalis</span>
            </div>

            {/* Desktop Navigation — lg (1024) per tablet contract §3.1 */}
            <div className="hidden lg:flex items-center gap-4 xl:gap-6 shrink-0" data-layout-desktop-nav>
              <button onClick={() => navigate('#/dashboard')} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>
              <button onClick={() => navigate('#/clients')} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                <Users className="w-5 h-5" />
                <span className="font-medium">Clients</span>
              </button>
              <button onClick={() => navigate('#/packs')} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                <Package className="w-5 h-5" />
                <span className="font-medium">Packs</span>
              </button>
              <button onClick={() => navigate('#/assessments')} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                <FileText className="w-5 h-5" />
                <span className="font-medium">Assessments</span>
              </button>
              {isAdmin && (
                <button onClick={() => navigate('#/users')} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Team</span>
                </button>
              )}
              {isAdmin && (
                <>
                  <button onClick={() => navigate('#/org-settings')} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                    <Building2 className="w-5 h-5" />
                    <span className="font-medium">Org</span>
                  </button>
                  <button onClick={() => navigate('#/audit-log')} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Audit</span>
                  </button>
                </>
              )}
            </div>

            {/* Desktop Profile & Account — lg (1024); single Account menu per §3.1 amendment */}
            <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0" data-layout-desktop-account>
              <div className="text-right max-w-[7rem]">
                <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name}</p>
                <span className="text-xs text-gray-500 capitalize block">
                  {profile?.role?.replace('_', ' ')}
                </span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAccountMenu(!showAccountMenu);
                  }}
                  className="inline-flex items-center gap-1.5 min-h-11 min-w-11 px-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-gray-50 transition"
                  aria-label="Account"
                  aria-expanded={showAccountMenu}
                  aria-haspopup="menu"
                  data-layout-desktop-account-trigger
                >
                  <Settings className="w-5 h-5" aria-hidden />
                  <span>Account</span>
                  <ChevronDown className="w-4 h-4" aria-hidden />
                </button>
                {showAccountMenu && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                    role="menu"
                    data-layout-desktop-account-menu
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        navigate('#/settings');
                        setShowAccountMenu(false);
                      }}
                      className="block w-full min-h-11 text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-emerald-600"
                    >
                      Account Settings
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowAccountMenu(false);
                        void handleSignOut();
                      }}
                      className="block w-full min-h-11 text-left px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      aria-label="Sign Out"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Compact menu button — below lg (Tablet + Phone) */}
            <div className="lg:hidden flex items-center">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center min-h-11 min-w-11 text-gray-600 hover:text-gray-900 rounded-lg"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" aria-hidden /> : <Menu className="w-6 h-6" aria-hidden />}
              </button>
            </div>
          </div>
        </div>

        {/* Compact drawer — below lg; Org/Audit admin-gated; scoring vs secondary grouping per §3.2 */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100" data-layout-compact-drawer>
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
              <button
                type="button"
                onClick={() => closeDrawerAndNavigate('#/clients')}
                className={drawerItemClass}
              >
                Clients
              </button>
              <button
                type="button"
                onClick={() => closeDrawerAndNavigate('#/assessments')}
                className={drawerItemClass}
              >
                Assessments
              </button>

              <div className="border-t border-gray-200 my-2 pt-2" data-layout-drawer-secondary>
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  More
                </p>
                <button
                  type="button"
                  onClick={() => closeDrawerAndNavigate('#/dashboard')}
                  className={drawerItemClass}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => closeDrawerAndNavigate('#/packs')}
                  className={drawerItemClass}
                >
                  Packs
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => closeDrawerAndNavigate('#/users')}
                    className={drawerItemClass}
                  >
                    Team
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => closeDrawerAndNavigate('#/org-settings')}
                    className={drawerItemClass}
                    data-layout-drawer-org
                  >
                    Org
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => closeDrawerAndNavigate('#/audit-log')}
                    className={drawerItemClass}
                    data-layout-drawer-audit
                  >
                    Audit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => closeDrawerAndNavigate('#/settings')}
                  className={drawerItemClass}
                >
                  Account Settings
                </button>
              </div>

              <div className="border-t border-gray-200 my-2 pt-2">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="block w-full min-h-11 text-left px-3 py-2.5 text-red-600 font-medium hover:bg-red-50 rounded-md"
                  aria-label="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p className="mb-2">&copy; {new Date().getFullYear()} Evalis. All rights reserved.</p>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('#/privacy')}
              className="hover:text-emerald-600"
            >
              Privacy Policy
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => navigate('#/terms')}
              className="hover:text-emerald-600"
            >
              Terms of Service
            </button>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Designed with PHIPA considerations
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
