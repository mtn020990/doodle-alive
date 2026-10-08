import type { ChangeEvent, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/** A way to get a drawing: a file input (camera / photo library) or an action (live camera / sketchpad). */
export interface SourceOption {
  key: string;
  icon: ReactNode;
  label: string;
  hint: string;
  /** File inputs only: open the rear camera instead of the photo library. */
  capture?: boolean;
  onClick?: () => void;
}

interface TriggerProps {
  option: SourceOption;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  className: string;
  children: ReactNode;
}

const focusRing = 'focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-grape';

/** A button for actions, or a label wrapping a hidden file input. */
function Trigger({ option, onFile, className, children }: TriggerProps) {
  if (option.onClick) {
    return (
      <button type="button" onClick={option.onClick} className={className}>
        {children}
      </button>
    );
  }
  return (
    <label className={className}>
      <input
        type="file"
        accept="image/*"
        capture={option.capture ? 'environment' : undefined}
        onChange={onFile}
        className="sr-only"
      />
      {children}
    </label>
  );
}

interface TileProps {
  option: SourceOption;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  tone: string;
  /** Square tile with icon and label only (the secondary options). */
  small?: boolean;
}

export function SourceTile({ option, onFile, tone, small }: TileProps) {
  return (
    <Trigger
      option={option}
      onFile={onFile}
      className={cn(
        'group flex pressable cursor-pointer rounded-blob text-left shadow-sticker-lg sticker',
        focusRing,
        small
          ? 'min-h-32 flex-col items-center justify-center gap-2 p-3 text-center'
          : 'min-h-24 w-full items-center gap-4 p-4',
        tone,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid shrink-0 place-items-center rounded-2xl bg-card text-ink transition-transform sticker group-hover:-rotate-6',
          small ? 'size-12 [&>svg]:size-6' : 'size-16 [&>svg]:size-8',
        )}
      >
        {option.icon}
      </span>
      <span className="flex flex-col">
        <span
          className={cn(
            'font-display leading-tight font-extrabold',
            small ? 'text-base' : 'text-2xl',
          )}
        >
          {option.label}
        </span>
        {!small && <span className="text-sm font-medium opacity-85">{option.hint}</span>}
      </span>
    </Trigger>
  );
}

/** Compact button to swap the picked drawing for another. */
export function SourceChip({
  option,
  onFile,
}: {
  option: SourceOption;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Trigger
      option={option}
      onFile={onFile}
      className={cn(
        'inline-flex min-h-12 pressable cursor-pointer items-center gap-2 rounded-2xl bg-card px-3.5 font-display font-bold shadow-sticker-sm sticker [&_svg]:size-5',
        focusRing,
      )}
    >
      <span aria-hidden="true">{option.icon}</span>
      {option.label}
    </Trigger>
  );
}
