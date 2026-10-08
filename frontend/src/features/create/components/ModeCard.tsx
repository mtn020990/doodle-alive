import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface ModeCardProps {
  emoji: string;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export function ModeCard({ emoji, title, description, selected, onSelect }: ModeCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'relative flex min-h-32 pressable flex-col items-center justify-center gap-1.5 rounded-3xl p-3 text-center transition-colors sticker',
        selected ? 'bg-sun text-sun-ink shadow-sticker' : 'bg-card text-ink shadow-sticker-sm',
      )}
    >
      <span aria-hidden="true" className="text-4xl leading-none">
        {emoji}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-base leading-tight font-extrabold sm:text-lg">
          {title}
        </span>
        <span className={cn('text-sm', selected ? 'opacity-80' : 'text-muted')}>{description}</span>
      </span>
      {selected && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-mint text-white sticker"
        >
          <Check className="size-4" strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}
