import { CircleAlert, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

const TONES = {
  danger: { box: 'bg-danger-bg text-danger-ink', Icon: CircleAlert },
  warning: { box: 'bg-warn-bg text-warn-ink', Icon: TriangleAlert },
} as const;

interface AlertProps {
  tone?: keyof typeof TONES;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Alert({ tone = 'warning', title, children, className }: AlertProps) {
  const { box, Icon } = TONES[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-2xl p-4 text-sm leading-relaxed', box, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-display text-base font-bold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
