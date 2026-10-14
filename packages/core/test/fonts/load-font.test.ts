import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearFontCache,
  DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS,
  loadFont,
  resetFontEnvironment,
  setFontEnvironment,
  type GoogleFontSpec,
} from '../../src/fonts';
import { createFakeFontEnvironment, type FakeFontHarness } from './font-harness';

const LOCAL_URL = 'https://assets.example.com/fonts/inter.woff2';

const INTER_CSS = [
  '@font-face {',
  "  font-family: 'Inter';",
  '  font-style: normal;',
  '  font-weight: 400;',
  '  src: url(https://fonts.gstatic.com/s/inter/v13/test.woff2) format(\'woff2\');',
  '}',
].join('\n');

/** Drains the microtask queue so promise chains settle under fake timers. */
const flush = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};

describe('loadFont (BF-410)', () => {
  let harness: FakeFontHarness;

  const installEnvironment = (options?: Parameters<typeof createFakeFontEnvironment>[0]) => {
    harness = createFakeFontEnvironment(options);
    setFontEnvironment(harness.environment);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    clearFontCache();
    resetFontEnvironment();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetFontEnvironment();
    clearFontCache();
  });

  it('loads a local URL: constructs a FontFace with the serialized url(), adds it to document.fonts and loads it', async () => {
    installEnvironment();
    const pending = loadFont('Inter', LOCAL_URL);

    expect(harness.faces).toHaveLength(1);
    expect(harness.faces[0].family).toBe('Inter');
    expect(harness.faces[0].source).toBe(`url("${LOCAL_URL}")`);
    expect(harness.addedFaces).toContain(harness.faces[0]);

    harness.faces[0].resolveLoad();
    await expect(pending).resolves.toBeUndefined();
    expect(harness.faces[0].loadCalls).toBe(1);
  });

  it('clears its timeout timer after a successful load (no dangling timers)', async () => {
    installEnvironment();
    const pending = loadFont('Inter', LOCAL_URL);
    expect(vi.getTimerCount()).toBe(1);
    harness.faces[0].resolveLoad();
    await flush();
    expect(vi.getTimerCount()).toBe(0);
    await expect(pending).resolves.toBeUndefined();
  });

  it('is idempotent per family+url: duplicate calls never create or load a second FontFace', async () => {
    installEnvironment();
    const first = loadFont('Inter', LOCAL_URL);
    const second = loadFont('Inter', LOCAL_URL);

    expect(harness.faces).toHaveLength(1);

    harness.faces[0].resolveLoad();
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
    expect(harness.faces[0].loadCalls).toBe(1);

    // After the load settled, a duplicate still resolves from the cache.
    const third = loadFont('Inter', LOCAL_URL);
    await expect(third).resolves.toBeUndefined();
    expect(harness.faces).toHaveLength(1);
  });

  it('treats different families and URLs as separate loads', () => {
    installEnvironment();
    loadFont('Inter', 'https://a.example.com/a.woff2');
    loadFont('Inter', 'https://b.example.com/b.woff2');
    loadFont('Oswald', 'https://a.example.com/a.woff2');
    expect(harness.faces).toHaveLength(3);
    expect(harness.faces.map((face) => face.family)).toEqual(['Inter', 'Inter', 'Oswald']);
  });

  it('propagates load failures as a clear error naming the family and URL, and allows a retry', async () => {
    installEnvironment();
    const first = loadFont('Inter', LOCAL_URL);
    harness.faces[0].rejectLoad(new Error('network down'));

    const error = (await first.catch((caught: unknown) => caught)) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('loadFont()');
    expect(error.message).toContain('Inter');
    expect(error.message).toContain(LOCAL_URL);
    expect(error.message).toContain('network down');

    // The failed attempt is evicted from the cache, so a retry starts fresh.
    const retry = loadFont('Inter', LOCAL_URL);
    expect(harness.faces).toHaveLength(2);
    harness.faces[1].resolveLoad();
    await expect(retry).resolves.toBeUndefined();
  });

  it('removes a failed FontFace from document.fonts (no half-loaded faces left behind)', async () => {
    installEnvironment();
    const pending = loadFont('Inter', LOCAL_URL);
    harness.faces[0].rejectLoad(new Error('network down'));
    await pending.catch(() => undefined);
    expect(harness.deletedFaces).toContain(harness.faces[0]);
  });

  it('times out with a clear error naming the family and URL (default 30s virtual)', async () => {
    installEnvironment();
    const pending = loadFont('Inter', LOCAL_URL); // font load never resolves

    let settled = false;
    pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await vi.advanceTimersByTimeAsync(DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);

    const error = (await pending.catch((caught: unknown) => caught)) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('timed out');
    expect(error.message).toContain('Inter');
    expect(error.message).toContain(LOCAL_URL);
    expect(error.message).toContain(String(DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS));
    expect(harness.deletedFaces).toContain(harness.faces[0]);
  });

  it('supports a configurable timeout', async () => {
    installEnvironment();
    const pending = loadFont('Inter', LOCAL_URL, { timeoutInMilliseconds: 5_000 });

    let settled = false;
    pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await vi.advanceTimersByTimeAsync(4_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);

    const error = (await pending.catch((caught: unknown) => caught)) as Error;
    expect(error.message).toContain('timed out');
    expect(error.message).toContain('Inter');
    expect(error.message).toContain(LOCAL_URL);
  });

  it('throws a helpful error for invalid arguments', () => {
    installEnvironment();
    expect(() => loadFont('', LOCAL_URL)).toThrowError(/family/);
    expect(() => loadFont('   ', LOCAL_URL)).toThrowError(/family/);
    expect(() => loadFont('Inter', '')).toThrowError(/url/);
    expect(() => loadFont('Inter', '   ')).toThrowError(/url/);
    expect(() => loadFont('Inter', {} as unknown as GoogleFontSpec)).toThrowError(/GoogleFontSpec/);
    expect(() => loadFont('Inter', LOCAL_URL, { timeoutInMilliseconds: 0 })).toThrowError(
      /timeoutInMilliseconds/,
    );
    expect(() => loadFont('Inter', LOCAL_URL, { timeoutInMilliseconds: -1 })).toThrowError(
      /timeoutInMilliseconds/,
    );
    expect(() => loadFont('Inter', { google: true, weight: -3 })).toThrowError(/weight/);
  });

  it('throws a helpful error when no font environment is available (SSR / Node without mocks)', () => {
    // No setFontEnvironment() — the Node runtime has neither FontFace nor document.fonts.
    expect(() => loadFont('Inter', LOCAL_URL)).toThrowError(/setFontEnvironment/);
    expect(() => loadFont('Inter', LOCAL_URL)).toThrowError(/document\.fonts/);
  });

  describe('Google Fonts', () => {
    it('builds the css2 URL, fetches it and loads the first font file URL from the stylesheet', async () => {
      installEnvironment({ css: INTER_CSS });
      const pending = loadFont('Inter', { google: true });

      expect(harness.fetchUrls).toEqual([
        'https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap',
      ]);
      await flush(); // the FontFace is created once the css2 fetch resolves
      expect(harness.faces).toHaveLength(1);
      expect(harness.faces[0].source).toBe('url("https://fonts.gstatic.com/s/inter/v13/test.woff2")');

      harness.faces[0].resolveLoad();
      await expect(pending).resolves.toBeUndefined();
    });

    it('encodes spaces in the family name and honors weight/italic options', async () => {
      installEnvironment({ css: INTER_CSS });
      const pending = loadFont('Bebas Neue', { google: true, weight: 700, italic: true });

      expect(harness.fetchUrls[0]).toBe(
        'https://fonts.googleapis.com/css2?family=Bebas+Neue:ital,wght@1,700&display=swap',
      );
      await flush(); // the FontFace is created once the css2 fetch resolves
      harness.faces[0].resolveLoad();
      await pending;
      expect(harness.faces[0].weight).toBe('700');
      expect(harness.faces[0].style).toBe('italic');
    });

    it('does not re-fetch or re-create the FontFace for duplicate google loads', async () => {
      installEnvironment({ css: INTER_CSS });
      const first = loadFont('Inter', { google: true });
      const second = loadFont('Inter', { google: true });

      await flush(); // the FontFace is created once the css2 fetch resolves
      harness.faces[0].resolveLoad();
      await Promise.all([first, second]);

      expect(harness.fetchUrls).toHaveLength(1);
      expect(harness.faces).toHaveLength(1);
      expect(harness.faces[0].loadCalls).toBe(1);
    });

    it('fails clearly when the css2 request fails', async () => {
      installEnvironment({ css: '', fetchOk: false, fetchStatus: 404 });
      const pending = loadFont('Inter', { google: true });

      const error = (await pending.catch((caught: unknown) => caught)) as Error;
      expect(error.message).toContain('loadFont()');
      expect(error.message).toContain('Inter');
      expect(error.message).toContain('404');
      expect(error.message).toContain('fonts.googleapis.com');
    });

    it('fails clearly when the css2 response contains no font file URL', async () => {
      installEnvironment({ css: '/* no @font-face here */' });
      const pending = loadFont('Inter', { google: true });

      const error = (await pending.catch((caught: unknown) => caught)) as Error;
      expect(error.message).toContain('no font file URL');
      expect(error.message).toContain('Inter');
      expect(error.message).toContain('fonts.googleapis.com');
    });

    it('fails clearly when fetch itself rejects', async () => {
      harness = createFakeFontEnvironment();
      setFontEnvironment({
        ...harness.environment,
        fetch: async () => {
          throw new Error('offline');
        },
      });
      const pending = loadFont('Inter', { google: true });

      const error = (await pending.catch((caught: unknown) => caught)) as Error;
      expect(error.message).toContain('Inter');
      expect(error.message).toContain('offline');
      expect(error.message).toContain('fonts.googleapis.com');
    });
  });
});
