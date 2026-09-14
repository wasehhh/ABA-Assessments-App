import type { AssessmentLink } from '@/types';

export const assessmentLinks: AssessmentLink[] = [
  {
    id: 'al-1',
    programId: 'prog-1',
    assessmentName: 'VB-MAPP',
    itemCode: 'Mand-5',
    itemDescription: 'Mands for items using 5+ different words without prompts',
    scoreAtLink: '2/5 — partially met',
    linkedDate: '2026-07-15',
  },
  {
    id: 'al-2',
    programId: 'prog-3',
    assessmentName: 'ABLLS-R',
    itemCode: 'Z-12',
    itemDescription: 'Imitates 3-step motor sequence',
    scoreAtLink: '1/3 — emerging',
    linkedDate: '2026-07-20',
  },
];
