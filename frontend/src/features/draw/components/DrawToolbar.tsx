import { Eraser, Pencil, Trash2, Undo2 } from 'lucide-react';
import { useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';
import type { Brush } from '../hooks/useDrawing';
import { BrushSizePicker } from './BrushSizePicker';
import { ColorPalette } from './ColorPalette';

// Slightly smaller tools on very narrow phones keep the whole toolbar on one row.
const TOOL_SIZE = 'size-10 min-[360px]:size-11';

interface DrawToolbarProps {
  brush: Brush;
  onBrushChange: (brush: Brush) => void;
  canUndo: boolean;
  onUndo: () => void;
  onClear: () => void;
}

export function DrawToolbar({ brush, onBrushChange, canUndo, onUndo, onClear }: DrawToolbarProps) {
  const { t } = useI18n();
  const set = (patch: Partial<Brush>) => onBrushChange({ ...brush, ...patch });

  return (
    <div className="space-y-3">
      <ColorPalette value={brush.color} onChange={(color) => set({ color, eraser: false })} />
      <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-2 min-[360px]:gap-x-1.5">
        <div className="flex gap-1 min-[360px]:gap-1.5">
          <IconButton
            className={TOOL_SIZE}
            label={t('draw.pen')}
            icon={<Pencil />}
            active={!brush.eraser}
            aria-pressed={!brush.eraser}
            onClick={() => set({ eraser: false })}
          />
          <IconButton
            className={TOOL_SIZE}
            label={t('draw.eraser')}
            icon={<Eraser />}
            active={brush.eraser}
            aria-pressed={brush.eraser}
            onClick={() => set({ eraser: true })}
          />
        </div>
        <BrushSizePicker
          value={brush.size}
          color={brush.eraser ? 'var(--muted)' : brush.color}
          onChange={(size) => set({ size })}
        />
        <div className="flex gap-1 min-[360px]:gap-1.5">
          <IconButton
            className={TOOL_SIZE}
            label={t('draw.undo')}
            icon={<Undo2 />}
            disabled={!canUndo}
            onClick={onUndo}
          />
          <IconButton
            className={TOOL_SIZE}
            label={t('draw.clear')}
            icon={<Trash2 />}
            disabled={!canUndo}
            onClick={onClear}
          />
        </div>
      </div>
    </div>
  );
}
