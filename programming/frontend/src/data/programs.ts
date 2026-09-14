import type { Program, PromptLevel } from '@/types';

const defaultPromptScheme: PromptLevel[] = [
  'Full Physical',
  'Partial Physical',
  'Model',
  'Gestural',
  'Verbal',
  'Independent',
];

export const programs: Program[] = [
  // ── Olivia (lrn-1) — rich history ──
  {
    id: 'prog-1',
    learnerId: 'lrn-1',
    title: 'Manding — Requesting Preferred Items',
    rationale:
      'Olivia rarely initiates requests. Linking to VB-MAPP Mand-5 to build spontaneous mands for preferred items.',
    goal: 'Independently mand for 10 preferred items using single words across 2 therapists and 2 settings.',
    instructions:
      'Place 1 preferred item in view. Wait 3 seconds for independent mand. If none, prompt with verbal model. Reinforce all mands with access to item. Fade prompts over sessions.',
    dataType: 'trial-by-trial',
    promptScheme: defaultPromptScheme,
    masteryRule: '80% independent across 3 consecutive sessions',
    status: 'active',
    notes: 'Olivia responds well to verbal prompts. Consider fading to gestural next week.',
    assessmentLinkId: 'al-1',
  },
  {
    id: 'prog-2',
    learnerId: 'lrn-1',
    title: 'Receptive Identification — Objects',
    rationale: 'Build receptive language by identifying common objects from an array.',
    goal: 'Receptively identify 20 common objects with 80% accuracy across 3 consecutive sessions.',
    instructions:
      'Place 3 picture cards on the table. Give SD "Give me [item]". Wait 5 seconds. If incorrect, prompt with model and re-present trial.',
    dataType: 'percentage/probe',
    promptScheme: defaultPromptScheme,
    masteryRule: '80% independent across 3 consecutive sessions',
    status: 'active',
    notes: '',
    assessmentLinkId: null,
  },
  {
    id: 'prog-3',
    learnerId: 'lrn-1',
    title: 'Motor Imitation — 3-Step Sequences',
    rationale: 'Linked to ABLLS-R Z-12. Olivia can imitate single actions but struggles with sequences.',
    goal: 'Imitate 3-step motor sequences independently in 4 out of 5 trials.',
    instructions:
      'Therapist demonstrates 3-step motor sequence. SD "Do this". Wait 5 seconds. Score correct if all 3 steps in order.',
    dataType: 'task-analysis',
    promptScheme: defaultPromptScheme,
    masteryRule: '4/5 steps correct across 3 consecutive sessions',
    status: 'active',
    notes: 'Sequencing is improving. Step 2 (clap) is the most common error point.',
    assessmentLinkId: 'al-2',
  },
  {
    id: 'prog-4',
    learnerId: 'lrn-1',
    title: 'Tolerating Delays — Waiting for Reinforcement',
    rationale: 'Olivia engages in problem behavior when access to items is delayed.',
    goal: 'Wait 60 seconds for a preferred item without problem behavior across 3 consecutive sessions.',
    instructions:
      'Tell Olivia "wait" when she requests an item. Start timer. If problem behavior occurs, reset timer. Deliver item after target duration.',
    dataType: 'duration',
    promptScheme: defaultPromptScheme,
    masteryRule: '60 second wait across 3 consecutive sessions',
    status: 'on-hold',
    notes: 'On hold due to family vacation. Resume when schedule stabilizes.',
    assessmentLinkId: null,
  },
  {
    id: 'prog-5',
    learnerId: 'lrn-1',
    title: 'Greeting Peers — Eye Contact + Wave',
    rationale: 'Olivia avoids peer interactions. Build foundational social response.',
    goal: 'Greet peers with eye contact and wave independently in 4/5 opportunities.',
    instructions:
      'Peer approaches. SD "Say hi". Score frequency of unprompted greetings per session. Reinforce all attempts.',
    dataType: 'frequency',
    promptScheme: defaultPromptScheme,
    masteryRule: '5 independent greetings across 3 consecutive sessions',
    status: 'completed',
    notes: 'Mastered 2026-08-28. Generalization to new peers observed.',
    assessmentLinkId: null,
  },

  // ── Marcus (lrn-2) — sparse ──
  {
    id: 'prog-6',
    learnerId: 'lrn-2',
    title: 'Expressive Labeling — Animals',
    rationale: 'Marcus labels 3 animals. Expand to 10.',
    goal: 'Expressively label 10 animals with 80% accuracy across 3 sessions.',
    instructions: 'Hold up animal card. SD "What is it?". Wait 5 seconds. Reinforce correct labels.',
    dataType: 'trial-by-trial',
    promptScheme: defaultPromptScheme,
    masteryRule: '80% independent across 3 consecutive sessions',
    status: 'active',
    notes: '',
    assessmentLinkId: null,
  },
  {
    id: 'prog-7',
    learnerId: 'lrn-2',
    title: 'Toilet Training — Initiation',
    rationale: 'Marcus is 4 years old. Begin toilet training initiation program.',
    goal: 'Independently initiate toilet use 3 times per day across 5 consecutive days.',
    instructions:
      'Provide access to bathroom. Prompt every 30 minutes. Reinforce independent initiation. Record frequency of unprompted initiations.',
    dataType: 'frequency',
    promptScheme: defaultPromptScheme,
    masteryRule: '3 independent initiations per day across 5 consecutive days',
    status: 'draft',
    notes: 'Draft pending BCBA review.',
    assessmentLinkId: null,
  },

  // ── Aisha (lrn-3) — sparse, paused ──
  {
    id: 'prog-8',
    learnerId: 'lrn-3',
    title: 'Matching — Identical Objects',
    rationale: 'Aisha is at early learner stage. Begin with identical matching.',
    goal: 'Match 10 identical objects from an array of 3.',
    instructions:
      'Place 3 objects on table. Give target object to Aisha. SD "Match". Wait 5 seconds. Score correct if placed with identical object.',
    dataType: 'percentage/probe',
    promptScheme: defaultPromptScheme,
    masteryRule: '80% independent across 3 consecutive sessions',
    status: 'on-hold',
    notes: 'Paused while Aisha transitions to new school placement.',
    assessmentLinkId: null,
  },
];
