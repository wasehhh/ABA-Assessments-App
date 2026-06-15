export type AssessmentViewMode = 'domains' | 'landscape';

interface Props {
    value: AssessmentViewMode;
    onChange: (value: AssessmentViewMode) => void;
}

const OPTIONS: { value: AssessmentViewMode; label: string }[] = [
    { value: 'domains', label: 'Domains' },
    { value: 'landscape', label: 'Landscape' },
];

export function AssessmentViewToggle({ value, onChange }: Props) {
    return (
        <div
            className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
            role="group"
            aria-label="Assessment view"
        >
            {OPTIONS.map((option) => {
                const isActive = value === option.value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        aria-pressed={isActive}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                            isActive
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
