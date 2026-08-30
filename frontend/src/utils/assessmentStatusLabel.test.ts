import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    formatAssignmentPresenceLabel,
    shouldShowSubmissionDate,
} from './assessmentStatusLabel';

const targetEditorSource = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../components/AssessmentBuilderTargetEditor.tsx'),
    'utf8'
);

describe('assessment status display', () => {
    it('labels assignment presence separately from workflow status', () => {
        expect(formatAssignmentPresenceLabel(true)).toBe('Has assignee');
        expect(formatAssignmentPresenceLabel(false)).toBeNull();
        expect(formatAssignmentPresenceLabel(true)).not.toBe('Assigned');
    });

    it('shows Submitted date only while the record is in the Submitted bucket', () => {
        expect(shouldShowSubmissionDate('submitted', '2026-08-27T00:00:00.000Z')).toBe(true);
        expect(shouldShowSubmissionDate('in_progress', '2026-08-27T00:00:00.000Z')).toBe(false);
        expect(shouldShowSubmissionDate('approved', '2026-08-27T00:00:00.000Z')).toBe(false);
        expect(shouldShowSubmissionDate('submitted', null)).toBe(false);
    });
});

describe('builder target ID empty state', () => {
    it('uses a visible e.g. placeholder and does not rely on native required', () => {
        expect(targetEditorSource).toContain('placeholder="e.g., A1"');
        expect(targetEditorSource).not.toMatch(/placeholder="A1"/);
        expect(targetEditorSource).toMatch(/placeholder="e.g., A1"\s*\/>/);
    });
});
