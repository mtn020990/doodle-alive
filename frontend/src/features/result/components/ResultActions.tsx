import { Check, Download, Share2 } from 'lucide-react';
import { useI18n } from '@/shared/i18n';
import { Button, LinkButton, Spinner } from '@/shared/ui';
import { useShare } from '../hooks/useShare';
import type { AnimationResult } from '../types';

export function ResultActions({ result }: { result: AnimationResult }) {
  const { t } = useI18n();
  const { share, state, supported } = useShare(result.outputUrl);
  const ext = result.outputUrl.split('.').pop() ?? 'gif';
  const fileName = `doodle-alive-${result.id}.${ext}`;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <LinkButton
          href={result.outputUrl}
          download={fileName}
          variant="secondary"
          icon={<Download />}
          className={supported ? '' : 'col-span-2'}
        >
          {t('result.save')}
        </LinkButton>
        {supported && (
          <Button
            variant="secondary"
            icon={state === 'busy' ? <Spinner /> : state === 'copied' ? <Check /> : <Share2 />}
            disabled={state === 'busy'}
            onClick={() => share(t('result.shareTitle'))}
          >
            {t('result.share')}
          </Button>
        )}
      </div>
      <p aria-live="polite" className="min-h-5 text-center text-sm font-medium text-muted">
        {state === 'copied' && t('result.copied')}
        {state === 'failed' && t('result.shareFailed')}
      </p>
    </div>
  );
}
