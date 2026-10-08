import type { ReactNode } from 'react';

/** Keeps the main call-to-action in the thumb zone, just above the bottom nav. */
export function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[var(--nav-space)] z-20 -mx-4 bg-linear-to-t from-paper from-70% to-transparent px-4 pt-6 pb-3">
      <div className="flex gap-3">{children}</div>
    </div>
  );
}
