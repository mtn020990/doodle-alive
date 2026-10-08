import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

const fieldClass =
  'sticker block w-full min-w-0 rounded-2xl bg-card px-4 py-3 text-base shadow-sticker-sm ' +
  'placeholder:text-muted/70 focus:outline-3 focus:outline-offset-2 focus:outline-grape disabled:opacity-60';

export function TextInput({ className, ...rest }: ComponentProps<'input'>) {
  return <input className={cn(fieldClass, 'min-h-12', className)} {...rest} />;
}

export function TextArea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClass, 'py-4', className)} {...rest} />;
}
