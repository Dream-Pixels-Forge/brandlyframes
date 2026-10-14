/**
 * Font environment seam (BF-410): fonts load through the browser's
 * `FontFace` constructor and `document.fonts` set, which do not exist in
 * Node (tests, SSR). All font code reads the environment through
 * {@link getFontEnvironment}, so tests can inject fakes with
 * {@link setFontEnvironment} and production code gets a clear error when
 * someone tries to load a font outside a browser-like runtime.
 */

/** The subset of the DOM `FontFace` API font loading relies on. */
export interface FontFaceLike {
  /** The CSS font-family name the face was registered under. */
  readonly family: string;
  /** Starts loading the font data; resolves with the face when ready. */
  load(): Promise<FontFaceLike>;
}

/** Descriptors accepted by the `FontFace` constructor (subset). */
export interface FontFaceDescriptorsLike {
  readonly weight?: string;
  readonly style?: string;
}

/** The subset of the DOM `FontFaceSet` API font loading relies on. */
export interface FontFaceSetLike {
  /** Registers a face with the set (the DOM `document.fonts` behavior). */
  add(font: FontFaceLike): FontFaceSetLike;
  /** Removes a face from the set; returns whether it was present. */
  delete(font: FontFaceLike): boolean;
}

/** The subset of the DOM `FontFaceConstructor` font loading relies on. */
export type FontFaceConstructorLike = new (
  family: string,
  source: string,
  descriptors?: FontFaceDescriptorsLike,
) => FontFaceLike;

/** The subset of the `fetch` response font loading relies on. */
export interface FontFetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
}

/** The subset of `fetch` used to resolve Google Fonts specs. */
export type FontFetchLike = (url: string) => Promise<FontFetchResponseLike>;

/**
 * Everything font loading needs from the host runtime. `fetch` is only
 * required to resolve Google Fonts specs (css2 stylesheet requests); local
 * URL loads never fetch.
 */
export interface FontEnvironment {
  readonly FontFace: FontFaceConstructorLike;
  readonly fonts: FontFaceSetLike;
  readonly fetch?: FontFetchLike;
}

let environmentOverride: FontEnvironment | null = null;

/**
 * Injects a font environment (test seam): subsequent font loads use it
 * instead of the browser globals. Reset with {@link resetFontEnvironment}.
 */
export const setFontEnvironment = (environment: FontEnvironment): void => {
  environmentOverride = environment;
};

/** Removes a previously injected font environment (test isolation). */
export const resetFontEnvironment = (): void => {
  environmentOverride = null;
};

const isFontFaceSetLike = (value: unknown): value is FontFaceSetLike =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as FontFaceSetLike).add === 'function' &&
  typeof (value as FontFaceSetLike).delete === 'function';

/**
 * The active font environment: the injected one ({@link setFontEnvironment})
 * or, otherwise, the browser globals (`FontFace`, `document.fonts` and
 * `fetch` when present).
 *
 * Throws a helpful error when neither exists — fonts load in the browser,
 * Studio preview and the render browser, never during SSR or in bare Node
 * (tests inject a fake environment instead).
 */
export const getFontEnvironment = (): FontEnvironment => {
  if (environmentOverride) {
    return environmentOverride;
  }
  const globals = globalThis as {
    FontFace?: unknown;
    document?: { fonts?: unknown };
    fetch?: unknown;
  };
  const FontFace = globals.FontFace;
  const fonts = globals.document?.fonts;
  if (typeof FontFace !== 'function' || !isFontFaceSetLike(fonts)) {
    throw new Error(
      'loadFont()/useFont(): no font environment available — `FontFace` and `document.fonts` are required to load fonts, and neither exists in this runtime. Fonts load in the browser, the Studio preview and the render browser (never during SSR); in Node tests, inject a fake environment with setFontEnvironment().',
    );
  }
  const environment: FontEnvironment =
    typeof globals.fetch === 'function'
      ? { FontFace: FontFace as FontFaceConstructorLike, fonts: fonts as FontFaceSetLike, fetch: globals.fetch as FontFetchLike }
      : { FontFace: FontFace as FontFaceConstructorLike, fonts: fonts as FontFaceSetLike };
  return environment;
};
