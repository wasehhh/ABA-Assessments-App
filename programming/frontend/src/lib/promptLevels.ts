import type { PromptLevel } from '@/types';

// Ordered from most-to-least intrusive (index 0 = most intrusive)
export const PROMPT_LEVEL_ORDER: PromptLevel[] = [
  'Full Physical',
  'Partial Physical',
  'Model',
  'Gestural',
  'Verbal',
  'Independent',
];

export function promptLevelIndex(level: PromptLevel): number {
  return PROMPT_LEVEL_ORDER.indexOf(level);
}

// Returns true if `a` is less intrusive (more independent) than `b`
export function isLessIntrusive(a: PromptLevel, b: PromptLevel): boolean {
  return promptLevelIndex(a) > promptLevelIndex(b);
}

// Returns the next less intrusive prompt level, or Independent if already at top
export function nextLessIntrusive(level: PromptLevel): PromptLevel {
  const idx = promptLevelIndex(level);
  if (idx >= PROMPT_LEVEL_ORDER.length - 1) return 'Independent';
  return PROMPT_LEVEL_ORDER[idx + 1];
}

// Returns the next more intrusive prompt level, or Full Physical if already at bottom
export function nextMoreIntrusive(level: PromptLevel): PromptLevel {
  const idx = promptLevelIndex(level);
  if (idx <= 0) return 'Full Physical';
  return PROMPT_LEVEL_ORDER[idx - 1];
}

// Color mapping for prompt level badges
export function promptLevelColor(level: PromptLevel): string {
  const map: Record<PromptLevel, string> = {
    'Full Physical': 'bg-red-100 text-red-800',
    'Partial Physical': 'bg-orange-100 text-orange-800',
    Model: 'bg-amber-100 text-amber-800',
    Gestural: 'bg-yellow-100 text-yellow-800',
    Verbal: 'bg-lime-100 text-lime-800',
    Independent: 'bg-green-100 text-green-800',
  };
  return map[level];
}
