import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return (
    <div className={cn('rounded-blob bg-card shadow-sticker-lg sticker', className)} {...rest} />
  );
}
