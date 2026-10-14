import { formatInvalidValue } from './validate-frame-inputs';

/**
 * Pure frame math for `<Freeze>` — no React, no DOM.
 */

/** A Freeze pins the frame to a constant, or maps it via a resolver function. */
export type FreezeFrameOverride = number | ((parentFrame: number) => number);

/**
 * The frame a Freeze's children observe: a static override is returned as-is
 * (the parent frame is ignored); a function override receives the parent
 * frame and returns the frozen frame. The resolved value must be a finite
 * integer — frames are the clock and are always whole numbers.
 */
export const resolveFreezeFrame = (parentFrame: number, frame: FreezeFrameOverride): number => {
  const resolved = typeof frame === 'function' ? frame(parentFrame) : frame;
  if (!Number.isInteger(resolved)) {
    throw new Error(`Frozen frame must be a finite integer, but got ${formatInvalidValue(resolved)}.`);
  }
  return resolved;
};
