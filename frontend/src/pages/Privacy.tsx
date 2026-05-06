export function Privacy() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Privacy Policy (Alpha Version)</h1>
        <p className="mt-1 text-sm text-gray-500">
          Evalis is currently in a limited Alpha testing phase.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>During this phase:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Data is stored using Supabase infrastructure</li>
            <li>Access is restricted to authorized users within your organization</li>
            <li>We do not share data with third parties</li>
          </ul>

          <p>
            This version is not intended for production clinical use. Policies and protections will be expanded before
            full release.
          </p>

          <p className="text-gray-600">
            For questions, contact: <span className="font-medium">waseh.niazi@gmail.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}

