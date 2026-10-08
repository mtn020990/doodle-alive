import { Pencil } from 'lucide-react';
import { Mascot } from '@/shared/assets/illustrations';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';

export function EmptyLibrary({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Mascot className="animate-bob size-32" />
      <h2 className="text-2xl font-extrabold">{t('library.emptyTitle')}</h2>
      <p className="max-w-xs text-muted">{t('library.emptyDesc')}</p>
      <Button size="lg" icon={<Pencil />} onClick={onStart}>
        {t('library.emptyCta')}
      </Button>
    </div>
  );
}
