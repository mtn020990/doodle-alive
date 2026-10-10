import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { makeThumbnail } from '@/shared/lib/image';
import { Alert, IconButton, Segmented } from '@/shared/ui';
import { SAMPLES, sampleToBlob, type SampleDrawing, type SampleVariant } from '../lib/samples';

export interface SamplePickerProps {
  open: boolean;
  onDone: (image: { blob: Blob; fileName: string; thumb: string | null }) => void;
  onCancel: () => void;
}

export function SamplePicker({ open, onDone, onCancel }: SamplePickerProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [variant, setVariant] = useState<SampleVariant>('colored');
  const active = useRef(true);

  useEffect(() => {
    active.current = open;
    return () => {
      active.current = false;
    };
  }, [open]);

  const pick = async (sample: SampleDrawing) => {
    setBusy(true);
    setFailed(false);
    try {
      const blob = await sampleToBlob(sample, variant);
      const thumb = await makeThumbnail(blob);
      if (active.current) onDone({ blob, fileName: `sample-${sample.id}-${variant}.png`, thumb });
    } catch {
      if (active.current) setFailed(true);
    } finally {
      if (active.current) setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 px-4 pt-safe pb-safe">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold">{t('samples.title')}</h2>
        <IconButton
          label={t('samples.close')}
          icon={<X />}
          onClick={() => {
            active.current = false;
            onCancel();
          }}
        />
      </header>
      <p className="text-muted">{t('samples.hint')}</p>
      <Segmented
        label={t('samples.variant')}
        value={variant}
        options={[
          { value: 'outline', label: t('samples.outline') },
          { value: 'colored', label: t('samples.colored') },
        ]}
        onChange={(value) => {
          if (!busy) setVariant(value);
        }}
      />
      {failed && <Alert tone="danger">{t('samples.error')}</Alert>}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-busy={busy}>
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={busy}
              onClick={() => void pick(sample)}
              className="pressable rounded-3xl bg-card p-3 shadow-sticker-sm sticker focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-grape disabled:cursor-wait disabled:opacity-50"
            >
              <img
                src={variant === 'colored' ? sample.src : sample.outlineSrc}
                alt=""
                width={768}
                height={768}
                className="aspect-square w-full rounded-2xl bg-white object-contain"
              />
              <span className="mt-2 block font-display text-lg font-bold">
                {t(`samples.${sample.id}`)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
