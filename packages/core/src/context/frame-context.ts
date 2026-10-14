import { createContext } from 'react';

/**
 * Dimensions and duration of the composition currently being rendered.
 * The frame context carries this alongside the current frame — a component
 * only ever needs these two inputs (frame -> pixels).
 */
export type VideoConfig = {
  /** Frames per second. Positive finite number (29.97 is allowed). */
  fps: number;
  /** Composition width in pixels. Positive integer. */
  width: number;
  /** Composition height in pixels. Positive integer. */
  height: number;
  /** Total number of frames in the composition. Positive integer. */
  durationInFrames: number;
};

/**
 * Raw React context holding the current frame (null = no provider above).
 * Prefer <FrameContextProvider> and the hooks; this is exported for
 * advanced runtimes that need direct context access.
 */
export const FrameContext = createContext<number | null>(null);
FrameContext.displayName = 'FrameContext';

/**
 * Raw React context holding the video config (null = no provider above).
 */
export const VideoConfigContext = createContext<VideoConfig | null>(null);
VideoConfigContext.displayName = 'VideoConfigContext';
