import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), './App.tsx'),
    'utf8'
);

const matrixSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), './pages/AssessmentMatrix.tsx'),
    'utf8'
);

const moreMenuSource = readFileSync(
    resolve(
        dirname(fileURLToPath(import.meta.url)),
        './components/assessment/MatrixHeaderMoreMenu.tsx'
    ),
    'utf8'
);

describe('legacy computed report route retirement', () => {
    it('does not import or resolve AssessmentReport at #/assessment/:id/report', () => {
        expect(appSource).not.toMatch(/from '\.\/pages\/AssessmentReport'/);
        expect(appSource).not.toContain('<AssessmentReport ');
        expect(appSource).not.toMatch(
            /match\(\s*\/\^#\\\/assessment\\\/\(\[\^\\\/\]\+\)\\\/report\$\/\s*\)/
        );
        expect(appSource).toContain('reportEditMatch');
        expect(appSource).toContain('finalizedReportMatch');
        expect(appSource).toContain('ReportAuthoring');
        expect(appSource).toContain('ReportVersionHistory');
        expect(appSource).toContain('reportVersionsMatch');
        expect(appSource).toContain('ReportDocumentsIndex');
        expect(appSource).toContain('documentsIndexMatch');
    });

    it('does not expose View Printable Report in the Matrix export menu', () => {
        expect(matrixSource).not.toContain('View Printable Report');
        expect(matrixSource).not.toMatch(
            /window\.open\(`#\/assessment\/\$\{assessmentId\}\/report`/
        );
        expect(moreMenuSource).toContain('Export Matrix CSV');
        expect(moreMenuSource).toContain('Export Analytics CSV');
    });
});
