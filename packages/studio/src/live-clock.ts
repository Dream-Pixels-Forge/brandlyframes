/**
 * BF-303 live mode — wall-time clock and the pure wall-time → frame mapping.
 *
 * Live overlays are driven by wall time (a broadcast must keep playing in
 * sync with the real world), while the frame each wall-time instant maps to
 * stays a deterministic pure function — the same elapsed time always shows
 * the same frame. Tests inject a mock clock; production uses {@link wallClock}.
 */

/** Monotonic-enough millisecond time source. Injectable for tests (BF-303). */
export type LiveClock = () => number;

/** Real wall clock. */
export const wallClock: LiveClock = () => Date.now();

/**
 * Frame shown after `elapsedMs` of playback: the floor of elapsed time over
 * the frame period, looping within `durationInFrames`. Absolute mapping —
 * never integrated from tick counts, so no error can accumulate (drift-free
 * by construction). Multiplies before dividing (`elapsed*fps/1000`) so exact
 * frame-grid times stay exact in floating point.
 */
export function frameAt(elapsedMs: number, fps: number, durationInFrames: number): number {
  if (!(fps > 0) || !(durationInFrames > 0)) {
    throw new RangeError(
      `frameAt: fps and durationInFrames must be positive (got fps=${fps}, durationInFrames=${durationInFrames})`,
    );
  }
  return Math.floor((elapsedMs * fps) / 1000) % durationInFrames;
}
