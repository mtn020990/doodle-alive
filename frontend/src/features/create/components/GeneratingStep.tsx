import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GuessGame } from '@/features/game';
import { FlowChart } from '@/features/pipeline';
import type { Job } from '@/shared/api';
import { Mascot, Sparkle, Squiggle } from '@/shared/assets/illustrations';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Button, Card } from '@/shared/ui';
import { STAGE_CAPS, STAGE_LABELS, STAGES, type Stage } from '../lib/stages';
import type { PickedImage } from '../types';

const VISIBLE_STAGES = STAGES.filter((s) => s !== 'done');

interface GeneratingStepProps {
  image: PickedImage;
  stage: Stage;
  job: Job | null;
  /** Guesses known before the job reports its own (from a reviewed draft). */
  guesses: string[];
  onCancel: () => void;
}

export function GeneratingStep({ image, stage, job, guesses, onCancel }: GeneratingStepProps) {
  const { t } = useI18n();
  const progress = useCreepingProgress(STAGE_CAPS[stage]);
  const current = STAGES.indexOf(stage);
  const gameGuesses = job?.guesses?.length ? job.guesses : guesses;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="relative mt-2">
        <Card className="relative size-44 rotate-2 overflow-hidden bg-white p-2 sm:size-52">
          {image.thumb && (
            <img src={image.thumb} alt="" className="h-full w-full rounded-2xl object-contain" />
          )}
          {/* A soft light sweeping over the drawing. */}
          <span
            aria-hidden="true"
            className="progress-stripes absolute inset-0 opacity-25 mix-blend-multiply"
          />
        </Card>
        <Mascot className="animate-wiggle absolute -right-10 -bottom-8 size-24 drop-shadow" />
        <Sparkle className="animate-twinkle absolute -top-4 -left-5 size-8" />
        <Sparkle
          className="animate-twinkle absolute top-10 -right-6 size-5 [animation-delay:.5s]"
          color="var(--grape)"
        />
        <Sparkle
          className="animate-twinkle absolute -bottom-3 -left-3 size-6 [animation-delay:1s]"
          color="var(--mint)"
        />
      </div>

      <div className="space-y-1">
        <h2 className="text-3xl font-extrabold">{t('gen.title')}</h2>
        <Squiggle className="mx-auto h-6 w-40" />
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div
          role="progressbar"
          aria-label={t('gen.title')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={t(STAGE_LABELS[stage])}
          className="h-6 overflow-hidden rounded-full bg-card p-0.5 shadow-sticker-sm sticker"
        >
          <div
            className="progress-stripes h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol aria-live="polite" className="space-y-2 text-left">
          {VISIBLE_STAGES.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li
                key={s}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors',
                  active && 'bg-card font-bold',
                  !done && !active && 'text-muted',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full border-2 border-line text-xs',
                    done && 'bg-mint text-white',
                    active && 'bg-sun text-sun-ink',
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span>{t(STAGE_LABELS[s])}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="max-w-xs text-sm text-muted">{t('gen.wait')}</p>

      <Button variant="ghost" icon={<X />} onClick={onCancel}>
        {t('gen.cancel')}
      </Button>

      <div className="w-full space-y-4">
        <GuessGame guesses={gameGuesses} />
        {job && <FlowChart job={job} />}
      </div>
    </div>
  );
}

/** Eases toward `cap` so the bar keeps moving while the server works. */
function useCreepingProgress(cap: number) {
  const [value, setValue] = useState(4);
  useEffect(() => {
    const timer = setInterval(() => setValue((v) => (v >= cap ? cap : v + (cap - v) * 0.07)), 400);
    return () => clearInterval(timer);
  }, [cap]);
  return value;
}
