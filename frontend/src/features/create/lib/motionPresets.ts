import type { Mode } from '@/shared/api';
import type { MessageKey } from '@/shared/i18n';

export interface MotionPreset {
  id: string;
  emoji: string;
  label: MessageKey;
  /** Sent as the typed idea, so always English. The backend expands it into a full prompt. */
  prompt: string;
}

// Figures can only play these recorded moves; the words pick one (backend MOTION_WORDS).
const MOVES: MotionPreset[] = [
  { id: 'wave', emoji: '👋', label: 'preset.wave', prompt: 'waves hello' },
  { id: 'jump', emoji: '🦘', label: 'preset.jump', prompt: 'jumps up and down' },
  { id: 'jacks', emoji: '🤸', label: 'preset.jacks', prompt: 'does jumping jacks' },
  { id: 'zombie', emoji: '🧟', label: 'preset.zombie', prompt: 'zombie walk' },
  { id: 'dab', emoji: '😎', label: 'preset.dab', prompt: 'does a dab' },
];

const SCENES: MotionPreset[] = [
  {
    id: 'fly',
    emoji: '🕊️',
    label: 'preset.fly',
    prompt: 'it flies up into the sky, gliding gently',
  },
  {
    id: 'blast',
    emoji: '🚀',
    label: 'preset.blast',
    prompt: 'it blasts off upward with puffs of smoke',
  },
  {
    id: 'swim',
    emoji: '🐟',
    label: 'preset.swim',
    prompt: 'it swims smoothly through sparkling water',
  },
  {
    id: 'run',
    emoji: '🏃',
    label: 'preset.run',
    prompt: 'it runs along with quick, playful steps',
  },
  {
    id: 'dance',
    emoji: '💃',
    label: 'preset.dance',
    prompt: 'it dances happily, bouncing to the beat',
  },
  { id: 'spin', emoji: '🌀', label: 'preset.spin', prompt: 'it spins around in a happy circle' },
  { id: 'sway', emoji: '🌳', label: 'preset.sway', prompt: 'it sways gently in a soft breeze' },
  {
    id: 'sparkle',
    emoji: '✨',
    label: 'preset.sparkle',
    prompt: 'it sparkles and twinkles with magical light',
  },
];

/** Ideas that make sense for each mode; animals only walk, so they get none. */
export function presetsFor(mode: Mode, pair: boolean): MotionPreset[] {
  if (pair) return SCENES; // two drawings always make an AI video
  switch (mode) {
    case 'character':
      return MOVES;
    case 'animal':
      return [];
    case 'auto':
      return [...MOVES.slice(0, 2), ...SCENES.slice(0, 4)];
    case 'scene':
      return SCENES;
  }
}

/** Free text wins over a preset; empty means "let the AI decide". */
export function promptFor(presetId: string | null, customPrompt: string): string | undefined {
  const custom = customPrompt.trim();
  if (custom) return custom;
  return [...MOVES, ...SCENES].find((p) => p.id === presetId)?.prompt;
}

/**
 * Dances and animal walks have a fixed length; only AI video takes a length.
 * Two drawings always make an AI video.
 */
export function usesDuration(kind: Mode, pair: boolean) {
  return pair || !(kind === 'character' || kind === 'animal');
}
