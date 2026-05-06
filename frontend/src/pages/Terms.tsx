export function Terms() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Terms of Service (Alpha Version)</h1>
        <p className="mt-1 text-sm text-gray-500">Evalis is currently in an Alpha testing phase.</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>By using this application:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You understand this is a pre-release product</li>
            <li>You agree not to rely on it for critical clinical decision-making</li>
            <li>You acknowledge that features and behavior may change</li>
          </ul>

          <p>This version is provided for testing and feedback purposes only.</p>
        </div>
      </div>
    </div>
  );
}

