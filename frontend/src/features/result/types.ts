export interface AnimationResult {
  id: string;
  /** Absolute when the backend lives on another site (API_BASE_URL). */
  outputUrl: string;
  isVideo: boolean;
  subject: string | null;
  animator: string | null;
  warning: string | null;
  /** Original drawing, for the before/after view. */
  beforeSrc: string | null;
  /** Sound effect and music mood the AI picked (shared/sound). */
  sound?: string | null;
  music?: string | null;
}
