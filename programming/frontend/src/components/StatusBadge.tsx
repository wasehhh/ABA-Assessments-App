import type { ReactNode } from 'react';

type Variant = 'gray' | 'green' | 'blue' | 'amber' | 'red' | 'accent';

const variantClasses: Record<Variant, string> = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  accent: 'bg-accent-100 text-accent-700',
};

export function StatusBadge({
  children,
  variant = 'gray',
}: {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}

// Program status → badge variant
export function ProgramStatusBadge({ status }: { status: string }) {
  const map: Record<string, Variant> = {
    draft: 'gray',
    active: 'green',
    'on-hold': 'amber',
    completed: 'blue',
  };
  return <StatusBadge variant={map[status] ?? 'gray'}>{status}</StatusBadge>;
}

export function TargetStatusBadge({ status }: { status: string }) {
  const map: Record<string, Variant> = {
    active: 'green',
    'on-hold': 'amber',
    mastered: 'accent',
  };
  return <StatusBadge variant={map[status] ?? 'gray'}>{status}</StatusBadge>;
}

export function LearnerStatusBadge({ status }: { status: string }) {
  const map: Record<string, Variant> = {
    active: 'green',
    paused: 'amber',
    discharged: 'gray',
  };
  return <StatusBadge variant={map[status] ?? 'gray'}>{status}</StatusBadge>;
}
