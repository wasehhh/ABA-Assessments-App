import { describe, expect, it } from 'vitest';
import {
    buildFinalizedReportRouteHash,
    shouldShowFinalizedReportEntry,
    shouldShowReportAuthoringEntry,
} from './assessmentMatrixReportEntry';

describe('assessmentMatrixReportEntry finalized route', () => {
    it('builds finalized report hash with cycleId query param', () => {
        expect(buildFinalizedReportRouteHash('assess-1', 'cycle-2')).toBe(
            '#/assessment/assess-1/report/finalized?cycleId=cycle-2'
        );
    });

    it('shows finalized entry only when approved, finalized exists, and role can view', () => {
        expect(
            shouldShowFinalizedReportEntry('approved', 'therapist', true)
        ).toBe(true);
        expect(
            shouldShowFinalizedReportEntry('approved', 'viewer', true)
        ).toBe(true);
        expect(
            shouldShowFinalizedReportEntry('approved', 'therapist', false)
        ).toBe(false);
        expect(
            shouldShowFinalizedReportEntry('in_progress', 'admin', true)
        ).toBe(false);
    });

    it('keeps authoring entry separate from finalized entry', () => {
        expect(shouldShowReportAuthoringEntry('approved', 'therapist')).toBe(false);
        expect(shouldShowReportAuthoringEntry('approved', 'admin')).toBe(true);
        expect(
            shouldShowFinalizedReportEntry('approved', 'admin', true)
        ).toBe(true);
    });
});
