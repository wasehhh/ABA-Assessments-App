import { Assessment, AssessmentScore, ContentPackData } from '../types';

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
    // Header
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

    // Create a map for quick lookup of domain/target info if needed, 
    // but iterating scores is primary for Long format.
    // HOWEVER, to be robust, we should iterate all scores found.

    scores.forEach(s => {
        // Find metadata
        let domainTitle = '';
        let targetTitle = '';
        let maxScore = '';

        const domain = pack.domains.find(d => d.domain_id === s.domain_id);
        let targetMaxVal = 4; // Default
        if (domain) {
            domainTitle = domain.title;
            const target = domain.targets.find(t => t.target_id === s.target_id);
            if (target) {
                targetTitle = target.title;
                // Determine max score
                if (target.scoring?.scale && target.scoring.scale.length > 0) {
                    targetMaxVal = Math.max(...target.scoring.scale);
                    maxScore = targetMaxVal.toString();
                } else if (target.scoring?.type === 'yesno' || target.scoring?.type === 'yes_no') {
                    targetMaxVal = 1;
                    maxScore = '1';
                }
            }
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
            s.score !== null ? Math.min(s.score, targetMaxVal) : '',
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

    // 1. Identify all Cycles present in scores
    const cycleNumbers = new Set<number>();
    scores.forEach(s => {
        if (s.cycle?.cycle_number) cycleNumbers.add(s.cycle.cycle_number);
    });
    const sortedCycles = Array.from(cycleNumbers).sort((a, b) => a - b);
    if (sortedCycles.length === 0) sortedCycles.push(1); // Default to at least cycle 1

    // 2. Build Header
    const headers = [
        'Domain',
        'Target ID',
        'Target Title',
        'Max Score'
    ];
    // Add columns for each cycle
    sortedCycles.forEach(num => {
        headers.push(`Cycle ${num} Date`);
        headers.push(`Cycle ${num} Score`);
        headers.push(`Cycle ${num} Notes`);
    });
    const rows = [headers];

    // 3. Score Lookup Map: Key = target_id + cycle_number -> Score Object
    const scoreMap = new Map<string, AssessmentScore>();
    scores.forEach(s => {
        const cNum = s.cycle?.cycle_number || 1;
        scoreMap.set(`${s.target_id}_${cNum}`, s);
    });

    // 4. Iterate Pack Structure (Rows)
    pack.domains.forEach(domain => {
        domain.targets.forEach(target => {
            const row = [];
            // Basic Info
            row.push(domain.title);
            row.push(target.target_id);
            row.push(target.title);

            // Max Score
            let maxScore = '';
            let targetMaxVal = 4; // Default
            const scoringType = target.scoring?.type as string;

            if (target.scoring?.scale && target.scoring.scale.length > 0) {
                targetMaxVal = Math.max(...target.scoring.scale);
                maxScore = targetMaxVal.toString();
            } else if (scoringType === 'yesno' || scoringType === 'yes_no') {
                targetMaxVal = 1;
                maxScore = '1';
            }
            row.push(maxScore);

            // Cycle Data
            sortedCycles.forEach(cNum => {
                const s = scoreMap.get(`${target.target_id}_${cNum}`);
                if (s) {
                    row.push(s.updated_at ? s.updated_at.split('T')[0] : s.created_at.split('T')[0]);
                    row.push(s.score !== null ? Math.min(s.score, targetMaxVal) : '');
                    row.push(s.note || '');
                } else {
                    row.push(''); // Date
                    row.push(''); // Score
                    row.push(''); // Note
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
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
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
