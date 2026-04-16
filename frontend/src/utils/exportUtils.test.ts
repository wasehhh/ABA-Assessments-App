
import { describe, it, expect } from 'vitest';
import { exportUtils } from './exportUtils';

// Mock data
const mockAssessment = {
    id: 'assess-123',
    client_id: 'client-456',
    client: { first_name: 'John', last_name: 'Doe' },
    status: 'in_progress',
    pack_snapshot: {
        title: 'Test Pack',
        version: '1.0',
        domains: [
            {
                domain_id: 'DOM1',
                title: 'Domain One',
                targets: [
                    {
                        target_id: 'T1',
                        title: 'Target One',
                        scoring: { scale: [0, 1, 2] }
                    },
                    {
                        target_id: 'T2',
                        title: 'Target Two',
                        scoring: { type: 'yesno' }
                    }
                ]
            }
        ]
    }
};

const mockScores = [
    {
        id: 'score-1',
        assessment_id: 'assess-123',
        target_id: 'T1',
        domain_id: 'DOM1',
        score: 2,
        max_score: 2,
        note: 'Good job',
        cycle: { cycle_number: 1 },
        updated_at: '2023-01-01T10:00:00Z',
        assessor_user_id: 'user-1'
    },
    {
        id: 'score-2',
        assessment_id: 'assess-123',
        target_id: 'T1',
        domain_id: 'DOM1',
        score: 1,
        max_score: 2,
        note: 'Regressed',
        cycle: { cycle_number: 2 },
        updated_at: '2023-02-01T10:00:00Z',
        assessor_user_id: 'user-1'
    }
];

// Mock URL.createObjectURL since we are in node env (Vitest)
global.URL.createObjectURL = (blob) => 'blob:url';
global.Blob = class Blob {
    content: any[];
    constructor(content) { this.content = content; }
    toString() { return this.content.join(''); }
} as any;

// Mock document.createElement logic to intercept valid output
const mockLink = {
    setAttribute: () => { },
    style: {},
    click: () => { },
};
global.document = {
    createElement: () => mockLink,
    body: {
        appendChild: () => { },
        removeChild: () => { },
    }
} as any;

describe('exportUtils', () => {
    it('generates Long format correctly', () => {
        let output = '';
        const originalDownload = exportUtils.generateCSV;

        // We can inspect the generate functions if we export them, 
        // but currently they are private. 
        // Let's rely on intercepting the valid output if possible, 
        // OR we can just rely on the implementation being correct and this test compiling.
        // Actually, since I can't easily hook into the private 'downloadCSV', 
        // I will temporarily modify exportUtils to return the string for testing if I could,
        // but I can't modify the code just for tests easily.

        // Better approach: Test the format generation logic if I exported it. 
        // Since I didn't export generateLongFormat, I'll test the public API and maybe spy on Blob?

        const capturedBlobs: any[] = [];
        global.Blob = class Blob {
            content: any[];
            constructor(content) {
                this.content = content;
                capturedBlobs.push(content[0]);
            }
        } as any;

        exportUtils.generateCSV(mockAssessment as any, mockScores as any, { format: 'long' });

        expect(capturedBlobs.length).toBe(1);
        const csv = capturedBlobs[0];

        // Check Header
        expect(csv).toContain('Client ID,Client Name,Assessment ID');

        // Check Rows
        expect(csv).toContain('client-456,John Doe,assess-123,Test Pack');
        expect(csv).toContain('T1,Target One,1,2,2,Good job'); // Cycle 1
        expect(csv).toContain('T1,Target One,2,1,2,Regressed'); // Cycle 2
    });

    it('generates Matrix format correctly', () => {
        const capturedBlobs: any[] = [];
        global.Blob = class Blob {
            content: any[];
            constructor(content) {
                this.content = content;
                capturedBlobs.push(content[0]);
            }
        } as any;

        exportUtils.generateCSV(mockAssessment as any, mockScores as any, { format: 'matrix' });

        expect(capturedBlobs.length).toBe(1);
        const csv = capturedBlobs[0];

        // Check Header - Should include Cycle 1 and Cycle 2 columns
        expect(csv).toContain('Domain,Target ID,Target Title,Max Score,Cycle 1 Date,Cycle 1 Score,Cycle 1 Notes,Cycle 2 Date,Cycle 2 Score,Cycle 2 Notes');

        // Check Rows
        // Target T1 should have scores for both cycles
        expect(csv).toContain('Domain One,T1,Target One,2');
        expect(csv).toContain('2023-01-01,2,Good job');
        expect(csv).toContain('2023-02-01,1,Regressed');

        // Target T2 should be present but empty scores
        expect(csv).toContain('Domain One,T2,Target Two,1'); // YesNo max score inferred as 1
    });
});
