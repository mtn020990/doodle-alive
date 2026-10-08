import type { Job, PipelineStep } from '@/shared/api';

/** The stages every job goes through (titles as in backend/app/jobs.py). */
const PIPELINE: [icon: string, title: string][] = [
  ['📷', 'Clean up photo'],
  ['🧠', 'Understand the drawing'],
  ['🔀', 'Pick the animator'],
  ['🎬', 'Animate'],
  ['✅', 'Ready'],
];

/** Steps so far, plus greyed-out boxes for the stages still to come. */
export function withPendingSteps(job: Pick<Job, 'status' | 'steps'>): PipelineStep[] {
  const steps = job.steps ?? [];
  if (job.status === 'failed') return steps;
  const seen = new Set(steps.map((s) => s.title.replace(/^Fallback: a/, 'A')));
  const pending = PIPELINE.filter(([, title]) => !seen.has(title)).map(
    ([icon, title]): PipelineStep => ({
      icon,
      title,
      status: 'pending',
      model: '',
      outputs: {},
      notes: [],
    }),
  );
  return [...steps, ...pending];
}
