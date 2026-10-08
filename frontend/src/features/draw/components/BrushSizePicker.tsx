import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { SIZES } from '../lib/brushes';

interface BrushSizePickerProps {
  value: number;
  color: string;
  onChange: (size: number) => void;
}

export function BrushSizePicker({ value, color, onChange }: BrushSizePickerProps) {
  const { t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t('draw.size')}
      className="flex rounded-2xl bg-card p-1 shadow-sticker-sm sticker"
    >
      {SIZES.map((size) => (
        <button
          key={size.value}
          type="button"
          role="radio"
          aria-checked={value === size.value}
          aria-label={t(size.label)}
          title={t(size.label)}
          onClick={() => onChange(size.value)}
          className={cn(
            'grid size-8 place-items-center rounded-xl transition-colors min-[360px]:size-9',
            value === size.value && 'bg-sunken ring-2 ring-ink',
          )}
        >
          <span
            className="rounded-full"
            style={{ width: size.dot, height: size.dot, backgroundColor: color }}
          />
        </button>
      ))}
    </div>
  );
}
