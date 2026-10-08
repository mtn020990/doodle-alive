import type { AnimationResult } from '@/features/result';
import { apiUrl, isVideoUrl, type Draft, type Job } from '@/shared/api';

/** A finished job as the result view shows it. */
export function jobToResult(job: Job, beforeSrc: string | null): AnimationResult {
  const outputUrl = apiUrl(job.output_url ?? '');
  return {
    id: job.id,
    outputUrl,
    isVideo: isVideoUrl(outputUrl),
    subject: job.subject,
    animator: job.animator,
    warning: job.warning,
    beforeSrc,
    sound: job.sound ?? null,
    music: job.music ?? null,
  };
}

/** "Edit prompt & remake": the prompt a job used, ready to review again. */
export function jobToDraft(job: Job): Draft {
  return {
    kind: job.kind ?? 'scene',
    subject: job.subject ?? 'your drawing',
    prompt: job.prompt ?? '',
    motion: job.motion,
    guesses: job.guesses,
    sound: job.sound,
    music: job.music,
  };
}
