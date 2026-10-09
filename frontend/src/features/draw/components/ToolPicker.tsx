import {
  Circle,
  Eraser,
  Heart,
  Pencil,
  Slash,
  Square,
  Star,
  Triangle,
  type LucideIcon,
} from 'lucide-react';
import { useI18n, type MessageKey } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import type { Tool } from '../hooks/useDrawing';

const TOOLS: { value: Tool; label: MessageKey; Icon: LucideIcon }[] = [
  { value: 'pen', label: 'draw.pen', Icon: Pencil },
  { value: 'line', label: 'draw.line', Icon: Slash },
  { value: 'circle', label: 'draw.circle', Icon: Circle },
  { value: 'square', label: 'draw.square', Icon: Square },
  { value: 'triangle', label: 'draw.triangle', Icon: Triangle },
  { value: 'star', label: 'draw.star', Icon: Star },
  { value: 'heart', label: 'draw.heart', Icon: Heart },
  { value: 'eraser', label: 'draw.eraser', Icon: Eraser },
];

interface ToolPickerProps {
  value: Tool;
  onChange: (tool: Tool) => void;
}

/** Pen, ready-made shapes (drag to size them) and eraser, in one row. */
export function ToolPicker({ value, onChange }: ToolPickerProps) {
  const { t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t('draw.tools')}
      className="grid grid-cols-8 gap-1.5 sm:gap-2"
    >
      {TOOLS.map(({ value: tool, label, Icon }) => {
        const selected = tool === value;
        return (
          <button
            key={tool}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(label)}
            title={t(label)}
            onClick={() => onChange(tool)}
            className={cn(
              'grid aspect-square w-full max-w-12 pressable place-items-center justify-self-center rounded-2xl shadow-sticker-sm sticker',
              selected ? 'bg-ink text-paper' : 'bg-card text-ink',
            )}
          >
            <Icon aria-hidden="true" className="size-5" strokeWidth={2.5} />
          </button>
        );
      })}
    </div>
  );
}
