import type {
  FontEnvironment,
  FontFaceConstructorLike,
  FontFaceDescriptorsLike,
  FontFaceLike,
  FontFaceSetLike,
  FontFetchResponseLike,
} from '../../src/fonts';

/**
 * A fake {@link FontFaceLike} whose `load()` is controlled by the test:
 * `resolveLoad()` / `rejectLoad()` settle the load promise, or the test can
 * leave it pending to exercise the timeout path. Constructed with `new` so
 * it satisfies {@link FontFaceConstructorLike} (the real DOM API is a
 * constructor).
 */
export class FakeFontFace implements FontFaceLike {
  readonly family: string;
  readonly source: string;
  readonly weight: string | undefined;
  readonly style: string | undefined;
  loadCalls = 0;

  private readonly loadPromise: Promise<FontFaceLike>;
  /** Test control: resolves the pending load (with the face itself). */
  readonly resolveLoad: () => void;
  /** Test control: rejects the pending load. */
  readonly rejectLoad: (error: unknown) => void;

  constructor(family: string, source: string, descriptors?: FontFaceDescriptorsLike) {
    this.family = family;
    this.source = source;
    this.weight = descriptors?.weight;
    this.style = descriptors?.style;
    let resolve!: (face: FontFaceLike) => void;
    let reject!: (error: unknown) => void;
    this.loadPromise = new Promise<FontFaceLike>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.resolveLoad = () => resolve(this);
    this.rejectLoad = (error) => reject(error);
  }

  load(): Promise<FontFaceLike> {
    this.loadCalls += 1;
    return this.loadPromise;
  }
}

/** Everything a font test needs to observe and drive the fake environment. */
export type FakeFontHarness = {
  /** Every FontFace constructed by the code under test, in order. */
  readonly faces: FakeFontFace[];
  /** Faces passed to `document.fonts.add()`. */
  readonly addedFaces: FakeFontFace[];
  /** Faces passed to `document.fonts.delete()`. */
  readonly deletedFaces: FakeFontFace[];
  /** URLs passed to `fetch` (Google Fonts css2 requests). */
  readonly fetchUrls: string[];
  /** Pass to `setFontEnvironment()`. */
  readonly environment: FontEnvironment;
};

/** Options for the fake fetch used to resolve Google Fonts specs. */
export type FakeFontEnvironmentOptions = {
  /** Body returned by the fake fetch (the css2 stylesheet text). */
  readonly css?: string;
  /** `ok` flag of the fake fetch response (default true). */
  readonly fetchOk?: boolean;
  /** HTTP status of the fake fetch response (default 200 when ok, 404 otherwise). */
  readonly fetchStatus?: number;
};

/**
 * Builds a complete fake font environment (FontFace constructor +
 * document.fonts + fetch) for Node tests — no DOM required.
 */
export const createFakeFontEnvironment = (
  options?: FakeFontEnvironmentOptions,
): FakeFontHarness => {
  const faces: FakeFontFace[] = [];
  const addedFaces: FakeFontFace[] = [];
  const deletedFaces: FakeFontFace[] = [];
  const fetchUrls: string[] = [];
  const addedSet = new Set<FontFaceLike>();

  // Constructible wrapper that registers every created face with the
  // harness (the factory closure owns the `faces` array).
  const FontFace = class HarnessFontFace extends FakeFontFace {
    constructor(family: string, source: string, descriptors?: FontFaceDescriptorsLike) {
      super(family, source, descriptors);
      faces.push(this);
    }
  } as unknown as FontFaceConstructorLike;

  const fonts: FontFaceSetLike = {
    add: (font) => {
      const fake = font as FakeFontFace;
      addedFaces.push(fake);
      addedSet.add(font);
      return fonts;
    },
    delete: (font) => {
      deletedFaces.push(font as FakeFontFace);
      return addedSet.delete(font);
    },
  };

  const fetch = async (url: string): Promise<FontFetchResponseLike> => {
    fetchUrls.push(url);
    const ok = options?.fetchOk ?? true;
    const status = options?.fetchStatus ?? (ok ? 200 : 404);
    const css = options?.css ?? '';
    return { ok, status, text: async () => css };
  };

  return { faces, addedFaces, deletedFaces, fetchUrls, environment: { FontFace, fonts, fetch } };
};
