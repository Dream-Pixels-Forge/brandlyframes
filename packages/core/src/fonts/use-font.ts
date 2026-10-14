import { useEffect, useState } from 'react';
import { mountFontEffect } from './mount-font';

/**
 * `useFont()` (BF-410): font loading that just works — the hook triggers the
 * (idempotent) load once, holds the current frame until the font is ready
 * so the renderer never captures a fallback-font frame, and reports the
 * loaded state.
 */

/** Options for {@link useFont}. */
export type UseFontOptions = {
  /** Font-load and hold timeout (default 30s virtual). */
  readonly timeoutInMilliseconds?: number;
};

/**
 * Loads a web font from `url` (a direct font file URL) and holds the current
 * frame until it is ready — the BrandlyFrames answer to fallback-font flash
 * and "my render used the wrong font".
 *
 * - Triggers the load once per family+url (duplicate mounts and React
 *   StrictMode remounts reuse the same load).
 * - Calls `holdFrame()` on mount and `releaseFrame()` when the load settles
 *   (success, failure, unmount or timeout), so the current frame is never
 *   captured before the font is ready.
 * - Returns whether the font has finished loading (`false` during SSR,
 *   where effects never run and fonts are not loaded).
 * - Never throws on duplicate loads; failures are reported through the
 *   hold timeout error path, not by breaking the render.
 */
export const useFont = (family: string, url: string, options?: UseFontOptions): boolean => {
  const [loaded, setLoaded] = useState(false);
  // Effect deps: only family/url — the load is keyed by family+url and
  // options are mount-time configuration (changing them does not remount).
  useEffect(
    () => mountFontEffect(family, url, { onLoaded: () => setLoaded(true), ...options }),
    [family, url],
  );
  return loaded;
};
