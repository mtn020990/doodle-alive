import { useRef, useReducer, useState } from 'react';
import { libraryStore } from '@/features/library';
import type { AnimationResult } from '@/features/result';
import { describeDrawing, type Draft, type Job, type JobRequest } from '@/shared/api';
import { sound } from '@/shared/sound';
import { jobToDraft, jobToResult } from '../lib/mappers';
import { promptFor, usesDuration } from '../lib/motionPresets';
import type { Stage } from '../lib/stages';
import { drawingFields } from '../lib/upload';
import type {
  DescribeAction,
  FlowError,
  FlowState,
  JobOrigin,
  MotionChoice,
  PickedImage,
} from '../types';
import { isAbort, useJobRunner } from './useJobRunner';

type Action =
  | { type: 'pick'; image: PickedImage }
  | { type: 'reset' }
  | { type: 'goto'; step: 'source' | 'motion' }
  | { type: 'review'; draft: Draft }
  | { type: 'start'; from: JobOrigin; guesses: string[] }
  | { type: 'stage'; stage: Stage }
  | { type: 'job'; job: Job }
  | { type: 'done'; result: AnimationResult; job: Job }
  | { type: 'fail'; error: FlowError };

function reducer(state: FlowState, action: Action): FlowState {
  if (action.type === 'pick') return { step: 'source', image: action.image };
  if (action.type === 'reset' || !state.image) return { step: 'source', image: null };
  const { image } = state;
  switch (action.type) {
    case 'goto':
      return { step: action.step, image };
    case 'review':
      return {
        step: 'review',
        image,
        draft: action.draft,
        version: state.step === 'review' ? state.version + 1 : 0,
      };
    case 'start':
      return {
        step: 'generating',
        image,
        stage: 'upload',
        job: null,
        from: action.from,
        guesses: action.guesses,
      };
    case 'stage':
      return state.step === 'generating' ? { ...state, stage: action.stage } : state;
    case 'job':
      return state.step === 'generating' ? { ...state, job: action.job } : state;
    case 'done':
      return { step: 'result', image, result: action.result, job: action.job };
    case 'fail':
      return { step: 'error', image, error: action.error };
  }
}

const INITIAL_CHOICE: MotionChoice = {
  mode: 'character', // figures dance with no daily limit, so they are the default
  presetId: null,
  customPrompt: '',
  duration: 3,
  paint: false,
};

// fetch throws a TypeError when the server can't be reached at all.
const toFlowError = (err: unknown): FlowError =>
  err instanceof TypeError
    ? { kind: 'network' }
    : { kind: 'server', message: (err as Error).message || String(err) };

interface JobRun {
  build: () => Promise<JobRequest>;
  from: JobOrigin;
  guesses: string[];
}

