import { motion } from 'motion/react';
import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Card } from '@/shared/ui';
import { readScore, saveScore, type Score } from '../lib/score';

type Answer = { picked: number; aiKnew: boolean; first: boolean };

/** "Guess my drawing": while the animation is made, does the AI know what you drew? */
export function GuessGame({ guesses }: { guesses: string[] }) {
  const { t } = useI18n();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [score, setScore] = useState<Score>(readScore);
  if (!guesses.length) return null;

  const choices = [...guesses, t('game.somethingElse')];
  const pick = (i: number) => {
    const aiKnew = i < guesses.length;
    const next = { ai: score.ai + (aiKnew ? 1 : 0), you: score.you + (aiKnew ? 0 : 1) };
    saveScore(next);
    setScore(next);
    setAnswer({ picked: i, aiKnew, first: i === 0 });
  };

  return (
    <Card className="space-y-3 p-4 text-left">
      <h3 className="font-display text-xl font-extrabold">🤔 {t('game.title')}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map((choice, i) => (
          <button
            key={choice}
            type="button"
            disabled={!!answer}
            onClick={() => pick(i)}
            className={cn(
              'min-h-12 pressable rounded-2xl px-4 text-left font-semibold shadow-sticker-sm sticker first-letter:uppercase',
              answer?.picked === i ? 'bg-sun text-sun-ink' : 'bg-card',
              answer && answer.picked !== i && 'opacity-50',
            )}
          >
            {choice}
          </button>
        ))}
      </div>
      {answer && (
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          aria-live="polite"
          className="text-center font-display text-lg font-bold"
        >
          {!answer.aiKnew
            ? t('game.fooled')
            : answer.first
              ? t('game.first')
              : t('game.eventually')}
        </motion.p>
      )}
      <p className="text-center text-sm text-muted">
        {t('game.score', { ai: score.ai, you: score.you })}
      </p>
    </Card>
  );
}
