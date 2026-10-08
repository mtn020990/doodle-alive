import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/** A yellow sticker label, e.g. what the AI thinks the drawing is. */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full bg-sun px-3 py-1 font-display font-bold text-sun-ink shadow-sticker-sm sticker first-letter:uppercase',
        className,
      )}
    >
      {children}
    </span>
  );
}
