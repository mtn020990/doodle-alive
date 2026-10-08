import { ArrowLeft, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { ResultView } from '@/features/result';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { useLibrary } from '../hooks/useLibrary';
import { libraryStore } from '../lib/libraryStore';
import { EmptyLibrary } from './EmptyLibrary';
import { LibraryCard } from './LibraryCard';

export function LibraryPage({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();
  const items = useLibrary();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = items.find((i) => i.id === openId);

  if (open) {
    const remove = () => {
      if (!window.confirm(t('library.confirmDelete'))) return;
      libraryStore.remove(open.id);
      setOpenId(null);
    };
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          icon={<ArrowLeft />}
          onClick={() => setOpenId(null)}
          className="-ml-2"
        >
          {t('library.back')}
        </Button>
        <ResultView
          celebrate={false}
          result={{ ...open, beforeSrc: open.thumb }}
          footer={
            <Button
              variant="ghost"
              icon={<Trash2 />}
              onClick={remove}
              block
              className="text-danger-ink"
            >
              {t('library.delete')}
            </Button>
          }
        />
      </div>
    );
  }

  if (items.length === 0) return <EmptyLibrary onStart={onCreate} />;

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-3xl font-extrabold">{t('library.title')}</h2>
        <p className="text-muted">
          {t('library.count', { n: items.length })} · {t('library.note')}
        </p>
      </header>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <LibraryCard item={item} onOpen={() => setOpenId(item.id)} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
