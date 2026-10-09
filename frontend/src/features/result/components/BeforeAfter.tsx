import { MoveHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { AnimationMedia, SCREEN_FIT } from './AnimationMedia';

interface BeforeAfterProps {
  beforeSrc: string;
  afterSrc: string;
  isVideo: boolean;
}

/** Drag a divider across: original drawing on the left, the animation on the right. */
export function BeforeAfter({ beforeSrc, afterSrc, isVideo }: BeforeAfterProps) {
  const { t } = useI18n();
  const [split, setSplit] = useState(50);

  return (
    <div
      className={`relative isolate aspect-square w-full touch-pan-y overflow-hidden bg-white ${SCREEN_FIT}`}
    >
      <AnimationMedia
        src={afterSrc}
        isVideo={isVideo}
        alt={t('result.alt')}
        controls={false}
        fill
      />
      <img
        src={beforeSrc}
        alt={t('source.previewAlt')}
        className="pointer-events-none absolute inset-0 h-full w-full bg-white object-contain"
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
      />

      <Badge className="left-3">{t('result.before')}</Badge>
      <Badge className="right-3">{t('result.after')}</Badge>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 bg-ink"
        style={{ left: `${split}%` }}
      >
        <span className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-sun text-sun-ink shadow-sticker-sm sticker">
          <MoveHorizontal className="size-5" />
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
        aria-label={t('result.compareLabel')}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

function Badge({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={`pointer-events-none absolute top-3 z-10 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-paper uppercase ${className}`}
    >
      {children}
    </span>
  );
}