export function useCreateFlow() {
  const [state, dispatch] = useReducer(reducer, { step: 'source', image: null });
  const [choice, setChoice] = useState<MotionChoice>(INITIAL_CHOICE);
  const [second, setSecond] = useState<PickedImage | null>(null);
  const [describing, setDescribing] = useState<DescribeAction | null>(null);
  const [describeError, setDescribeError] = useState<FlowError | null>(null);
  const runner = useJobRunner();
  const lastRun = useRef<JobRun | null>(null); // for "Try again"
  const lastDraft = useRef<Draft | null>(null); // for Cancel and rewrites
  const describeCtrl = useRef<AbortController | null>(null);

  /** Leaving a step drops any "Check prompt" request still in flight. */
  const leave = () => {
    describeCtrl.current?.abort();
    setDescribing(null);
    setDescribeError(null);
  };

  const execute = async (image: PickedImage, run: JobRun) => {
    sound.unlock(); // browsers only allow sound after a tap: this is that tap
    sound.stop();
    lastRun.current = run;
    dispatch({ type: 'start', from: run.from, guesses: run.guesses });
    try {
      const job = await runner.run(run.build, {
        onStage: (stage) => dispatch({ type: 'stage', stage }),
        onJob: (update) => dispatch({ type: 'job', job: update }),
      });
      const result = jobToResult(job, image.thumb);
      libraryStore.add({ ...result, thumb: image.thumb, createdAt: Date.now() });
      dispatch({ type: 'done', result, job });
      sound.play(job.sound, job.music);
    } catch (err) {
      if (!isAbort(err)) return dispatch({ type: 'fail', error: toFlowError(err) });
      // Cancelled: back to where the job was started.
      if (run.from === 'review' && lastDraft.current) {
        dispatch({ type: 'review', draft: lastDraft.current });
      } else {
        dispatch({ type: 'goto', step: 'motion' });
      }
    }
  };

  /** Straight from the options: the backend writes the prompt itself. */
  const generate = () => {
    if (!state.image) return;
    const image = state.image;
    const { mode, duration, paint } = choice;
    const prompt = promptFor(choice.presetId, choice.customPrompt);
    execute(image, {
      from: 'motion',
      guesses: [],
      build: async () => ({
        ...(await drawingFields(image, second, paint)),
        mode,
        prompt,
        duration: usesDuration(mode, !!second) ? duration : undefined,
      }),
    });
  };

  /** "Check prompt first", "Apply" a change, or "Different idea". */
  const describe = async (
    action: DescribeAction,
    extra: { current?: string; change?: string } = {},
  ) => {
    if (!state.image) return;
    describeCtrl.current?.abort();
    const ctrl = new AbortController();
    describeCtrl.current = ctrl;
    setDescribing(action);
    setDescribeError(null);
    const rewrite = action !== 'check';
    try {
      const draft = await describeDrawing(
        {
          ...(await drawingFields(state.image, second, choice.paint)),
          // A rewrite keeps the kind of the draft under review.
          mode: rewrite && lastDraft.current ? lastDraft.current.kind : choice.mode,
          prompt: promptFor(choice.presetId, choice.customPrompt),
          current: extra.current,
          change: extra.change,
          different: action === 'different',
        },
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      // A rewrite answer has no guesses; keep the ones from the first look for the game.
      const merged =
        rewrite && !draft.guesses?.length
          ? { ...draft, guesses: lastDraft.current?.guesses }
          : draft;
      lastDraft.current = merged;
      dispatch({ type: 'review', draft: merged });
    } catch (err) {
      if (!ctrl.signal.aborted) setDescribeError(toFlowError(err));
    } finally {
      if (describeCtrl.current === ctrl) setDescribing(null);
    }
  };

  /** Animate exactly the reviewed text. */
  const generateFromDraft = (text: string) => {
    if (state.step !== 'review') return;
    const { image, draft } = state;
    const { duration, paint } = choice;
    lastDraft.current = { ...draft, prompt: text };
    execute(image, {
      from: 'review',
      guesses: draft.guesses ?? [],
      build: async () => ({
        ...(await drawingFields(image, second, paint)),
        mode: draft.kind,
        finalPrompt: text,
        subject: draft.subject,
        motion: draft.kind === 'character' ? (draft.motion ?? undefined) : undefined,
        sound: draft.sound ?? undefined,
        music: draft.music ?? undefined,
        duration: usesDuration(draft.kind, !!second) ? duration : undefined,
      }),
    });
  };

  /** "Edit prompt & remake": back to the review panel with the prompt that was used. */
  const remake = () => {
    if (state.step !== 'result') return;
    sound.stop();
    lastDraft.current = jobToDraft(state.job);
    dispatch({ type: 'review', draft: lastDraft.current });
  };

  const retry = () => {
    if (state.image && lastRun.current) execute(state.image, lastRun.current);
  };

  return {
    state,
    choice,
    setChoice,
    second,
    setSecond,
    describing,
    describeError,
    pick: (image: PickedImage) => {
      leave();
      lastDraft.current = null; // a new drawing gets its own guesses
      dispatch({ type: 'pick', image });
    },
    next: () => dispatch({ type: 'goto', step: 'motion' }),
    back: () => {
      leave();
      dispatch({ type: 'goto', step: state.step === 'motion' ? 'source' : 'motion' });
    },
    generate,
    describe,
    generateFromDraft,
    remake,
    retry,
    cancel: runner.cancel,
    reset: () => {
      leave();
      sound.stop();
      setChoice(INITIAL_CHOICE);
      setSecond(null);
      lastDraft.current = null;
      dispatch({ type: 'reset' });
    },
  };
}
