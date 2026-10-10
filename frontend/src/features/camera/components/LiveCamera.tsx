import { Aperture, X } from 'lucide-react';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Alert, Button, IconButton } from '@/shared/ui';
import { useSteadyCamera, type CameraHint } from '../hooks/useSteadyCamera';

interface LiveCameraProps {
  open: boolean;
  onPhoto: (photo: File) => void;
  onCancel: () => void;
}

/** Full-screen viewfinder with a paper guide; snaps by itself when held still. */
export function LiveCamera({ open, onPhoto, onCancel }: LiveCameraProps) {
  const { t } = useI18n();
  const { videoRef, hint, snap } = useSteadyCamera(onPhoto, open);

  const hintText = (h: CameraHint) => {
    switch (h.kind) {
      case 'starting':
        return t('camera.starting');
      case 'fit':
        return t('camera.fit');
      case 'light':
        return t('camera.light');
      case 'hold':
        return t('camera.hold', { n: h.seconds });
      case 'got':
        return t('camera.got');
      case 'error':
        return '';
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#14101c] text-white">
      <div className="flex items-center justify-between gap-3 px-4 pt-safe pb-3">
        <IconButton label={t('camera.cancel')} icon={<X />} onClick={onCancel} />
        <h2 className="font-display text-xl font-extrabold">{t('camera.title')}</h2>
        <span className="size-12" aria-hidden="true" />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Paper guide: A4-ish portrait frame with dashed edges. */}
        <div
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 left-1/2 aspect-[3/4] h-[78%] max-w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 border-dashed transition-colors',
            hint.kind === 'hold' || hint.kind === 'got' ? 'border-mint' : 'border-white/85',
          )}
          style={{ boxShadow: '0 0 0 100vmax rgb(0 0 0 / 0.35)' }}
        />
        <p
          aria-live="polite"
          className="absolute inset-x-4 bottom-4 mx-auto w-fit max-w-full rounded-full bg-black/65 px-4 py-2 text-center font-display text-lg font-bold"
        >
          {hintText(hint)}
        </p>
        {hint.kind === 'error' && (
          <div className="absolute inset-x-4 top-4">
            <Alert tone="danger" title={t('camera.errorTitle')}>
              <p>{t('camera.error')}</p>
              <p className="text-xs opacity-80">{hint.message}</p>
            </Alert>
          </div>
        )}
      </div>

      <div className="flex justify-center px-4 pt-4 pb-safe">
        <Button
          size="lg"
          icon={<Aperture />}
          onClick={snap}
          disabled={hint.kind === 'starting' || hint.kind === 'error' || hint.kind === 'got'}
          className="min-w-56"
        >
          {t('camera.snap')}
        </Button>
      </div>
    </div>
  );
}
