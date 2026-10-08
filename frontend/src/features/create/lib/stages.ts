import type { MessageKey } from '@/shared/i18n';

export const STAGES = ['upload', 'clean', 'look', 'animate', 'done'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, MessageKey> = {
  upload: 'gen.stage.upload',
  clean: 'gen.stage.clean',
  look: 'gen.stage.look',
  animate: 'gen.stage.animate',
  done: 'gen.stage.done',
};

/** How far the progress bar may creep while a stage is running (percent). */
export const STAGE_CAPS: Record<Stage, number> = {
  upload: 15,
  clean: 35,
  look: 55,
  animate: 95,
  done: 100,
};

/** Maps the backend's human-readable `step` (see backend/app/jobs.py) to a stage. */
export function stageFromStep(step: string): Stage | null {
  if (/clean/i.test(step)) return 'clean';
  if (/look/i.test(step)) return 'look';
  if (/animat/i.test(step)) return 'animate';
  if (/done/i.test(step)) return 'done';
  return null;
}
