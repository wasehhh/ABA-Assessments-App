import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  __dirname,
  '../../../database/migrations/20260827_assessment_scores_cycle_target_unique.sql'
);

describe('assessment_scores cycle-target unique constraint', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  it('the constraint being scoped to include assessment_id', () => {
    expect(sql).toMatch(
      /ADD CONSTRAINT\s+assessment_scores_cycle_target_unique\s+UNIQUE\s*\(\s*assessment_cycle_id\s*,\s*target_id\s*\)/i
    );

    const uniqueClauses = [...sql.matchAll(/UNIQUE\s*\(([^)]+)\)/gi)];
    expect(uniqueClauses.length).toBe(1);
    const columns = uniqueClauses[0][1].split(',').map((column) => column.trim());
    expect(columns).toEqual(['assessment_cycle_id', 'target_id']);
    expect(columns).not.toContain('assessment_id');
  });
});
