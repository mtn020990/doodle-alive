import { ClipboardCheck, Info, Palette, Timer, Wand2, X } from 'lucide-react';
import { useId } from 'react';
import type { Mode } from '@/shared/api';
import { useObjectUrl } from '@/shared/hooks/useObjectUrl';
import { useI18n, type MessageKey } from '@/shared/i18n';
import { Button, Card, Spinner, Switch, TextArea } from '@/shared/ui';
import { presetsFor, usesDuration } from '../lib/motionPresets';
import type { FlowError, MotionChoice, PickedImage } from '../types';
import { BackButton } from './BackButton';
import { ErrorAlert } from './ErrorAlert';
import { ModeCard } from './ModeCard';
import { MotionChips } from './MotionChips';
import { StickyActions } from './StickyActions';

const MODES: { value: Mode; emoji: string; title: MessageKey; desc: MessageKey }[] = [
  { value: 'character', emoji: '🧍', title: 'mode.character', desc: 'mode.characterDesc' },
  { value: 'animal', emoji: '🐕', title: 'mode.animal', desc: 'mode.animalDesc' },
  { value: 'auto', emoji: '🪄', title: 'mode.auto', desc: 'mode.autoDesc' },
  { value: 'scene', emoji: '🚀', title: 'mode.scene', desc: 'mode.sceneDesc' },
];

const HELP: Record<Mode, [placeholder: MessageKey, hint: MessageKey]> = {
  character: ['motion.ph.character', 'motion.help.character'],
  animal: ['motion.ph.animal', 'motion.help.animal'],
  auto: ['motion.ph.auto', 'motion.help.auto'],
  scene: ['motion.ph.scene', 'motion.help.scene'],
};

interface MotionStepProps {
  image: PickedImage;
  second: PickedImage | null;
  choice: MotionChoice;
  onChange: (choice: MotionChoice) => void;
  onBack: () => void;
  onGenerate: () => void;
  onCheck: () => void;
  checking: boolean;
  checkError: FlowError | null;
}

export function MotionStep({
  image,
  second,
  choice,
  onChange,
  onBack,
  onGenerate,
  onCheck,
  checking,
  checkError,
}: MotionStepProps) {
  const { t } = useI18n();
  const set = (patch: Partial<MotionChoice>) => onChange({ ...choice, ...patch });
  const pair = !!second;
  const presets = presetsFor(choice.mode, pair);

  return (
    <div className="space-y-7">
      <DrawingsHeader image={image} second={second} />

      <section className="space-y-3">
        <h3 className="text-lg font-bold">{t('motion.kindLabel')}</h3>
        {pair && (
          <p className="flex items-start gap-2 rounded-2xl bg-sunken p-3 text-sm text-muted">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-grape" />
            {t('motion.pairNote')}
          </p>
        )}
        <div
          role="radiogroup"
          aria-label={t('motion.kindLabel')}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {MODES.map((m) => (
            <ModeCard
              key={m.value}
              emoji={m.emoji}
              title={t(m.title)}
              description={t(m.desc)}
              selected={choice.mode === m.value}
              onSelect={() => set({ mode: m.value, presetId: null })}
            />
          ))}
        </div>
      </section>

      {presets.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-bold">{t('motion.ideas')}</h3>
          <MotionChips
            presets={presets}
            value={choice.customPrompt.trim() ? null : choice.presetId}
            disabled={!!choice.customPrompt.trim()}
            onChange={(presetId) => set({ presetId })}
          />
        </section>
      )}

      <PromptField
        mode={pair ? 'scene' : choice.mode}
        value={choice.customPrompt}
        onChange={(customPrompt) => set({ customPrompt })}
      />

      <Card className="space-y-4 p-4">
        <h3 className="font-display text-lg font-extrabold">{t('motion.extras')}</h3>
        {usesDuration(choice.mode, pair) && (
          <DurationSlider value={choice.duration} onChange={(duration) => set({ duration })} />
        )}
        <Switch
          icon={<Palette />}
          label={t('motion.paint')}
          description={t('motion.paintHint')}
          checked={choice.paint}
          onChange={(paint) => set({ paint })}
        />
      </Card>

      <div className="space-y-2">
        <Button
          variant="secondary"
          block
          icon={checking ? <Spinner /> : <ClipboardCheck />}
          disabled={checking}
          onClick={onCheck}
        >
          {checking ? t('review.busyLook') : t('motion.check')}
        </Button>
        {checkError && <ErrorAlert error={checkError} />}
      </div>

      <StickyActions>
        <BackButton onClick={onBack} />
        <Button size="lg" block icon={<Wand2 />} onClick={onGenerate} disabled={checking}>
          {t('motion.go')}
        </Button>
      </StickyActions>
    </div>
  );
}

function DrawingsHeader({ image, second }: { image: PickedImage; second: PickedImage | null }) {
  const { t } = useI18n();
  const preview = useObjectUrl(image.blob);
  const preview2 = useObjectUrl(second?.blob);
  return (
    <header className="flex items-center gap-4">
      <div className="relative shrink-0">
        {preview && (
          <img
            src={preview}
            alt={t('source.previewAlt')}
            className="size-20 -rotate-3 rounded-2xl bg-white object-cover shadow-sticker-sm sticker"
          />
        )}
        {preview2 && (
          <img
            src={preview2}
            alt={t('source.secondAlt')}
            className="absolute -right-3 -bottom-3 size-12 rotate-6 rounded-xl bg-white object-cover sticker"
          />
        )}
      </div>
      <h2 className="text-3xl font-extrabold text-balance">{t('motion.title')}</h2>
    </header>
  );
}

function PromptField({
  mode,
  value,
  onChange,
}: {
  mode: Mode;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const [placeholder, hint] = HELP[mode];
  return (
    <section className="space-y-2">
      <label htmlFor={id} className="flex items-baseline gap-2 text-lg font-bold">
        {t('motion.custom')}
        <span className="text-sm font-medium text-muted">({t('motion.optional')})</span>
      </label>
      <div className="relative">
        <TextArea
          id={id}
          aria-describedby={`${id}-hint`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t(placeholder)}
          rows={2}
          maxLength={300}
          enterKeyHint="done"
          className="resize-none pr-12"
        />
        {value && (
          <button
            type="button"
            aria-label={t('motion.clear')}
            onClick={() => onChange('')}
            className="absolute top-2 right-2 grid size-10 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>
      <p id={`${id}-hint`} className="text-sm text-muted">
        {t(hint)}
      </p>
    </section>
  );
}

function DurationSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center gap-2 font-bold">
        <Timer aria-hidden="true" className="size-5 text-grape" />
        <span className="flex-1">{t('motion.duration')}</span>
        <span className="rounded-full bg-sun px-2.5 py-0.5 text-sm text-sun-ink tabular-nums">
          {t('motion.seconds', { n: value })}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={2}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-full accent-coral"
      />
      <p className="text-sm text-muted">{t('motion.durationHint')}</p>
    </div>
  );
}
