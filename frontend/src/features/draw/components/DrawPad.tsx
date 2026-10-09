import { Check, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { Button, IconButton } from '@/shared/ui';
import { useDrawing, type Brush, type CanvasSize } from '../hooks/useDrawing';
import { COLORS, SIZES } from '../lib/brushes';
import { DrawToolbar } from './DrawToolbar';

/** Canvas pixels along the longer side; plenty of detail for the photo clean-up step. */
const LONG_SIDE = 1400;
const UNMEASURED: CanvasSize = { width: 1, height: 1 };

/** A paper size that fills the free area, kept between landscape-ish and tall portrait. */
function paperFor(width: number, height: number): CanvasSize {
  const ratio = Math.min(Math.max(height / width, 0.6), 1.7);
  return ratio >= 1
    ? { width: Math.round(LONG_SIDE / ratio), height: LONG_SIDE }
    : { width: LONG_SIDE, height: Math.round(LONG_SIDE * ratio) };
}

interface DrawPadProps {
  onDone: (drawing: Blob) => void;
  onCancel: () => void;
}

/**
 * Full-screen sketchpad: the paper fills the space between the header and the tools.
 * Its shape is measured once when the pad opens and then kept, so strokes stay put if
 * the phone is rotated (the paper just scales to fit).
 */
export function DrawPad({ onDone, onCancel }: DrawPadProps) {
  const { t } = useI18n();
  const [brush, setBrush] = useState<Brush>({
    color: COLORS[0].value,
    size: SIZES[1].value,
    tool: 'pen',
  });
  const [paper, setPaper] = useState<CanvasSize | null>(null);
  const { canvasRef, handlers, isEmpty, undo, clear, toBlob } = useDrawing(
    brush,
    paper ?? UNMEASURED,
  );
  const [saving, setSaving] = useState(false);

  const measure = useCallback((area: HTMLDivElement | null) => {
    const rect = area?.getBoundingClientRect();
    if (rect?.width && rect.height) {
      setPaper((current) => current ?? paperFor(rect.width, rect.height));
    }
  }, []);

  const finish = async () => {
    setSaving(true);
    try {
      onDone(await toBlob());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-2.5 px-3 pt-safe pb-safe sm:px-4">
      <header className="flex items-center justify-between gap-3">
        <IconButton label={t('draw.cancel')} icon={<X />} onClick={onCancel} />
        <h2 className="text-2xl font-extrabold">{t('draw.title')}</h2>
        <Button icon={<Check />} disabled={isEmpty || saving} onClick={finish}>
          {t('draw.done')}
        </Button>
      </header>

      <div
        ref={measure}
        className="[container-type:size] flex min-h-0 flex-1 items-center justify-center"
      >
        {paper && (
          <div
            className="relative overflow-hidden rounded-3xl bg-white shadow-sticker sticker"
            style={{
              aspectRatio: `${paper.width} / ${paper.height}`,
              // As large as fits the area in both directions.
              width: `min(100cqw, calc(100cqh * ${paper.width / paper.height}))`,
            }}
          >
            <canvas
              ref={canvasRef}
              width={paper.width}
              height={paper.height}
              role="img"
              aria-label={t('draw.canvasLabel')}
              className="block h-full w-full touch-none"
              style={{ cursor: 'crosshair' }}
              {...handlers}
            />
            {isEmpty && (
              <p className="pointer-events-none absolute inset-0 grid place-items-center font-display text-2xl font-bold text-[#c9bfae]">
                {t('draw.emptyHint')}
              </p>
            )}
          </div>
        )}
      </div>

      <DrawToolbar
        brush={brush}
        onBrushChange={setBrush}
        canUndo={!isEmpty}
        onUndo={undo}
        onClear={clear}
      />
    </div>
  );
}
