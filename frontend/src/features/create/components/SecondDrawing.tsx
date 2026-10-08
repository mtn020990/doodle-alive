import { ImagePlus, Pencil, X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useObjectUrl } from '@/shared/hooks/useObjectUrl';
import { useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';
import type { PickedImage } from '../types';

interface SecondDrawingProps {
  image: PickedImage | null;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onDraw: () => void;
  onRemove: () => void;
}

/** Optional second drawing: both meet in one AI video. */
export function SecondDrawing({ image, onFile, onDraw, onRemove }: SecondDrawingProps) {
  const { t } = useI18n();
  const preview = useObjectUrl(image?.blob);

  if (image && preview) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border-2 border-line bg-card p-3">
        <img
          src={preview}
          alt={t('source.secondAlt')}
          className="size-16 shrink-0 rotate-3 rounded-xl border-2 border-line bg-white object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">{t('source.secondAlt')}</p>
          <p className="text-sm text-muted">{t('source.secondHint')}</p>
        </div>
        <IconButton label={t('source.secondRemove')} icon={<X />} onClick={onRemove} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-3xl border-2 border-dashed border-soft-line p-2 pl-3">
      <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl focus-within:outline-3 focus-within:outline-grape">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="sr-only"
        />
        <ImagePlus aria-hidden="true" className="size-6 shrink-0 text-grape" />
        <span className="min-w-0">
          <span className="block font-display text-base leading-tight font-bold">
            {t('source.second')}
          </span>
          <span className="block text-sm text-muted">{t('source.secondHint')}</span>
        </span>
      </label>
      <IconButton label={t('source.draw')} icon={<Pencil />} onClick={onDraw} />
    </div>
  );
}
