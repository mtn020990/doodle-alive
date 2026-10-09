import { Film, SplitSquareHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Sparkle } from '@/shared/assets/illustrations';
import { useI18n } from '@/shared/i18n';
import { sound, SoundToggle } from '@/shared/sound';
import { Alert, Badge, Card, Segmented } from '@/shared/ui';
import type { AnimationResult } from '../types';
import { AnimationMedia } from './AnimationMedia';
import { BeforeAfter } from './BeforeAfter';
import { ResultActions } from './ResultActions';

type View = 'animation' | 'compare';

interface ResultViewProps {
  result: AnimationResult;
  /** Extra buttons under Save/Share (e.g. "New drawing", "Delete"). */
  footer?: ReactNode;
  /** Show the celebratory title; off when reopening from the library. */
  celebrate?: boolean;
}

export function ResultView({ result, footer, celebrate = true }: ResultViewProps) {
  const { t } = useI18n();
  const [view, setView] = useState<View>('animation');

  // The result's music loops until stopped: stop it when leaving this view.
  useEffect(() => () => sound.stop(), []);

  return (
    <div className="space-y-5">
      {celebrate && (
        <motion.header
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="relative text-center"
        >
          <Sparkle className="animate-twinkle absolute -top-1 left-2 size-7" />
          <Sparkle
            className="animate-twinkle absolute top-6 right-3 size-5 [animation-delay:.6s]"
            color="var(--mint)"
          />
          <h2 className="px-8 text-3xl font-extrabold text-balance">{t('result.title')}</h2>
        </motion.header>
      )}

      {result.subject && (
        <p className="text-center">
          <Badge className="px-4 py-1.5 text-lg">{result.subject}</Badge>
        </p>
      )}

      {result.beforeSrc && (
        <Segmented
          label={t('result.view')}
          value={view}
          onChange={setView}
          className="mx-auto max-w-xs"
          options={[
            { value: 'animation', label: t('result.animation'), icon: <Film /> },
            { value: 'compare', label: t('result.compare'), icon: <SplitSquareHorizontal /> },
          ]}
        />
      )}

      <Card className="overflow-hidden bg-white p-0">
        {view === 'compare' && result.beforeSrc ? (
          <BeforeAfter
            beforeSrc={result.beforeSrc}
            afterSrc={result.outputUrl}
            isVideo={result.isVideo}
          />
        ) : (
          <AnimationMedia
            src={result.outputUrl}
            isVideo={result.isVideo}
            alt={result.subject ?? t('result.alt')}
          />
        )}
      </Card>

      {result.warning && (
        <Alert tone="warning">
          <p className="break-words">{result.warning}</p>
        </Alert>
      )}

      {result.animator && (
        <p className="text-center text-sm text-muted">
          {t('result.madeWith', { animator: result.animator })}
        </p>
      )}

      <ResultActions result={result} />
      <SoundToggle effect={result.sound} music={result.music} />
      {footer}
    </div>
  );
}
