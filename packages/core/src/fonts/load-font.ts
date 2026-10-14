import {
  getFontEnvironment,
  type FontEnvironment,
  type FontFaceDescriptorsLike,
  type FontFaceLike,
  type FontFetchResponseLike,
} from './environment';

/**
 * `loadFont()` (BF-410): loads a web font into the runtime's font set and
 * resolves when it is ready. Idempotent per family+source (duplicate calls
 * reuse the in-flight or completed load, never creating a second FontFace),
 * with a configurable timeout whose failure names the family and URL.
 */

/**
 * Default font-load timeout: 30 seconds of *virtual* time — the
 * deterministic render runtime (BF-420) patches `setTimeout`, so this is 30
 * virtual seconds during a render and 30 wall-clock seconds in a browser.
 */
export const DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS = 30_000;

/**
 * Loads a font from Google Fonts instead of a direct URL: BrandlyFrames
 * builds the `fonts.googleapis.com/css2` stylesheet URL, fetches it, and
 * loads the font file URL it contains.
 *
 * ```ts
 * loadFont('Inter', { google: true, weight: 700 });
 * ```
 */
export type GoogleFontSpec = {
  /** Marker: load from Google Fonts rather than a direct URL. */
  readonly google: true;
  /** Font weight to request (default 400). */
  readonly weight?: number;
  /** Whether to request the italic style (default false). */
  readonly italic?: boolean;
};

/** A font source: a direct font file URL or a {@link GoogleFontSpec}. */
export type FontSource = string | GoogleFontSpec;

/** Options for {@link loadFont}. */
export type LoadFontOptions = {
  /**
   * How long to wait for the font before failing (default
   * {@link DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS}). Only applies to the
   * request that starts the load; duplicate idempotent calls reuse the
   * original attempt regardless of this option.
   */
  readonly timeoutInMilliseconds?: number;
};

const GOOGLE_FONTS_CSS2_URL = 'https://fonts.googleapis.com/css2';

/** Internal marker so the already-formatted timeout error is not re-wrapped. */
class FontTimeoutError extends Error {}

/**
 * Cache of in-flight and completed loads, keyed by family + request URL.
 * Guarantees idempotency: one FontFace per family+source, ever.
 */
const fontLoadCache = new Map<string, Promise<void>>();

/** Clears the load cache (test isolation). */
export const clearFontCache = (): void => {
  fontLoadCache.clear();
};

/**
 * Loads a font and resolves when the FontFace is loaded and registered with
 * `document.fonts` — safe to await before capturing a frame.
 *
 * - `source` is either a direct font file URL (`.woff2`, `.woff`, `.ttf`, …)
 *   or a {@link GoogleFontSpec} to load from Google Fonts.
 * - Idempotent per family+source: duplicate calls (concurrent or after
 *   completion) return the same load and never throw or duplicate a
 *   FontFace.
 * - Fails with a clear error naming the family and URL — on timeout
 *   (default 30s virtual, {@link LoadFontOptions.timeoutInMilliseconds}) or
 *   when the underlying load rejects. A failed attempt is evicted from the
 *   cache so a later call can retry.
 */
export const loadFont = (
  family: string,
  source: FontSource,
  options?: LoadFontOptions,
): Promise<void> => {
  validateFamily(family);
  validateTimeout(options?.timeoutInMilliseconds);
  const requestUrl =
    typeof source === 'string' ? validateUrlSource(source) : buildGoogleFontsCssUrl(family, source);
  const environment = getFontEnvironment();
  if (typeof source !== 'string' && !environment.fetch) {
    throw new Error(
      `loadFont(): loading a GoogleFontSpec requires fetch to resolve the css2 stylesheet (${requestUrl}) — no fetch implementation is available in the current font environment.`,
    );
  }
  const cacheKey = `${family}\u0000${requestUrl}`;
  const cached = fontLoadCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const timeoutInMilliseconds =
    options?.timeoutInMilliseconds ?? DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS;
  const pending =
    typeof source === 'string'
      ? loadDirectFont(environment, family, source, timeoutInMilliseconds)
      : loadGoogleFont(environment, family, source, requestUrl, timeoutInMilliseconds);
  fontLoadCache.set(cacheKey, pending);
  pending.catch(() => {
    // Evict the failed attempt so a later call can retry; callers of this
    // attempt still receive the original rejection.
    if (fontLoadCache.get(cacheKey) === pending) {
      fontLoadCache.delete(cacheKey);
    }
  });
  return pending;
};

const validateFamily = (family: string): void => {
  if (typeof family !== 'string' || family.trim() === '') {
    throw new Error(
      `loadFont(): family must be a non-empty string (the CSS font-family name, e.g. "Inter"), but got ${JSON.stringify(
        family,
      )}.`,
    );
  }
};

const validateUrlSource = (source: string): string => {
  if (typeof source !== 'string' || source.trim() === '') {
    throw new Error(
      `loadFont(): url must be a non-empty string (a font file URL, or a GoogleFontSpec object like { google: true }), but got ${JSON.stringify(
        source,
      )}.`,
    );
  }
  return source;
};

