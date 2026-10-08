import { Check, Dices, Wand2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import type { Draft } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Alert, Badge, Button, Spinner, TextArea, TextInput } from '@/shared/ui';
import type { DescribeAction, FlowError } from '../types';
import { BackButton } from './BackButton';
import { ErrorAlert } from './ErrorAlert';
import { StickyActions } from './StickyActions';

interface ReviewStepProps {
  draft: Draft;
  busy: DescribeAction | null;
  error: FlowError | null;
  onChange: (current: string, change: string) => void;
  onDifferent: (current: string) => void;
  onGo: (text: string) => void;
  onBack: () => void;
}

/** Review the AI's prompt before animating: edit it, ask for a change, or get a different idea. */
export function ReviewStep({
  draft,
  busy,
  error,
  onChange,
  onDifferent,
  onGo,
  onBack,
}: ReviewStepProps) {
  const { t } = useI18n();
  const [text, setText] = useState(draft.prompt);
  const [edited, setEdited] = useState(false);
  const [change, setChange] = useState('');
  const promptId = useId();
  const changeId = useId();
  const move = draft.motion ? draft.motion.replace('_', ' ') : t('review.random');

  // Figures can only play recorded moves; say which one this text gets, and why.
  const what =
    draft.kind === 'character'
      ? edited
        ? t('review.danceTyped', { move })
        : `${t('review.dance', { move })}${draft.motion_reason ? ` (${draft.motion_reason})` : ''}`
      : draft.kind === 'animal'
        ? t('review.walks')
        : t('review.video');

  const apply = (e: FormEvent) => {
    e.preventDefault();
    if (change.trim()) onChange(text, change);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-3xl font-extrabold">{t('review.title')}</h2>
        <p className="flex flex-wrap items-center gap-2">
          <Badge>{draft.subject}</Badge>
          <span className="text-sm text-muted">{what}</span>
        </p>
      </header>

      {draft.warning && <Alert tone="warning">{draft.warning}</Alert>}

      <div className="space-y-2">
        <label htmlFor={promptId} className="text-lg font-bold">
          {t('review.promptLabel')}
        </label>
        <TextArea
          id={promptId}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setEdited(true);
          }}
          rows={6}
          disabled={!!busy}
          className="resize-y"
        />
      </div>

      <form onSubmit={apply} className="space-y-2">
        <label htmlFor={changeId} className="text-lg font-bold">
          {t('review.changeLabel')}
        </label>
        <div className="flex gap-2">
          <TextInput
            id={changeId}
            type="text"
            value={change}
            onChange={(e) => setChange(e.target.value)}
            placeholder={t('review.changePlaceholder')}
            enterKeyHint="send"
            disabled={!!busy}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={!!busy || !change.trim()}
            icon={busy === 'change' ? <Spinner /> : <Check />}
          >
            {t('review.apply')}
          </Button>
        </div>
      </form>

      <Button
        variant="secondary"
        block
        disabled={!!busy}
        icon={busy === 'different' ? <Spinner /> : <Dices />}
        onClick={() => onDifferent(text)}
      >
        {busy === 'different' ? t('review.busyDifferent') : t('review.different')}
      </Button>

      <p aria-live="polite" className="sr-only">
        {busy === 'change' && t('review.busyUpdate')}
        {busy === 'different' && t('review.busyDifferent')}
      </p>

      {error && <ErrorAlert error={error} />}

      <StickyActions>
        <BackButton onClick={onBack} />
        <Button
          size="lg"
          block
          icon={<Wand2 />}
          disabled={!!busy || !text.trim()}
          onClick={() => onGo(text.trim())}
        >
          {t('motion.go')}
        </Button>
      </StickyActions>
    </div>
  );
}
