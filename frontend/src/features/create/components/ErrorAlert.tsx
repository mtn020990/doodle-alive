import { useI18n } from '@/shared/i18n';
import { Alert } from '@/shared/ui';
import type { FlowError } from '../types';

export function ErrorAlert({ error }: { error: FlowError }) {
  const { t } = useI18n();
  return (
    <Alert tone="danger" title={t('error.title')}>
      <p className="break-words">{error.kind === 'network' ? t('error.network') : error.message}</p>
    </Alert>
  );
}
