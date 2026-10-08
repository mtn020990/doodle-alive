import { Check } from 'lucide-react';
import { Fragment } from 'react';
import { useI18n, type MessageKey } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

const STEPS: { label: MessageKey; emoji: string }[] = [
  { label: 'step.source', emoji: '🎨' },
  { label: 'step.motion', emoji: '🎬' },
  { label: 'step.magic', emoji: '✨' },
];

/** `current` is 0-based; pass STEPS.length to mark everything done. */
export function Stepper({ current }: { current: number }) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t('step.progress', {
        n: Math.min(current + 1, STEPS.length),
        total: STEPS.length,
      })}
    >
      <ol className="flex items-start">
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <Fragment key={step.label}>
              {i > 0 && (
                <li
                  aria-hidden="true"
                  className={cn(
                    'mx-1 mt-5 h-1 flex-1 rounded-full transition-colors duration-500',
                    i <= current ? 'bg-ink' : 'bg-soft-line',
                  )}
                />
              )}
              <li
                aria-current={active ? 'step' : undefined}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    'grid size-11 place-items-center rounded-full text-lg transition-all duration-300 sticker',
                    done && 'bg-mint text-white',
                    active && 'scale-110 bg-sun shadow-sticker-sm',
                    !done && !active && 'bg-card opacity-60',
                  )}
                >
                  {done ? (
                    <Check aria-hidden="true" className="size-5" strokeWidth={3} />
                  ) : (
                    <span aria-hidden="true">{step.emoji}</span>
                  )}
                </span>
                <span className={cn('text-xs font-bold', active ? 'text-ink' : 'text-muted')}>
                  {t(step.label)}
                </span>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
