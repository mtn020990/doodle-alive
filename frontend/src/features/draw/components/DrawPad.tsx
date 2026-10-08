import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { Button, IconButton } from '@/shared/ui';
import { CANVAS_SIZE, useDrawing, type Brush } from '../hooks/useDrawing';
import { COLORS, SIZES } from '../lib/brushes';
import { DrawToolbar } from './DrawToolbar';

interface DrawPadProps {
  onDone: (drawing: Blob) => void;
  onCancel: () => void;
}

/** Full-screen sketchpad: square paper in the middle, tools in the thumb zone. */
export function DrawPad({ onDone, onCancel }: DrawPadProps) {
  const { t } = useI18n();
  const [brush, setBrush] = useState<Brush>({
    color: COLORS[0].value,
    size: SIZES[1].value,
    eraser: false,
  });
  const { canvasRef, handlers, isEmpty, undo, clear, toBlob } = useDrawing(brush);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      onDone(await toBlob());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col gap-3 px-4 pt-safe pb-safe">
      <header className="flex items-center justify-between gap-3">
        <IconButton label={t('draw.cancel')} icon={<X />} onClick={onCancel} />
        <h2 className="text-2xl font-extrabold">{t('draw.title')}</h2>
        <Button icon={<Check />} disabled={isEmpty || saving} onClick={finish}>
          {t('draw.done')}
        </Button>
      </header>

      {/* The canvas keeps a square shape and shrinks to whatever space is left. */}
      <div className="[container-type:size] flex min-h-0 flex-1 items-center justify-center">
        <div className="relative aspect-square w-[min(100cqw,100cqh)] overflow-hidden rounded-3xl bg-white shadow-sticker-lg sticker">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
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