const validateTimeout = (timeoutInMilliseconds: number | undefined): void => {
  if (
    timeoutInMilliseconds !== undefined &&
    (typeof timeoutInMilliseconds !== 'number' ||
      !Number.isFinite(timeoutInMilliseconds) ||
      timeoutInMilliseconds <= 0)
  ) {
    throw new Error(
      `loadFont(): timeoutInMilliseconds must be a positive finite number, but got ${String(
        timeoutInMilliseconds,
      )}.`,
    );
  }
};

/**
 * Builds the Google Fonts css2 stylesheet URL for a family/spec, validating
 * the spec options. Family spaces are encoded as `+` per the css2 API
 * (`Bebas+Neue`); italic requests use the `ital,wght@1,<weight>` axis form.
 */
const buildGoogleFontsCssUrl = (family: string, spec: GoogleFontSpec): string => {
  if (typeof spec !== 'object' || spec === null || spec.google !== true) {
    throw new Error(
      `loadFont(): source must be a font file URL string or a GoogleFontSpec object ({ google: true, weight?, italic? }), but got ${JSON.stringify(
        spec,
      )}.`,
    );
  }
  const weight = spec.weight ?? 400;
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) {
    throw new Error(
      `loadFont(): GoogleFontSpec.weight must be a positive finite number, but got ${String(weight)}.`,
    );
  }
  if (spec.italic !== undefined && typeof spec.italic !== 'boolean') {
    throw new Error(
      `loadFont(): GoogleFontSpec.italic must be a boolean when provided, but got ${String(
        spec.italic,
      )}.`,
    );
  }
  const encodedFamily = encodeURIComponent(family).replace(/%20/g, '+');
  const axis = spec.italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
  return `${GOOGLE_FONTS_CSS2_URL}?family=${encodedFamily}:${axis}&display=swap`;
};

/** Serializes a URL into the `FontFace` constructor source syntax. */
const serializeFontUrlSource = (url: string): string => `url("${url.replace(/"/g, '%22')}")`;

/** Registers a FontFace, loads it under the timeout, cleans up on failure. */
const registerAndLoadFace = async (
  environment: FontEnvironment,
  family: string,
  fontUrl: string,
  descriptors: FontFaceDescriptorsLike | undefined,
  timeoutInMilliseconds: number,
): Promise<void> => {
  const face = new environment.FontFace(family, serializeFontUrlSource(fontUrl), descriptors);
  environment.fonts.add(face);
  try {
    await loadFaceWithTimeout(face, family, fontUrl, timeoutInMilliseconds);
  } catch (error) {
    environment.fonts.delete(face);
    throw error instanceof FontTimeoutError
      ? error
      : new Error(
          `loadFont(): failed to load font "${family}" from ${fontUrl} — ${
            error instanceof Error ? error.message : String(error)
          }`,
          { cause: error },
        );
  }
};

/** Loads a FontFace from a direct font file URL. */
const loadDirectFont = (
  environment: FontEnvironment,
  family: string,
  url: string,
  timeoutInMilliseconds: number,
): Promise<void> =>
  registerAndLoadFace(environment, family, url, undefined, timeoutInMilliseconds);

/** Resolves a GoogleFontSpec: fetches the css2 stylesheet, loads its first font file URL. */
const loadGoogleFont = async (
  environment: FontEnvironment,
  family: string,
  spec: GoogleFontSpec,
  css2Url: string,
  timeoutInMilliseconds: number,
): Promise<void> => {
  const fetchLike = environment.fetch;
  if (!fetchLike) {
    throw new Error(
      `loadFont(): loading a GoogleFontSpec requires fetch to resolve the css2 stylesheet (${css2Url}) — no fetch implementation is available in the current font environment.`,
    );
  }
  let response: FontFetchResponseLike;
  try {
    response = await fetchLike(css2Url);
  } catch (error) {
    throw new Error(
      `loadFont(): Google Fonts request for "${family}" failed (${css2Url}) — ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
  if (!response.ok) {
    throw new Error(
      `loadFont(): Google Fonts request for "${family}" failed with status ${String(
        response.status,
      )} (${css2Url}) — check the family name, weight and italic options.`,
    );
  }
  const css = await response.text();
  const fontFileUrl = extractFirstFontFileUrl(css);
  if (fontFileUrl === null) {
    throw new Error(
      `loadFont(): no font file URL found in the Google Fonts css2 response for "${family}" (${css2Url}) — check the family name, weight and italic options.`,
    );
  }
  const weight = spec.weight ?? 400;
  return registerAndLoadFace(
    environment,
    family,
    fontFileUrl,
    { weight: String(weight), style: spec.italic ? 'italic' : 'normal' },
    timeoutInMilliseconds,
  );
};

/** Races a FontFace load against the configured timeout. */
const loadFaceWithTimeout = (
  face: FontFaceLike,
  family: string,
  url: string,
  timeoutInMilliseconds: number,
): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new FontTimeoutError(
          `loadFont(): timed out loading font "${family}" from ${url} after ${timeoutInMilliseconds}ms — the font did not finish loading in time. Check the URL and network, or raise timeoutInMilliseconds.`,
        ),
      );
    }, timeoutInMilliseconds);
  });
  return Promise.race([face.load().then(() => undefined), timeoutPromise]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  });
};

/** First `url(...)` in a css2 stylesheet (the font file Google serves). */
const extractFirstFontFileUrl = (css: string): string | null => {
  const match = /url\(\s*(['"]?)([^'")]+)\1\s*\)/.exec(css);
  return match ? match[2] : null;
};
