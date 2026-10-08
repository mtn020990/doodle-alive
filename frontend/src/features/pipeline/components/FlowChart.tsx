import { ChevronDown, Workflow } from 'lucide-react';
import { useState } from 'react';
import type { Job, PipelineStep } from '@/shared/api';
import { useI18n, type MessageKey } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { withPendingSteps } from '../lib/pipeline';

interface FlowChartProps {
  job: Pick<Job, 'status' | 'steps'>;
}

/** "How it was made": the job's pipeline trace, updated on every poll. */
export function FlowChart({ job }: FlowChartProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const steps = withPendingSteps(job);
  if (!job.steps?.length) return null;

  return (
    <section className="rounded-blob bg-card shadow-sticker sticker">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex min-h-14 w-full items-center gap-3 px-4 text-left font-display text-lg font-extrabold"
        >
          <Workflow aria-hidden="true" className="size-5 text-grape" />
          <span className="flex-1">{t('flow.title')}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn('size-5 transition-transform', open && 'rotate-180')}
          />
        </button>
      </h3>
      {open && (
        <ol className="space-y-0 px-4 pb-4">
          {steps.map((step, i) => (
            <FlowStep key={`${step.title}-${i}`} step={step} last={i === steps.length - 1} />
          ))}
        </ol>
      )}
    </section>
  );
}

const STATUS_LABELS: Record<PipelineStep['status'], MessageKey> = {
  done: 'flow.status.done',
  failed: 'flow.status.failed',
  running: 'flow.status.running',
  pending: 'flow.status.pending',
};

const DOT: Record<PipelineStep['status'], string> = {
  done: 'bg-mint',
  failed: 'bg-coral',
  running: 'bg-sun animate-pulse',
  pending: 'bg-card border-dashed',
};

function FlowStep({ step, last }: { step: PipelineStep; last: boolean }) {
  const { t } = useI18n();
  const outputs = Object.entries(step.outputs ?? {});
  const time =
    step.status === 'running'
      ? t('flow.working')
      : step.duration_ms != null
        ? `${(step.duration_ms / 1000).toFixed(1)} s`
        : '';

  return (
    <li className="relative flex gap-3 pb-3">
      {!last && (
        <span
          aria-hidden="true"
          className="absolute top-9 bottom-0 left-[17px] w-0.5 bg-soft-line"
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          'relative grid size-9 shrink-0 place-items-center rounded-full border-2 border-line text-base',
          DOT[step.status],
        )}
      >
        {step.icon}
      </span>
      <div
        className={cn(
          'min-w-0 flex-1 rounded-2xl p-3',
          step.status === 'pending' ? 'opacity-55' : 'bg-sunken',
          step.status === 'failed' && 'bg-danger-bg text-danger-ink',
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <strong className="font-display text-base">{step.title}</strong>
          {step.model && <span className="text-xs text-muted">{step.model}</span>}
          <span className="ml-auto text-xs font-semibold text-muted tabular-nums">
            {time}
            <span className="sr-only"> · {t(STATUS_LABELS[step.status])}</span>
          </span>
        </div>
        {outputs.length > 0 && (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {outputs.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-muted">{key}</dt>
                <dd className="min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {step.notes?.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted">
            {step.notes.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
