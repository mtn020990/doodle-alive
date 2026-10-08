import { Check } from 'lucide-react';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { COLORS } from '../lib/brushes';

interface ColorPaletteProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPalette({ value, onChange }: ColorPaletteProps) {
  const { t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t('draw.colors')}
      className="grid grid-cols-8 gap-1.5 px-0.5 py-1.5 sm:gap-2"
    >
      {COLORS.map(({ value: color, name }) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(name)}
            title={t(name)}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
            className={cn(
              'grid aspect-square w-full max-w-11 place-items-center justify-self-center rounded-full transition-transform sticker',
              selected && 'scale-110 shadow-sticker-sm',
            )}
          >
            {selected && (
              <Check
                aria-hidden="true"
                className="size-5 text-white drop-shadow"
                strokeWidth={3.5}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
