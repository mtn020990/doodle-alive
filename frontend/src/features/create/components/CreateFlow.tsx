import { PencilLine, RotateCcw, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { FlowChart } from '@/features/pipeline';
import { ResultView } from '@/features/result';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { useCreateFlow } from '../hooks/useCreateFlow';
import type { FlowState } from '../types';
import { ErrorAlert } from './ErrorAlert';
import { GeneratingStep } from './GeneratingStep';
import { MotionStep } from './MotionStep';
import { ReviewStep } from './ReviewStep';
import { SourceStep } from './SourceStep';
import { Stepper } from './Stepper';

const STEP_INDEX: Record<FlowState['step'], number> = {
  source: 0,
  motion: 1,
  review: 1,
  generating: 2,
  error: 2,
  result: 3,
};

export function CreateFlow() {
  const { t } = useI18n();
  const flow = useCreateFlow();
  const { state } = flow;
  const topRef = useRef<HTMLDivElement>(null);

  // Each step starts at the top of the page.
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
  }, [state.step]);

  return (
    <div ref={topRef} className="scroll-mt-24 space-y-6">
      {state.step !== 'result' && <Stepper current={STEP_INDEX[state.step]} />}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state.step === 'review' ? `review-${state.version}` : state.step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {state.step === 'source' && (
            <SourceStep
              image={state.image}
              second={flow.second}
              onPick={flow.pick}
              onPickSecond={flow.setSecond}
              onNext={flow.next}
            />
          )}

          {state.step === 'motion' && (
            <MotionStep
              image={state.image}
              second={flow.second}
              choice={flow.choice}
              onChange={flow.setChoice}
              onBack={flow.back}
              onGenerate={flow.generate}
              onCheck={() => flow.describe('check')}
              checking={flow.describing === 'check'}
              checkError={flow.describeError}
            />
          )}

          {state.step === 'review' && (
            <ReviewStep
              draft={state.draft}
              busy={flow.describing}
              error={flow.describeError}
              onChange={(current, change) => flow.describe('change', { current, change })}
              onDifferent={(current) => flow.describe('different', { current })}
              onGo={flow.generateFromDraft}
              onBack={flow.back}
            />
          )}

          {state.step === 'generating' && (
            <GeneratingStep
              image={state.image}
              stage={state.stage}
              job={state.job}
              guesses={state.guesses}
              onCancel={flow.cancel}
            />
          )}

          {state.step === 'error' && (
            <div className="space-y-5">
              <ErrorAlert error={state.error} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Button size="lg" icon={<RotateCcw />} onClick={flow.retry}>
                  {t('error.retry')}
                </Button>
                <Button size="lg" variant="secondary" onClick={flow.reset}>
                  {t('error.startOver')}
                </Button>
              </div>
            </div>
          )}

          {state.step === 'result' && (
            <div className="space-y-5">
              <ResultView
                result={state.result}
                footer={
                  <div className="space-y-3">
                    <Button
                      size="lg"
                      variant="accent"
                      block
                      icon={<Sparkles />}
                      onClick={flow.reset}
                    >
                      {t('result.again')}
                    </Button>
                    <Button variant="secondary" block icon={<PencilLine />} onClick={flow.remake}>
                      {t('result.remake')}
                    </Button>
                  </div>
                }
              />
              <FlowChart job={state.job} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
