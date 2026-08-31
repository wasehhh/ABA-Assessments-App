import { describe, expect, it } from 'vitest';
import {
    ASSESSMENT_SNAPSHOT_ENTRY_LABEL,
    COMMUNICATION_REPORT_ENTRY_LABEL,
    WRITE_REPORT_ENTRY_LABEL,
    buildFinalizedReportRouteHash,
    buildVersionHistoryRouteHash,
    readFinalizedReportVersionQueryFromHash,
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

    it('exposes Matrix document-door UI labels without renaming routes', () => {
        expect(ASSESSMENT_SNAPSHOT_ENTRY_LABEL).toBe('Assessment Snapshot');
        expect(WRITE_REPORT_ENTRY_LABEL).toBe('Write Report');
        expect(COMMUNICATION_REPORT_ENTRY_LABEL).toBe('Communication Report');
        expect(buildFinalizedReportRouteHash('assess-1', 'cycle-2')).toContain(
            '/report/finalized'
        );
    });
});

describe('report version history routes', () => {
    it('builds history and versioned finalized hashes; omitted version stays current', () => {
        expect(buildVersionHistoryRouteHash('assess-1', 'cycle-2')).toBe(
            '#/assessment/assess-1/report/versions?cycleId=cycle-2'
        );
        expect(buildFinalizedReportRouteHash('assess-1', 'cycle-2')).toBe(
            '#/assessment/assess-1/report/finalized?cycleId=cycle-2'
        );
        expect(buildFinalizedReportRouteHash('assess-1', 'cycle-2', 3)).toBe(
            '#/assessment/assess-1/report/finalized?cycleId=cycle-2&version=3'
        );
        expect(readFinalizedReportVersionQueryFromHash('#/assessment/a/report/finalized?cycleId=c')).toEqual(
            { kind: 'current' }
        );
        expect(
            readFinalizedReportVersionQueryFromHash(
                '#/assessment/a/report/finalized?cycleId=c&version=2'
            )
        ).toEqual({ kind: 'specific', version: 2 });
        expect(
            readFinalizedReportVersionQueryFromHash(
                '#/assessment/a/report/finalized?cycleId=c&version=nope'
            )
        ).toEqual({ kind: 'invalid' });
    });
});
