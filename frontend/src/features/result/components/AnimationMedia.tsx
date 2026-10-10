import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

/** Tallest the animation may be, so all of it stays on screen even on short windows. */
export const SCREEN_FIT = 'max-h-[55dvh]';

interface AnimationMediaProps {
  src: string;
  isVideo: boolean;
  alt: string;
  controls?: boolean;
  /** Fill a sized parent (before/after view) instead of fitting the screen height. */
  fill?: boolean;
}

type Status = 'loading' | 'ready' | 'missing';

export function AnimationMedia({ src, isVideo, alt, controls = true, fill }: AnimationMediaProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>('loading');
  // The size limit sits on the image itself: object-contain then shrinks the whole
  // animation to fit, instead of a wrapper cropping it.
  const media = cn(
    'block object-contain transition-opacity duration-300',
    fill
      ? 'h-full w-full'
      : cn('mx-auto', SCREEN_FIT, isVideo ? 'h-auto w-auto max-w-full' : 'w-full'),
    status === 'ready' ? 'opacity-100' : 'opacity-0',
  );
  const events = { onError: () => setStatus('missing') };

  return (
    <div className={cn(fill ? 'absolute inset-0' : 'relative', status !== 'ready' && 'min-h-64')}>
      {status === 'loading' && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse rounded-[inherit] bg-sunken"
        />
      )}
      {status === 'missing' && (
        <p className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-muted">
          <ImageOff aria-hidden="true" className="size-8" />
          {t('result.missing')}
        </p>
      )}
      {isVideo ? (
        <video
          src={src}
          className={media}
          autoPlay
          loop
          muted
          playsInline
          controls={controls}
          aria-label={alt}
          onLoadedData={() => setStatus('ready')}
          {...events}
        />
      ) : (
        <img src={src} alt={alt} className={media} onLoad={() => setStatus('ready')} {...events} />
      )}
    </div>
  );
}
