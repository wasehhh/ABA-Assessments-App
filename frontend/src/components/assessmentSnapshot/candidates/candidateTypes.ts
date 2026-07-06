export interface SnapshotCandidateMeta {
    id: 'candidate-a' | 'candidate-b' | 'candidate-c';
    label: string;
    description: string;
    organizingPrinciple: string;
    emphasis: string;
    differsFrom: string;
    evaluationQuestion: string;
}

export const SNAPSHOT_CANDIDATES: SnapshotCandidateMeta[] = [
    {
        id: 'candidate-a',
        label: 'Candidate A — Strip First',
        description:
            'History Strips are the dominant visual element; Domain Zones provide minimal structural framing.',
        organizingPrinciple:
            'One History Strip per target; cycles read left-to-right as Evidence Marks; domains are quiet dividers.',
        emphasis:
            'Longitudinal evidence density and fast per-target verification with minimal chrome.',
        differsFrom:
            'Less domain visual weight than B; less continuous document framing than C.',
        evaluationQuestion: 'Can I verify one skill’s history in under two seconds?',
    },
    {
        id: 'candidate-b',
        label: 'Candidate B — Zone First',
        description:
            'Domain Zones are strong visual chapters; History Strips are nested evidence inside each zone.',
        organizingPrinciple:
            'Domain Zone boundaries and titles lead; strips stack inside each chapter in pack order.',
        emphasis:
            'Assessment structure and domain identity before individual strip detail.',
        differsFrom:
            'Stronger hierarchy than A; zones are chapters, not a single continuous ledger like C.',
        evaluationQuestion: 'Can I immediately understand where I am within the assessment?',
    },
    {
        id: 'candidate-c',
        label: 'Candidate C — Record First',
        description:
            'The artifact is one continuous Evalis Record; domains segment the ledger without card panels.',
        organizingPrinciple:
            'Single evidence document from header to footer; domain zones are sequential record sections.',
        emphasis:
            'Product identity as a new assessment artifact — record, not grid or dashboard.',
        differsFrom:
            'Less strip-dominant than A; less zone-chrome than B; strongest continuous-document feel.',
        evaluationQuestion: 'Does this feel like an entirely new assessment artifact?',
    },
];

export function getSnapshotCandidate(id: SnapshotCandidateMeta['id']): SnapshotCandidateMeta {
    return SNAPSHOT_CANDIDATES.find((entry) => entry.id === id) ?? SNAPSHOT_CANDIDATES[0];
}

export { AssessmentSnapshotCandidateA } from './AssessmentSnapshotCandidateA';
export { AssessmentSnapshotCandidateB } from './AssessmentSnapshotCandidateB';
export { AssessmentSnapshotCandidateC } from './AssessmentSnapshotCandidateC';
export type { SnapshotCandidateProps } from './AssessmentSnapshotCandidateA';
