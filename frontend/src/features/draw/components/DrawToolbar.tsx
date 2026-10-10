import { Trash2, Undo2 } from 'lucide-react';
import { useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';
import type { Brush } from '../hooks/useDrawing';
import { BrushSizePicker } from './BrushSizePicker';
import { ColorPalette } from './ColorPalette';
import { ToolPicker } from './ToolPicker';

interface DrawToolbarProps {
  brush: Brush;
  onBrushChange: (brush: Brush) => void;
  canUndo: boolean;
  canClear: boolean;
  onUndo: () => void;
  onClear: () => void;
}

export function DrawToolbar({
  brush,
  onBrushChange,
  canUndo,
  canClear,
  onUndo,
  onClear,
}: DrawToolbarProps) {
  const { t } = useI18n();
  const set = (patch: Partial<Brush>) => onBrushChange({ ...brush, ...patch });
  const erasing = brush.tool === 'eraser';

  return (
    <div className="space-y-2.5">
      <ColorPalette
        value={brush.color}
        // Picking a colour while erasing goes back to the pen.
        onChange={(color) => set({ color, tool: erasing ? 'pen' : brush.tool })}
      />
      <ToolPicker value={brush.tool} onChange={(tool) => set({ tool })} />
      <div className="flex items-center justify-between gap-2">
        <BrushSizePicker
          value={brush.size}
          color={erasing ? 'var(--muted)' : brush.color}
          onChange={(size) => set({ size })}
        />
        <div className="flex gap-1.5">
          <IconButton
            label={t('draw.undo')}
            icon={<Undo2 />}
            disabled={!canUndo}
            onClick={onUndo}
          />
          <IconButton
            label={t('draw.clear')}
            icon={<Trash2 />}
            disabled={!canClear}
            onClick={onClear}
          />
        </div>
      </div>
    </div>
  );
}
