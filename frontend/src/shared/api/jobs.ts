import { requestJson } from './client';
import type { Draft, Job, Mode } from './types';

const POLL_MS = 1500;

export interface UploadImage {
  blob: Blob;
  fileName: string;
}

/** The drawing(s) and options every request about one drawing carries. */
export interface DrawingFields {
  image: UploadImage;
  /** A second drawing: both meet in one AI video. */
  image2?: UploadImage | null;
  /** Fill closed shapes with crayon colours first. */
  paint?: boolean;
}

export interface JobRequest extends DrawingFields {
  mode: Mode;
  prompt?: string;
  /** Seconds of AI video (2-10); omitted for dances. */
  duration?: number;
  /** A prompt reviewed via /api/describe, used as-is; the fields below go with it. */
  finalPrompt?: string;
  subject?: string;
  motion?: string;
  sound?: string;
  music?: string;
}

export interface DescribeRequest extends DrawingFields {
  mode: Mode;
  prompt?: string;
  /** The prompt on the page, for `change` / `different`. */
  current?: string;
  change?: string;
  different?: boolean;
}

function drawingBody({ image, image2, paint }: DrawingFields) {
  const body = new FormData();
  body.append('image', image.blob, image.fileName);
  if (image2) body.append('image2', image2.blob, image2.fileName);
  if (paint) body.append('paint', 'true');
  return body;
}

function appendAll(body: FormData, fields: Record<string, string | number | boolean | undefined>) {
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== '' && value !== false) body.append(key, String(value));
  }
}

export function submitJob(request: JobRequest, signal?: AbortSignal) {
  const body = drawingBody(request);
  appendAll(body, {
    mode: request.mode,
    prompt: request.prompt?.trim(),
    duration: request.duration,
    final_prompt: request.finalPrompt?.trim(),
    subject: request.subject,
    motion: request.motion,
    sound: request.sound,
    music: request.music,
  });
  return requestJson<Job>('/api/jobs', { method: 'POST', body, signal });
}

export function describeDrawing(request: DescribeRequest, signal?: AbortSignal) {
  const body = drawingBody(request);
  appendAll(body, {
    mode: request.mode,
    prompt: request.prompt?.trim(),
    current: request.current?.trim(),
    change: request.change?.trim(),
    different: request.different,
  });
  return requestJson<Draft>('/api/describe', { method: 'POST', body, signal });
}

function getJob(id: string, signal?: AbortSignal) {
  return requestJson<Job>(`/api/jobs/${encodeURIComponent(id)}`, { signal });
}

/** Polls until the job is done; throws if it fails or the signal aborts. */
export async function pollJob(
  id: string,
  onUpdate: (job: Job) => void,
  signal?: AbortSignal,
): Promise<Job> {
  for (;;) {
    const job = await getJob(id, signal);
    onUpdate(job);
    if (job.status === 'done') return job;
    if (job.status === 'failed') throw new Error(job.error || 'Animation failed.');
    await sleep(POLL_MS, signal);
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener(
      'abort',
      onAbort,
      { once: true },
    );
  });
}

export function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)$/i.test(url);
}
