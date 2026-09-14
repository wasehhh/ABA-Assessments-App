import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Users, ClipboardList, BarChart3, ShieldCheck, Activity, Lock } from 'lucide-react';
import type { Role } from '@/types';

const navItems = [
  { to: '/', label: 'Learners', icon: Users, end: true },
  { to: '/sessions', label: 'Sessions', icon: ClipboardList },
  { to: '/graphs', label: 'Progress', icon: BarChart3 },
  { to: '/review', label: 'Review', icon: ShieldCheck, supervisorOnly: true },
  { to: '/protocols', label: 'Protocols', icon: Lock, disabled: true },
];

export function Layout({
  children,
  role,
  onRoleChange,
}: {
  children: ReactNode;
  role: Role;
  onRoleChange: (r: Role) => void;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent-600" />
              <span className="font-semibold text-gray-900">Evalis</span>
              <span className="text-xs font-normal text-gray-400">Programming</span>
            </div>
          </div>

          {/* Role toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Role:</span>
            <div className="flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
              <button
                onClick={() => onRoleChange('therapist')}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  role === 'therapist'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Therapist
              </button>
              <button
                onClick={() => onRoleChange('supervisor')}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  role === 'supervisor'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Supervisor / BCBA
              </button>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="mx-auto max-w-7xl px-4">
          <div className="flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.disabled) {
                return (
                  <span
                    key={item.label}
                    className="flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm text-gray-400"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                );
              }
              if (item.supervisorOnly && role !== 'supervisor') return null;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-accent-600 text-accent-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
