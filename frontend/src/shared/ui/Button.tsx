import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

const VARIANTS = {
  primary: 'bg-coral text-coral-ink',
  secondary: 'bg-card text-ink',
  accent: 'bg-grape text-white',
  ghost: 'border-transparent bg-transparent text-ink shadow-none hover:bg-sunken',
} as const;

const SIZES = {
  md: 'min-h-12 gap-2 rounded-2xl px-4 text-base',
  lg: 'min-h-14 gap-2.5 rounded-blob px-6 text-lg',
} as const;

interface StyleProps {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  icon?: ReactNode;
  block?: boolean;
}

function buttonClass({ variant = 'primary', size = 'md', block }: StyleProps, className?: string) {
  return cn(
    'sticker pressable inline-flex items-center justify-center font-display font-bold leading-none',
    'shadow-sticker whitespace-nowrap select-none disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
    className,
  );
}

function Content({ icon, children }: { icon?: ReactNode; children?: ReactNode }) {
  return (
    <>
      {icon && (
        <span aria-hidden="true" className="shrink-0 [&>svg]:size-5">
          {icon}
        </span>
      )}
      {children}
    </>
  );
}

type ButtonProps = ComponentProps<'button'> & StyleProps;

export function Button({ variant, size, icon, block, className, children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={buttonClass({ variant, size, block }, className)} {...rest}>
      <Content icon={icon}>{children}</Content>
    </button>
  );
}

type LinkButtonProps = ComponentProps<'a'> & StyleProps;

export function LinkButton({
  variant,
  size,
  icon,
  block,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <a className={buttonClass({ variant, size, block }, className)} {...rest}>
      <Content icon={icon}>{children}</Content>
    </a>
  );
}
