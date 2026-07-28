import { Assessment, AssessmentScore } from '../types';
import { resolveEffectiveScoring } from './effectiveScoring';
import { findPackTarget } from './matrixDisplayHelpers';

interface ExportOptions {
    format: 'long' | 'matrix';
}

export const exportUtils = {
    generateCSV(assessment: Assessment, scores: AssessmentScore[], options: ExportOptions): void {
        const { format } = options;
        let csvContent = '';
        let filename = '';

        if (format === 'long') {
            csvContent = generateLongFormat(assessment, scores);
            filename = `${assessment.client?.first_name}_${assessment.client?.last_name}_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
        } else {
            csvContent = generateMatrixFormat(assessment, scores);
            filename = `${assessment.client?.first_name}_${assessment.client?.last_name}_Matrix_${new Date().toISOString().split('T')[0]}.csv`;
        }

        downloadCSV(csvContent, filename);
    }
};

function generateLongFormat(assessment: Assessment, scores: AssessmentScore[]): string {
    const rows = [];
    rows.push([
        'Client ID',
        'Client Name',
        'Assessment ID',
        'Pack Title',
        'Pack Version',
        'Domain',
        'Target ID',
        'Target Title',
        'Cycle Number',
        'Score',
        'Max Score',
        'Notes',
        'Scored By',
        'Date Scored',
        'Assessment Status'
    ]);

    const pack = assessment.pack_snapshot;
    if (!pack) return '';

    scores.forEach(s => {
        let domainTitle = '';
        let targetTitle = '';
        let maxScore = '';

        const domain = pack.domains.find(d => d.domain_id === s.domain_id);
        if (domain) {
            domainTitle = domain.title;
        }

        const target = findPackTarget(pack, s.target_id);
        if (target) {
            targetTitle = target.title;
            maxScore = String(resolveEffectiveScoring(target, pack).maxScore);
        }

        rows.push([
            assessment.client_id,
            `${assessment.client?.first_name} ${assessment.client?.last_name}`,
            assessment.id,
            pack.title,
            pack.version,
            domainTitle,
            s.target_id,
            targetTitle,
            s.cycle?.cycle_number || 1,
            s.score !== null ? s.score : '',
            maxScore,
            s.note || '',
            s.assessor_user_id || '',
            s.updated_at || s.created_at,
            assessment.status
        ].map(escapeCSV));
    });

    return rows.map(r => r.join(',')).join('\n');
}

function generateMatrixFormat(assessment: Assessment, scores: AssessmentScore[]): string {
    const pack = assessment.pack_snapshot;
    if (!pack) return '';

    const cycleNumbers = new Set<number>();
    scores.forEach(s => {
        if (s.cycle?.cycle_number) cycleNumbers.add(s.cycle.cycle_number);
    });
    const sortedCycles = Array.from(cycleNumbers).sort((a, b) => a - b);
    if (sortedCycles.length === 0) sortedCycles.push(1);

    const headers = [
        'Domain',
        'Target ID',
        'Target Title',
        'Max Score'
    ];
    sortedCycles.forEach(num => {
        headers.push(`Cycle ${num} Date`);
        headers.push(`Cycle ${num} Score`);
        headers.push(`Cycle ${num} Notes`);
    });
    const rows = [headers];

    const scoreMap = new Map<string, AssessmentScore>();
    scores.forEach(s => {
        const cNum = s.cycle?.cycle_number || 1;
        scoreMap.set(`${s.target_id}_${cNum}`, s);
    });

    pack.domains.forEach(domain => {
        domain.targets.forEach(target => {
            const row = [];
            row.push(domain.title);
            row.push(target.target_id);
            row.push(target.title);
            row.push(String(resolveEffectiveScoring(target, pack).maxScore));

            sortedCycles.forEach(cNum => {
                const s = scoreMap.get(`${target.target_id}_${cNum}`);
                if (s) {
                    row.push(s.updated_at ? s.updated_at.split('T')[0] : s.created_at.split('T')[0]);
                    row.push(s.score !== null ? s.score : '');
                    row.push(s.note || '');
                } else {
                    row.push('');
                    row.push('');
                    row.push('');
                }
            });

            rows.push(row.map(escapeCSV));
        });
    });

    return rows.map(r => r.join(',')).join('\n');
}

function escapeCSV(field: any): string {
    if (field === null || field === undefined) return '';
    const stringField = String(field);
    if (stringField.includes('"') || stringField.includes(',') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
}

function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
