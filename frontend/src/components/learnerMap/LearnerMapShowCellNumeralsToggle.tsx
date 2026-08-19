interface Props {
    checked: boolean;
    onChange: (showCellNumerals: boolean) => void;
}

export function LearnerMapShowCellNumeralsToggle({ checked, onChange }: Props) {
    return (
        <label
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
            data-learner-map-show-cell-numerals-toggle
            title="Show or hide raw score numerals in grid cells. Hiding is visual only — scores remain in this document."
        >
            <input
                type="checkbox"
                className="mt-0.5"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
            />
            Show cell numerals
        </label>
    );
}
