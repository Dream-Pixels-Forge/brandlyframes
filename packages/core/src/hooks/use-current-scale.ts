import { usePixelDensity } from './use-pixel-density';

/**
 * The current device-pixel scale: `window.devicePixelRatio` in a browser,
 * `1` in Node / render workers. Builds on {@link usePixelDensity}.
 *
 * Environmental, not frame-scoped — safe to call anywhere, including render
 * workers where there is no display (returns `1`).
 */
export const useCurrentScale = (): number => usePixelDensity();
