import { ReactNode, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clipboard, LogOut, LayoutDashboard, Users, Package, FileText, Menu, X, Settings, Shield, Building2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
  const { profile, signOut, debugSetRole } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.hash = '#/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Clipboard className="w-8 h-8 text-emerald-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">Evalis</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => window.location.hash = '#/dashboard'} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>
              <button onClick={() => window.location.hash = '#/clients'} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                <Users className="w-5 h-5" />
                <span className="font-medium">Clients</span>
              </button>
              <button onClick={() => window.location.hash = '#/packs'} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                <Package className="w-5 h-5" />
                <span className="font-medium">Packs</span>
              </button>
              <button onClick={() => window.location.hash = '#/assessments'} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                <FileText className="w-5 h-5" />
                <span className="font-medium">Assessments</span>
              </button>
              {profile?.role === 'admin' && (
                <button onClick={() => window.location.hash = '#/users'} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Team</span>
                </button>
              )}
              {profile?.role === 'admin' && (
                <>
                  <button onClick={() => window.location.hash = '#/org-settings'} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                    <Building2 className="w-5 h-5" />
                    <span className="font-medium">Org</span>
                  </button>
                  <button onClick={() => window.location.hash = '#/audit-log'} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Audit</span>
                  </button>
                </>
              )}
            </div>

            {/* Desktop Profile & Logout */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <button
                  onClick={() => window.location.hash = '#/settings'}
                  className="hover:text-emerald-600 transition group text-right"
                >
                  <p className="text-sm font-medium text-gray-900 group-hover:text-emerald-600 transition">{profile?.full_name}</p>
                  <span className="text-xs text-gray-500 capitalize group-hover:text-emerald-500 transition block">
                    {profile?.role?.replace('_', ' ')}
                  </span>
                </button>
                {/* Debug select logic removed for clean link wrap, moved debug select below if needed or just remove it for this view.
                    It was: if profile email is waseh... show select. 
                    Let's keep the debug select separately so it doesn't break the layout. 
                 */}
                {profile?.email === 'waseh.niazi@gmail.com' && (
                  <select
                    value={profile?.role}
                    onChange={(e) => debugSetRole(e.target.value)}
                    className="text-xs text-gray-500 capitalize bg-transparent border-none p-0 cursor-pointer focus:ring-0 text-right block ml-auto mt-0.5"
                    title="Debug: Switch Role"
                  >
                    <option value="admin">Admin</option>
                    <option value="senior_therapist">Senior Therapist</option>
                    <option value="therapist">Therapist</option>
                    <option value="viewer">Viewer</option>
                  </select>
                )}
              </div>
              <button
                onClick={() => window.location.hash = '#/settings'}
                className="text-gray-400 hover:text-emerald-600 transition"
                title="Account Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-gray-200 mx-2"></div>
              <button onClick={handleSignOut} className="text-gray-600 hover:text-gray-900 transition" title="Sign Out">
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
              <button onClick={() => { window.location.hash = '#/dashboard'; setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-50">Dashboard</button>
              <button onClick={() => { window.location.hash = '#/clients'; setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-50">Clients</button>
              <button onClick={() => { window.location.hash = '#/packs'; setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-50">Packs</button>
              <button onClick={() => { window.location.hash = '#/assessments'; setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-50">Assessments</button>
              {profile?.role === 'admin' && (
                <button onClick={() => { window.location.hash = '#/users'; setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-50">Team</button>
              )}
              <div className="border-t border-gray-200 my-2 pt-2">
                <div className="px-3 py-2 flex items-center justify-between">
                  <button onClick={() => { window.location.hash = '#/settings'; setIsMobileMenuOpen(false); }}>
                    <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                  </button>
                  <button
                    onClick={() => { window.location.hash = '#/settings'; setIsMobileMenuOpen(false); }}
                    className="p-2 text-gray-400 hover:text-emerald-600"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
                <button onClick={handleSignOut} className="block w-full text-left px-3 py-2 text-red-600 font-medium hover:bg-red-50">Sign Out</button>
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
            <button className="hover:text-emerald-600">Privacy Policy</button>
            <span className="text-gray-300">|</span>
            <button className="hover:text-emerald-600">Terms of Service</button>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              PHIPA Compliant
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
