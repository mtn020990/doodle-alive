import { useCallback, useEffect, useRef } from 'react';
import { pollJob, submitJob, type Job, type JobRequest } from '@/shared/api';
import { stageFromStep, type Stage } from '../lib/stages';

interface Handlers {
  onStage: (stage: Stage) => void;
  onJob: (job: Job) => void;
}

/**
 * Prepares a request (e.g. shrinking photos), submits the job and polls it; one run at a time.
 * Cancelling at any point makes `run` throw an AbortError.
 */
export function useJobRunner() {
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(
    async (prepare: () => Promise<JobRequest>, { onStage, onJob }: Handlers): Promise<Job> => {
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      const request = await prepare();
      ctrl.signal.throwIfAborted();
      const job = await submitJob(request, ctrl.signal);
      return pollJob(
        job.id,
        (update) => {
          onJob(update);
          const stage = stageFromStep(update.step);
          if (stage) onStage(stage);
        },
        ctrl.signal,
      );
    },
    [],
  );

  const cancel = useCallback(() => controller.current?.abort(), []);

  return { run, cancel };
}

export const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';
