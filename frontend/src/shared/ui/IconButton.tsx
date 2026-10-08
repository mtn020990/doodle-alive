import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** Accessible name, also shown as a tooltip. */
  label: string;
  icon: ReactNode;
  active?: boolean;
};

export function IconButton({ label, icon, active, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-12 shrink-0 pressable place-items-center rounded-2xl shadow-sticker-sm sticker',
        'disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-5',
        active ? 'bg-ink text-paper' : 'bg-card text-ink',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
