/**
 * `holdFrame()` / `releaseFrame()` — frame-blocking async readiness
 * (BF-006), with `delayRender`/`continueRender` semantics: while any hold is
 * active, the renderer keeps the current frame on screen instead of
 * capturing or advancing it. Holds are tracked in a plain registry so
 * behavior is fully deterministic in Node tests (no wall-clock reads — only
 * an optional timeout schedules an automatic release).
 */

export type FrameHold = number;

/** Options for `holdFrame()`. */
export type HoldFrameOptions = {
  /** Automatically release the hold after this many milliseconds (optional). */
  timeoutInMilliseconds?: number;
};

/** A hold currently blocking its frame, as reported by `getActiveHolds()`. */
export type ActiveFrameHold = {
  /** The handle that `releaseFrame()` expects. */
  readonly handle: FrameHold;
  /** The optional label passed to `holdFrame()` (null for anonymous holds). */
  readonly name: string | null;
  /** The configured timeout in milliseconds (null when the hold never expires). */
  readonly timeoutInMilliseconds: number | null;
};

let nextHandle = 1;
const activeHolds = new Map<FrameHold, ActiveFrameHold>();

/**
 * Blocks the current frame until `releaseFrame(handle)` is called — the
 * BrandlyFrames equivalent of `delayRender()`. Wrap async work (font
 * loading, data fetching, image decoding) with it:
 *
 * ```tsx
 * const handle = holdFrame('loading-font');
 * loadFont().then(() => releaseFrame(handle));
 * ```
 *
 * Throws a helpful error for a blank `name` or a non-positive/NaN timeout.
 */
export const holdFrame = (name?: string, options?: HoldFrameOptions): FrameHold => {
  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    throw new Error(
      `holdFrame(): name must be a non-empty string when provided (e.g. holdFrame("loading-font")), but got ${JSON.stringify(
        name,
      )}.`,
    );
  }
  const timeoutInMilliseconds = options?.timeoutInMilliseconds;
  if (
    timeoutInMilliseconds !== undefined &&
    (typeof timeoutInMilliseconds !== 'number' ||
      !Number.isFinite(timeoutInMilliseconds) ||
      timeoutInMilliseconds <= 0)
  ) {
    throw new Error(
      `holdFrame(): timeoutInMilliseconds must be a positive finite number, but got ${String(
        timeoutInMilliseconds,
      )}.`,
    );
  }
  const handle = nextHandle++;
  activeHolds.set(handle, {
    handle,
    name: name ?? null,
    timeoutInMilliseconds: timeoutInMilliseconds ?? null,
  });
  if (timeoutInMilliseconds !== undefined) {
    setTimeout(() => {
      activeHolds.delete(handle);
    }, timeoutInMilliseconds);
  }
  return handle;
};

/**
 * Releases a hold created by `holdFrame()` — the BrandlyFrames equivalent of
 * `continueRender()`. Throws a helpful error when the handle is unknown or
 * was already released (including by its timeout).
 */
export const releaseFrame = (handle: FrameHold): void => {
  if (!activeHolds.delete(handle)) {
    throw new Error(
      `releaseFrame(): unknown or already released hold (handle ${String(
        handle,
      )}) — each holdFrame() handle can only be released once.`,
    );
  }
};

/** All holds currently blocking their frames, in registration order. */
export const getActiveHolds = (): readonly ActiveFrameHold[] =>
  Array.from(activeHolds.values());

/** Releases nothing but clears the hold registry (runtime bootstrap / test isolation). */
export const clearFrameHolds = (): void => {
  activeHolds.clear();
};
