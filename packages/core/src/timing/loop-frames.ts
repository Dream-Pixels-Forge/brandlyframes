/**
 * Pure frame math for `<Loop>` — no React, no DOM.
 */

/**
 * The frame a Loop's children observe: the parent frame wrapped back into
 * `[0, durationInFrames)` — frame 0 again every time an iteration ends.
 * Uses a non-negative modulo so negative parent frames map to a valid
 * position instead of a negative child frame.
 */
export const resolveLoopFrame = (parentFrame: number, durationInFrames: number): number =>
  ((parentFrame % durationInFrames) + durationInFrames) % durationInFrames;

/**
 * Whether a Loop renders at `parentFrame`. Without `times` a loop is
 * unbounded (the enclosing timeline clips it); with `times` it spans exactly
 * `times * durationInFrames` frames.
 */
export const isLoopActive = (parentFrame: number, durationInFrames: number, times?: number): boolean => {
  if (times === undefined) return true;
  return parentFrame >= 0 && parentFrame < times * durationInFrames;
};
