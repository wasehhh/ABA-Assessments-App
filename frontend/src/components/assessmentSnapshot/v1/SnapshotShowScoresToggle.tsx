interface Props {
    checked: boolean;
    onChange: (showScores: boolean) => void;
}

export function SnapshotShowScoresToggle({ checked, onChange }: Props) {
    return (
        <label
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
            data-assessment-snapshot-show-scores-toggle
        >
            <input
                type="checkbox"
                className="mt-0.5"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
            />
            Show bead numerals
        </label>
    );
}