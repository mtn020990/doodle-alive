import { ArrowRight, Camera, ImageUp, Lightbulb, Pencil, Video } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { LiveCamera, liveCameraSupported } from '@/features/camera';
import { DrawPad } from '@/features/draw';
import { Mascot, Sparkle } from '@/shared/assets/illustrations';
import { useObjectUrl } from '@/shared/hooks/useObjectUrl';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { makeThumbnail } from '@/shared/lib/image';
import { Alert, Button, Card, Sheet } from '@/shared/ui';
import type { PickedImage } from '../types';
import { SecondDrawing } from './SecondDrawing';
import { SourceChip, SourceTile, type SourceOption } from './SourceOption';
import { StickyActions } from './StickyActions';

interface SourceStepProps {
  image: PickedImage | null;
  second: PickedImage | null;
  onPick: (image: PickedImage) => void;
  onPickSecond: (image: PickedImage | null) => void;
  onNext: () => void;
}

type Target = 'main' | 'second';

async function toPicked(blob: Blob, fileName: string): Promise<PickedImage> {
  return { blob, fileName, thumb: await makeThumbnail(blob) };
}

export function SourceStep({ image, second, onPick, onPickSecond, onNext }: SourceStepProps) {
  const { t } = useI18n();
  const [drawFor, setDrawFor] = useState<Target | null>(null);
  const [camera, setCamera] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const preview = useObjectUrl(image?.blob);
  const live = liveCameraSupported();

  const accept = async (target: Target, blob: Blob, fileName: string) => {
    setInvalid(false);
    const picked = await toPicked(blob, fileName);
    if (target === 'main') onPick(picked);
    else onPickSecond(picked);
  };

  const fileHandler = (target: Target) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) return setInvalid(true);
    void accept(target, file, file.name || 'drawing.jpg');
  };
  const onFile = fileHandler('main');

  const options = [
    live && {
      key: 'live',
      icon: <Video />,
      label: t('source.live'),
      hint: t('source.liveHint'),
      onClick: () => setCamera(true),
    },
    {
      key: 'camera',
      icon: <Camera />,
      label: t('source.camera'),
      hint: t('source.cameraHint'),
      capture: true,
    },
    { key: 'upload', icon: <ImageUp />, label: t('source.upload'), hint: t('source.uploadHint') },
    {
      key: 'draw',
      icon: <Pencil />,
      label: t('source.draw'),
      hint: t('source.drawHint'),
      onClick: () => setDrawFor('main'),
    },
  ].filter(Boolean) as SourceOption[];
  const [primary, ...others] = options;
  const tones = ['bg-sky text-[#10283a]', 'bg-sun text-sun-ink', 'bg-mint text-[#0b2a22]'];

  return (
    <div className="space-y-6">
      {image && preview ? (
        <>
          <h2 className="text-center text-3xl font-extrabold">{t('source.title')}</h2>
          <Card className="relative overflow-hidden bg-white p-0">
            <img
              src={preview}
              alt={t('source.previewAlt')}
              className="mx-auto block max-h-[46dvh] w-full object-contain"
            />
          </Card>
          <div className="flex flex-wrap justify-center gap-2">
            {options.map((option) => (
              <SourceChip key={option.key} option={option} onFile={onFile} />
            ))}
          </div>

          <SecondDrawing
            image={second}
            onFile={fileHandler('second')}
            onDraw={() => setDrawFor('second')}
            onRemove={() => onPickSecond(null)}
          />

          <StickyActions>
            <Button
              size="lg"
              block
              icon={<ArrowRight />}
              onClick={onNext}
              className="flex-row-reverse"
            >
              {t('source.next')}
            </Button>
          </StickyActions>
        </>
      ) : (
        <>
          <header className="relative flex flex-col items-center gap-2 pt-2 text-center">
            <div className="relative">
              <Mascot className="animate-bob size-24" />
              <Sparkle className="animate-twinkle absolute -top-1 -right-4 size-7" />
              <Sparkle
                className="animate-twinkle absolute bottom-3 -left-5 size-5 [animation-delay:.8s]"
                color="var(--sky)"
              />
            </div>
            <h2 className="text-4xl font-extrabold text-balance">{t('source.title')}</h2>
            <p className="max-w-sm text-pretty text-muted">{t('source.subtitle')}</p>
          </header>

          <div className="space-y-3">
            <SourceTile option={primary} onFile={onFile} tone="bg-coral text-coral-ink" />
            <div className={cn('grid gap-3', others.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
              {others.map((option, i) => (
                <SourceTile
                  key={option.key}
                  option={option}
                  onFile={onFile}
                  tone={tones[i]}
                  small
                />
              ))}
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-2xl bg-sunken p-4 text-sm text-muted">
            <Lightbulb aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sun" />
            {t('source.tip')}
          </p>
        </>
      )}

      {invalid && <Alert tone="danger">{t('source.notImage')}</Alert>}

      <Sheet open={drawFor !== null} onClose={() => setDrawFor(null)} label={t('draw.title')}>
        <DrawPad
          onCancel={() => setDrawFor(null)}
          onDone={(blob) => {
            const target = drawFor ?? 'main';
            setDrawFor(null);
            void accept(target, blob, 'drawing.png');
          }}
        />
      </Sheet>

      <Sheet open={camera} onClose={() => setCamera(false)} label={t('camera.title')}>
        <LiveCamera
          onCancel={() => setCamera(false)}
          onPhoto={(photo) => {
            setCamera(false);
            void accept('main', photo, photo.name);
          }}
        />
      </Sheet>
    </div>
  );
}
