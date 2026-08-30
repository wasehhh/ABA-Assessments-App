import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(fileURLToPath(import.meta.url));

const matrixSource = readFileSync(resolve(root, './AssessmentMatrix.tsx'), 'utf8');
const scoreboardSource = readFileSync(
    resolve(root, '../components/assessment/DomainScoreboard.tsx'),
    'utf8'
);
const detailModalSource = readFileSync(
    resolve(root, '../components/assessment/TargetDetailModal.tsx'),
    'utf8'
);
const loginSource = readFileSync(resolve(root, './Login.tsx'), 'utf8');

describe('Tablet scoring-path accessible names and hit targets (T1 slice)', () => {
    it('gives Matrix Back an accessible name', () => {
        expect(matrixSource).toContain('aria-label="Back to Assessments"');
        expect(matrixSource).toMatch(
            /aria-label="Back to Assessments"[\s\S]{0,200}<ChevronLeft/
        );
    });

    it('sizes Domain Scoreboard View control to at least 44×44', () => {
        expect(scoreboardSource).toMatch(
            /onViewDetail\(target\.target_id\)[\s\S]{0,250}min-h-11 min-w-11[\s\S]{0,120}>[\s\S]{0,40}View/
        );
        expect(scoreboardSource).not.toMatch(
            /onViewDetail\(target\.target_id\)[\s\S]{0,120}className="text-sm font-medium text-gray-500/
        );
    });

    it('sizes Target Detail Close to at least 44×44 and gives it an accessible name', () => {
        expect(detailModalSource).toContain('aria-label="Close"');
        expect(detailModalSource).toMatch(
            /aria-label="Close"[\s\S]{0,120}min-h-11 min-w-11|min-h-11 min-w-11[\s\S]{0,120}aria-label="Close"/
        );
    });

    it('sizes Login primary actions to at least 44 CSS px height', () => {
        expect(loginSource).toMatch(/type="submit"[\s\S]{0,200}min-h-11/);
        expect(loginSource).toMatch(
            /Need an account\? Sign up[\s\S]{0,80}|min-h-11 min-w-11[\s\S]{0,200}Need an account\? Sign up/
        );
        expect(loginSource).toContain('min-h-11 min-w-11');
    });
});
