import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
