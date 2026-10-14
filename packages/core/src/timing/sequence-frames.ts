/**
 * Pure frame math for `<Sequence>` — no React, no DOM.
 * The frame is the clock: all functions here are total, synchronous and
 * deterministic for the same inputs.
 */

/**
 * The frame a Sequence's children observe: frame 0 of the child timeline is
 * the parent frame where the Sequence starts (`from`). A negative `from`
 * makes the child frame run ahead of the parent frame.
 */
export const resolveSequenceFrame = (parentFrame: number, from: number): number => parentFrame - from;

/**
 * Whether a Sequence is rendered at `parentFrame`. The window is
 * `[from, from + durationInFrames)` — the end frame is exclusive.
 */
export const isSequenceVisible = (parentFrame: number, from: number, durationInFrames: number): boolean =>
  parentFrame >= from && parentFrame < from + durationInFrames;
