import { useI18n } from '@/shared/i18n';
import { Chip } from '@/shared/ui';
import type { MotionPreset } from '../lib/motionPresets';

interface MotionChipsProps {
  presets: MotionPreset[];
  value: string | null;
  onChange: (presetId: string | null) => void;
  disabled?: boolean;
}

export function MotionChips({ presets, value, onChange, disabled }: MotionChipsProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <Chip
          key={preset.id}
          emoji={preset.emoji}
          selected={value === preset.id}
          disabled={disabled}
          onClick={() => onChange(value === preset.id ? null : preset.id)}
          className="disabled:opacity-40"
        >
          {t(preset.label)}
        </Chip>
      ))}
    </div>
  );
}
