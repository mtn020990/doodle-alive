import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';

/** Icon-only "back" next to a step's main button. */
export function BackButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <Button
      variant="secondary"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      aria-label={t('motion.back')}
      className="px-4"
    >
      <ArrowLeft aria-hidden="true" className="size-6" />
    </Button>
  );
}
