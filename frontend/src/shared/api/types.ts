/** Requested animation mode, sent as the `mode` form field. */
export type Mode = 'auto' | 'character' | 'animal' | 'scene';

/** What the backend resolved the drawing to. */
export type Kind = 'character' | 'animal' | 'scene';

export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

/** One box of the "How it was made" flow chart (backend/app/trace.py). */
export interface PipelineStep {
  icon: string;
  title: string;
  model: string;
  status: 'running' | 'done' | 'failed' | 'pending';
  outputs: Record<string, string>;
  notes: string[];
  duration_ms?: number | null;
}

/** Mirrors `Job.to_dict()` in backend/app/jobs.py (contract is add-only). */
export interface Job {
  id: string;
  mode: Mode;
  status: JobStatus;
  step: string;
  subject: string | null;
  kind: Kind | null;
  prompt: string | null;
  animator: string | null;
  output_url: string | null;
  warning: string | null;
  error: string | null;
  duration?: number | null;
  motion?: string | null;
  guesses?: string[];
  sound?: string | null;
  music?: string | null;
  drawings?: number;
  painted?: boolean;
  steps?: PipelineStep[];
}

/** POST /api/describe: the prompt the person reviews before animating. */
export interface Draft {
  subject: string;
  kind: Kind;
  prompt: string;
  source?: string;
  warning?: string | null;
  guesses?: string[];
  sound?: string | null;
  music?: string | null;
  motion?: string | null;
  motion_reason?: string | null;
}

export interface HfKey {
  name: string;
  active: boolean;
  quota_hit_at?: string | null;
  last_ok_at?: string | null;
}

export interface GpuServer {
  name: string;
  url: string;
  last_ok_at?: string | null;
  last_error?: string | null;
  last_error_at?: string | null;
}
