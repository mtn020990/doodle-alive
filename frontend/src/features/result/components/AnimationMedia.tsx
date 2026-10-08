import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

interface AnimationMediaProps {
  src: string;
  isVideo: boolean;
  alt: string;
  controls?: boolean;
  className?: string;
}

type Status = 'loading' | 'ready' | 'missing';

export function AnimationMedia({
  src,
  isVideo,
  alt,
  controls = true,
  className,
}: AnimationMediaProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>('loading');
  const media = cn(
    'block h-full w-full object-contain transition-opacity duration-300',
    status === 'ready' ? 'opacity-100' : 'opacity-0',
  );
  const events = { onError: () => setStatus('missing') };

  return (
    <div className={cn('relative', status !== 'ready' && 'min-h-64', className)}>
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
