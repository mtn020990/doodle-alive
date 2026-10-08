import type { AnimationResult } from '@/features/result';
import type { Draft, Job, Mode } from '@/shared/api';
import type { Stage } from './lib/stages';

export interface PickedImage {
  blob: Blob;
  fileName: string;
  /** Small JPEG data URL kept for the before/after view and the library. */
  thumb: string | null;
}

export interface MotionChoice {
  mode: Mode;
  presetId: string | null;
  customPrompt: string;
  /** Seconds of AI video (2-10). */
  duration: number;
  /** Fill closed shapes with crayon colours first. */
  paint: boolean;
}

export type DescribeAction = 'check' | 'change' | 'different';

/** A failed request: the server could not be reached, or it said why. */
export type FlowError = { kind: 'network' } | { kind: 'server'; message: string };

/** Where a job was started from, and where Cancel goes back to. */
export type JobOrigin = 'motion' | 'review';

export type FlowState =
  | { step: 'source'; image: PickedImage | null }
  | { step: 'motion'; image: PickedImage }
  /** `version` changes with every new draft, so the editor resets to its text. */
  | { step: 'review'; image: PickedImage; draft: Draft; version: number }
  | {
      step: 'generating';
      image: PickedImage;
      stage: Stage;
      job: Job | null;
      from: JobOrigin;
      /** Guesses known before the job starts (from a reviewed draft). */
      guesses: string[];
    }
  | { step: 'result'; image: PickedImage; result: AnimationResult; job: Job }
  | { step: 'error'; image: PickedImage; error: FlowError };
