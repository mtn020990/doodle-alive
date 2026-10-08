import type { AnimationResult } from '@/features/result';

/** A finished animation kept in this browser; `thumb` doubles as the before/after image. */
export type LibraryItem = Omit<AnimationResult, 'beforeSrc'> & {
  thumb: string | null;
  createdAt: number;
};
