import { readJson, writeJson } from '@/shared/lib/storage';

export interface Score {
  ai: number;
  you: number;
}

const KEY = 'doodleGameScore'; // same key as the original page, so scores carry over

export const readScore = () =>
  readJson<Score>(KEY, { ai: 0, you: 0 }, (v) => typeof (v as Score).ai === 'number');

export const saveScore = (score: Score) => writeJson(KEY, score);
