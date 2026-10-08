import { Play } from 'lucide-react';
import { useI18n } from '@/shared/i18n';
import type { LibraryItem } from '../types';

interface LibraryCardProps {
  item: LibraryItem;
  onOpen: () => void;
}

export function LibraryCard({ item, onOpen }: LibraryCardProps) {
  const { t, lang } = useI18n();
  const title = item.subject || t('library.untitled');
  // GIFs preview themselves; for videos show the original drawing.
  const preview = item.isVideo ? item.thumb : item.outputUrl;
  const date = new Date(item.createdAt).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex pressable flex-col overflow-hidden rounded-3xl bg-card text-left shadow-sticker sticker"
    >
      <span className="relative block aspect-square w-full bg-white">
        {preview && (
          <img src={preview} alt="" loading="lazy" className="h-full w-full object-contain" />
        )}
        {item.isVideo && (
          <span className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-full bg-ink/80 text-paper">
            <Play aria-hidden="true" className="size-4 fill-current" />
          </span>
        )}
      </span>
      <span className="flex flex-col gap-0.5 border-t-[2.5px] border-line px-3 py-2">
        <span className="truncate font-display text-base font-bold first-letter:uppercase">
          {title}
        </span>
        <span className="text-xs text-muted">{date}</span>
      </span>
    </button>
  );
}
