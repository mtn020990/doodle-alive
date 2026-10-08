import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type ChipProps = ComponentProps<'button'> & {
  selected?: boolean;
  emoji?: ReactNode;
};

export function Chip({ selected, emoji, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-11 pressable items-center gap-1.5 rounded-full px-3.5 text-[0.95rem] font-semibold shadow-sticker-sm sticker',
        selected ? 'bg-sun text-sun-ink' : 'bg-card text-ink',
        className,
      )}
      {...rest}
    >
      {emoji && (
        <span aria-hidden="true" className="text-lg leading-none">
          {emoji}
        </span>
      )}
      {children}
    </button>
  );
}
