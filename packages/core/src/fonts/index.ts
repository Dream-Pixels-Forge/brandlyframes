/**
 * Font loading that just works (BF-410): `loadFont()`/`useFont()` hold the
 * current frame until the font is ready — no fallback-font flash, no wrong
 * font in the render. Supports direct font file URLs and Google Fonts, is
 * idempotent per family+source, and fails with clear errors naming the
 * family and URL.
 */
export {
  getFontEnvironment,
  resetFontEnvironment,
  setFontEnvironment,
  type FontEnvironment,
  type FontFaceConstructorLike,
  type FontFaceDescriptorsLike,
  type FontFaceLike,
  type FontFaceSetLike,
  type FontFetchLike,
  type FontFetchResponseLike,
} from './environment';
export {
  clearFontCache,
  DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS,
  loadFont,
  type FontSource,
  type GoogleFontSpec,
  type LoadFontOptions,
} from './load-font';
export {
  mountFontEffect,
  type FontEffectCleanup,
  type MountFontEffectOptions,
} from './mount-font';
export { useFont, type UseFontOptions } from './use-font';
