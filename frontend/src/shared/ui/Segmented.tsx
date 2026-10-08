import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Accessible name when `label` is short or visual (e.g. "VI"). */
  ariaLabel?: string;
  lang?: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/** Pill-shaped single choice (radio group): the picked option is filled with ink. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex gap-1 rounded-full bg-card p-1 shadow-sticker-sm sticker', className)}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.ariaLabel}
            lang={option.lang}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-bold transition-colors [&>svg]:size-4',
              checked ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
