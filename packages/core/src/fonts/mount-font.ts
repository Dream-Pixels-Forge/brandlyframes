import { holdFrame, releaseFrame } from '../runtime';
import { DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS, loadFont } from './load-font';

/**
 * Frame-holding font mount (BF-410): the lifecycle `useFont()` runs on
 * mount, extracted as a framework-free function so Node tests (no DOM
 * renderer available) and custom runtimes drive the exact same code path.
 */

/** Callbacks and options for {@link mountFontEffect}. */
export type MountFontEffectOptions = {
  /** Called once when the font finished loading (skipped after unmount). */
  readonly onLoaded?: () => void;
  /** Called when the load failed or timed out (skipped after unmount). */
  readonly onError?: (error: unknown) => void;
  /** Font-load and hold timeout (default {@link DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS}). */
  readonly timeoutInMilliseconds?: number;
};

/** Cleanup returned by {@link mountFontEffect} (the effect's unmount path). */
export type FontEffectCleanup = () => void;

/**
 * Mounts a font with automatic frame holds: registers a `holdFrame()` so
 * the current frame is never captured before the font is ready, triggers
 * the (idempotent) `loadFont()`, and releases the hold when the load
 * settles — on success, on failure, on unmount, or automatically at the
 * hold's timeout safety net.
 *
 * This is the exact function `useFont()` calls inside its `useEffect`;
 * it returns the effect cleanup.
 */
export const mountFontEffect = (
  family: string,
  url: string,
  options?: MountFontEffectOptions,
): FontEffectCleanup => {
  const timeoutInMilliseconds =
    options?.timeoutInMilliseconds ?? DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS;
  // loadFont() validates arguments and the environment synchronously — it
  // must run before holdFrame() so a rejected mount never leaks a hold.
  const pending = loadFont(family, url, { timeoutInMilliseconds });
  const hold = holdFrame(`font "${family}" (${url})`, { timeoutInMilliseconds });
  let holdReleased = false;
  const releaseHoldOnce = (): void => {
    if (holdReleased) {
      return;
    }
    holdReleased = true;
    try {
      releaseFrame(hold);
    } catch {
      // The hold already auto-expired via its own timeout (same duration as
      // the font timeout) — releaseFrame() throws for expired handles; the
      // renderer is unblocked either way.
    }
  };
  let unmounted = false;
  pending.then(
    () => {
      releaseHoldOnce();
      if (!unmounted) {
        options?.onLoaded?.();
      }
    },
    (error: unknown) => {
      releaseHoldOnce();
      if (!unmounted) {
        options?.onError?.(error);
      }
    },
  );
  return () => {
    unmounted = true;
    releaseHoldOnce();
  };
};
