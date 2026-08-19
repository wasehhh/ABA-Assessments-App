import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
    __dirname,
    '../../../database/migrations/20260819_assessment_communication_reports.sql'
);

describe('assessment_communication_reports migration RLS', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    it('creates the assessment_communication_reports table with expected columns', () => {
        expect(sql).toContain('create table assessment_communication_reports');
        expect(sql).toContain('authoring jsonb');
        expect(sql).toContain('embedded_computed jsonb');
        expect(sql).toContain("check (status in ('draft', 'finalized', 'superseded'))");
        expect(sql).toContain('assessment_communication_reports_one_draft_per_scope');
    });

    it('enables RLS and enforces org boundary on select', () => {
        expect(sql).toContain('enable row level security');
        expect(sql).toContain('View communication reports in org');
        expect(sql).toContain('org_id = get_my_org_id()');
    });

    it('restricts draft visibility to admin, senior_therapist, and therapist', () => {
        expect(sql).toContain("status in ('finalized', 'superseded')");
        expect(sql).toContain("role in ('admin', 'senior_therapist', 'therapist')");
    });

    it('restricts insert/update to admin and senior_therapist with approved assessment gate', () => {
        expect(sql).toContain('Insert communication reports in org');
        expect(sql).toContain('Update communication reports in org');
        expect(sql).toContain("role in ('admin', 'senior_therapist')");
        expect(sql).toContain("status = 'approved'");
        expect(sql).toMatch(/insert[\s\S]*assessments[\s\S]*status = 'approved'/i);
        expect(sql).toMatch(/update[\s\S]*assessments[\s\S]*status = 'approved'/i);
    });
});
